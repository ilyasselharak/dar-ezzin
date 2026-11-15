import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { processUploadedImage, deleteStoredImage } from "@/lib/storage/image-processing";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { toCentimes } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";

/**
 * Link with the Electro Darna shop (Convex, see electro-darna/convex/catalogShare.ts).
 * Env: ELECTRODARNA_API_URL (https://<deployment>.convex.site) and ELECTRODARNA_API_KEY
 * (= CATALOG_SHARE_KEY on the Electro Darna side).
 */

export type RemoteProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  brandSlug: string | null;
  category: string | null;
  categoryName: string | null;
  description: string;
  warranty: string | null;
  price: number; // DH
  compareAtPrice: number | null; // DH
  stock: number | null; // null = not tracked by quantity
  available: boolean;
  isActive: boolean;
  imageUrls: string[];
  updatedAt: number;
};

/** Stock given to a product Electro Darna marks "in stock" without tracking a quantity. */
export const UNTRACKED_AVAILABLE_STOCK = 10;
const MAX_IMAGES = 15;

export function isElectroDarnaConfigured() {
  return Boolean(process.env.ELECTRODARNA_API_URL && process.env.ELECTRODARNA_API_KEY);
}

async function callFeed(ids?: string[]): Promise<RemoteProduct[]> {
  const base = process.env.ELECTRODARNA_API_URL;
  const key = process.env.ELECTRODARNA_API_KEY;
  if (!base || !key) throw new Error("ELECTRODARNA_API_URL / ELECTRODARNA_API_KEY ne sont pas configurés");
  const res = await fetch(`${base.replace(/\/$/, "")}/api/catalog/products`, {
    method: ids ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: ids ? JSON.stringify({ ids }) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Electro Darna a répondu ${res.status}`);
  const data = (await res.json()) as { items: RemoteProduct[] };
  return data.items;
}

export const fetchRemoteCatalog = () => callFeed();

export async function fetchRemoteProducts(ids: string[]) {
  const out: RemoteProduct[] = [];
  for (let i = 0; i < ids.length; i += 1000) out.push(...(await callFeed(ids.slice(i, i + 1000))));
  return out;
}

/** Quantity Dar Ezzin should show for a remote product. */
export function remoteStock(p: RemoteProduct | undefined) {
  if (!p || !p.available) return 0;
  return p.stock ?? UNTRACKED_AVAILABLE_STOCK;
}

function warrantyMonths(text: string | null) {
  if (!text) return null;
  const years = text.match(/(\d+)\s*(an|ans|année|years?)/i);
  if (years) return Math.min(240, Number(years[1]) * 12);
  const months = text.match(/(\d+)\s*(mois|months?)/i);
  return months ? Math.min(240, Number(months[1])) : null;
}

async function uniqueValue(base: string, exists: (v: string) => Promise<boolean>) {
  if (!(await exists(base))) return base;
  for (let i = 2; i < 100; i++) if (!(await exists(`${base}-${i}`))) return `${base}-${i}`;
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/** Downloads a remote image into our storage and generates the WebP variants. */
async function importImage(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("Image trop volumineuse");

  const meta = await sharp(buf).metadata();
  const native = { jpeg: "jpg", png: "png", webp: "webp", heif: null, avif: "avif" } as Record<string, string | null>;
  let ext = meta.format ? native[meta.format] : null;
  let body = buf;
  if (!ext) {
    body = await sharp(buf).rotate().webp({ quality: 85 }).toBuffer();
    ext = "webp";
  }
  const d = new Date();
  const key = `products/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
  await storage.put(key, body, ext === "jpg" ? "image/jpeg" : `image/${ext}`);
  return processUploadedImage(key);
}

export type ImportOptions = { status: "DRAFT" | "ACTIVE"; userId?: string };

/** Clones one Electro Darna product into Dar Ezzin. Returns the new product id. */
export async function cloneRemoteProduct(p: RemoteProduct, opts: ImportOptions) {
  const existing = await db.product.findUnique({ where: { sourceId: p.id }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };

  // Brand: reuse by slug, create it otherwise.
  let brandId: string | null = null;
  if (p.brand) {
    const slug = p.brandSlug || slugify(p.brand);
    const brand = await db.brand.upsert({ where: { slug }, create: { name: p.brand, slug }, update: {}, select: { id: true } });
    brandId = brand.id;
  }

  // Category: only matched, never created (the admin can set it afterwards).
  let categoryId: string | null = null;
  const catSlugs = [p.category, p.categoryName ? slugify(p.categoryName) : null].filter((s): s is string => Boolean(s));
  if (catSlugs.length) {
    const cat = await db.category.findFirst({ where: { slug: { in: catSlugs } }, select: { id: true } });
    categoryId = cat?.id ?? null;
  }

  const images: Awaited<ReturnType<typeof importImage>>[] = [];
  for (const url of p.imageUrls.slice(0, MAX_IMAGES)) {
    try {
      images.push(await importImage(url));
    } catch (err) {
      logger.warn("Electro Darna image import failed", { url, err });
    }
  }

  const slug = await uniqueValue(slugify(p.slug || p.name) || "produit", async (s) => Boolean(await db.product.findUnique({ where: { slug: s }, select: { id: true } })));
  const sku = await uniqueValue(`ED-${p.id.slice(-8).toUpperCase()}`, async (s) => Boolean(await db.product.findUnique({ where: { sku: s }, select: { id: true } })));
  const stock = remoteStock(p);
  const price = toCentimes(p.price);
  const compareAtPrice = p.compareAtPrice ? toCentimes(p.compareAtPrice) : null;

  try {
    const created = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: p.name.slice(0, 160),
          slug,
          sku,
          description: p.description || null,
          price,
          compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : null,
          stock,
          status: opts.status,
          warrantyMonths: warrantyMonths(p.warranty),
          brandId,
          categoryId,
          sourceId: p.id,
          sourceSyncedAt: new Date(),
          images: {
            create: images.map((img, position) => ({ ...img, alt: p.name.slice(0, 160), position })),
          },
        },
        select: { id: true },
      });
      if (stock > 0) {
        await tx.inventoryMovement.create({
          data: { productId: product.id, delta: stock, stockAfter: stock, reason: "RESTOCK", note: "Import Electro Darna", userId: opts.userId },
        });
      }
      return product;
    });
    return { id: created.id, created: true };
  } catch (err) {
    await Promise.all(images.map((i) => deleteStoredImage(i.key).catch(() => undefined)));
    throw err;
  }
}

export type SyncResult = { checked: number; updated: number; outOfStock: number };

/**
 * Pulls availability for every cloned product and aligns the local stock with it.
 * Products removed or deactivated on Electro Darna fall to 0. Prices are left alone.
 */
export async function syncElectroDarnaStock(userId?: string): Promise<SyncResult> {
  const linked = await db.product.findMany({ where: { sourceId: { not: null } }, select: { id: true, sourceId: true } });
  if (!linked.length) return { checked: 0, updated: 0, outOfStock: 0 };

  const remote = new Map((await fetchRemoteProducts(linked.map((p) => p.sourceId!))).map((p) => [p.id, p]));
  let updated = 0;
  let outOfStock = 0;
  const now = new Date();

  for (const { id, sourceId } of linked) {
    const target = remoteStock(remote.get(sourceId!));
    if (target === 0) outOfStock++;
    const changed = await db.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id }, select: { stock: true } });
      if (!current) return false;
      await tx.product.update({ where: { id }, data: { stock: target, sourceSyncedAt: now } });
      const delta = target - current.stock;
      if (delta === 0) return false;
      await tx.inventoryMovement.create({
        data: { productId: id, delta, stockAfter: target, reason: "ADJUSTMENT", note: "Synchro Electro Darna", userId },
      });
      return true;
    });
    if (changed) updated++;
  }

  return { checked: linked.length, updated, outOfStock };
}
