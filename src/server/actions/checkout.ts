"use server";

import { randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { checkoutSchema, trackOrderSchema, type CheckoutInput } from "@/lib/validators/orders";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { invalidate, TAGS } from "@/server/cache";
import { ok, toActionError, UserFacingError, type ActionResult } from "./result";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function orderNumber() {
  const d = new Date();
  const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `DZ${date}-${suffix}`;
}

async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function createOrder(input: CheckoutInput): Promise<ActionResult<{ number: string }>> {
  try {
    const ip = await clientIp();
    const limit = rateLimit(`checkout:${ip}`, 6, 10 * 60 * 1000);
    if (!limit.ok) throw new UserFacingError("Trop de tentatives. Réessayez dans quelques minutes.");

    const data = checkoutSchema.parse(input);
    if (data.website) throw new UserFacingError("Requête invalide.");

    // Merge duplicate lines
    const qtyById = new Map<string, number>();
    for (const item of data.items) qtyById.set(item.productId, Math.min(20, (qtyById.get(item.productId) ?? 0) + item.quantity));

    const user = await getCurrentUser();

    const order = await db.$transaction(
      async (tx) => {
        const settings = await tx.storeSettings.upsert({ where: { id: "store" }, update: {}, create: { id: "store" } });
        const products = await tx.product.findMany({
          where: { id: { in: [...qtyById.keys()] }, status: "ACTIVE" },
          select: { id: true, name: true, sku: true, price: true, images: { orderBy: { position: "asc" }, take: 1, select: { key: true } } },
        });
        if (products.length !== qtyById.size) {
          throw new UserFacingError("Certains produits de votre panier ne sont plus disponibles. Actualisez votre panier.");
        }

        // Atomic conditional decrement — prevents overselling under concurrency
        for (const p of products) {
          const qty = qtyById.get(p.id)!;
          const res = await tx.product.updateMany({
            where: { id: p.id, stock: { gte: qty } },
            data: { stock: { decrement: qty }, salesCount: { increment: qty } },
          });
          if (res.count === 0) throw new UserFacingError(`Stock insuffisant pour « ${p.name} ».`);
        }

        const lines = products.map((p) => {
          const quantity = qtyById.get(p.id)!;
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            imageKey: p.images[0]?.key ?? null,
            unitPrice: p.price,
            quantity,
            lineTotal: p.price * quantity,
          };
        });
        const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
        const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;

        let created = null;
        for (let attempt = 0; attempt < 4 && !created; attempt++) {
          try {
            created = await tx.order.create({
              data: {
                number: orderNumber(),
                userId: user?.id,
                fullName: data.fullName,
                phone: data.phone,
                email: data.email || null,
                city: data.city,
                address: data.address,
                customerNote: data.note || null,
                subtotal,
                shippingFee,
                total: subtotal + shippingFee,
                items: { create: lines },
                events: { create: { status: "PENDING", message: "Commande passée sur le site" } },
              },
              select: { id: true, number: true },
            });
          } catch (e) {
            if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
          }
        }
        if (!created) throw new Error("Could not allocate order number");

        const after = await tx.product.findMany({ where: { id: { in: [...qtyById.keys()] } }, select: { id: true, stock: true } });
        await tx.inventoryMovement.createMany({
          data: after.map((p) => ({
            productId: p.id,
            delta: -qtyById.get(p.id)!,
            stockAfter: p.stock,
            reason: "SALE" as const,
            orderId: created!.id,
            note: `Commande ${created!.number}`,
          })),
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );

    // Lets the confirmation page show full details only to the buyer
    (await cookies()).set("dz_last_order", order.number, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    invalidate(TAGS.catalog); // stock & best-seller ordering changed
    logger.info("Order created", { number: order.number, ip });
    return ok({ number: order.number });
  } catch (err) {
    return toActionError(err, "createOrder");
  }
}

export async function trackOrder(input: { number: string; phone: string }) {
  try {
    const ip = await clientIp();
    if (!rateLimit(`track:${ip}`, 15, 10 * 60 * 1000).ok) {
      throw new UserFacingError("Trop de tentatives. Réessayez plus tard.");
    }
    const data = trackOrderSchema.parse(input);
    const order = await db.order.findFirst({
      where: { number: data.number.toUpperCase(), phone: data.phone },
      select: {
        number: true,
        status: true,
        total: true,
        city: true,
        createdAt: true,
        items: { select: { name: true, quantity: true } },
        events: { where: { status: { not: null } }, orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      },
    });
    if (!order) throw new UserFacingError("Aucune commande trouvée avec ces informations.");
    return ok(order);
  } catch (err) {
    return toActionError(err, "trackOrder");
  }
}

export type CartQuote = {
  lines: { productId: string; name: string; slug: string; price: number; stock: number; imageKey: string | null; quantity: number; lineTotal: number }[];
  removedIds: string[];
  subtotal: number;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
};

/** Re-prices the client cart from the database (prices/stock may have changed). */
export async function quoteCart(items: { productId: string; quantity: number }[]): Promise<CartQuote> {
  const safe = items.slice(0, 50).filter((i) => typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0);
  const [{ getProductsForCart }, settings] = await Promise.all([
    import("@/server/queries/catalog"),
    db.storeSettings.upsert({ where: { id: "store" }, update: {}, create: { id: "store" } }),
  ]);
  const products = await getProductsForCart(safe.map((i) => i.productId));
  const lines = safe
    .map((i) => {
      const p = products.find((x) => x.id === i.productId);
      if (!p) return null;
      const quantity = Math.min(i.quantity, 20, Math.max(p.stock, 0));
      return { productId: p.id, name: p.name, slug: p.slug, price: p.price, stock: p.stock, imageKey: p.images[0]?.key ?? null, quantity, lineTotal: p.price * quantity };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shippingFee = subtotal === 0 || subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  return {
    lines,
    removedIds: safe.filter((i) => !products.some((p) => p.id === i.productId)).map((i) => i.productId),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
  };
}
