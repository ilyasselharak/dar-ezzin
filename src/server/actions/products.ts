"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/session";
import { toCentimes } from "@/lib/money";
import { productFormSchema, type ProductFormInput } from "@/lib/validators/catalog";
import { deleteStoredImage } from "@/lib/storage/image-processing";
import { logger } from "@/lib/logger";
import { invalidate, TAGS } from "@/server/cache";
import { ok, toActionError, UserFacingError, type ActionResult } from "./result";

const cents = (v: number | null | undefined) => (v == null || v === 0 ? null : toCentimes(v));

export async function saveProduct(id: string | null, input: ProductFormInput): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await assertStaff();
    const data = productFormSchema.parse(input);

    for (const img of data.images) {
      if (!img.key.startsWith("products/")) throw new UserFacingError("Image invalide.");
    }

    const base = {
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      shortDescription: data.shortDescription ?? null,
      description: data.description ?? null,
      price: toCentimes(data.price),
      compareAtPrice: cents(data.compareAtPrice),
      costPrice: cents(data.costPrice),
      lowStockThreshold: data.lowStockThreshold,
      status: data.status,
      isFeatured: data.isFeatured,
      warrantyMonths: data.warrantyMonths ?? null,
      categoryId: data.categoryId || null,
      brandId: data.brandId || null,
      specs: data.specs,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
    };

    const imageRows = data.images.map((img, position) => ({
      key: img.key,
      thumbKey: img.thumbKey ?? null,
      alt: img.alt?.trim() || null,
      width: img.width ?? null,
      height: img.height ?? null,
      size: img.size ?? null,
      mimeType: img.mimeType ?? null,
      position,
    }));

    let removedKeys: string[] = [];

    const product = await db.$transaction(async (tx) => {
      if (!id) {
        const created = await tx.product.create({
          data: { ...base, stock: data.stock, images: { create: imageRows } },
          select: { id: true, slug: true, stock: true },
        });
        if (data.stock > 0) {
          await tx.inventoryMovement.create({
            data: { productId: created.id, delta: data.stock, stockAfter: data.stock, reason: "RESTOCK", note: "Stock initial", userId: user.id },
          });
        }
        return created;
      }

      const existing = await tx.product.findUnique({ where: { id }, select: { stock: true, images: { select: { key: true } } } });
      if (!existing) throw new UserFacingError("Produit introuvable.");

      const keep = new Set(imageRows.map((i) => i.key));
      removedKeys = existing.images.map((i) => i.key).filter((k) => !keep.has(k));
      if (removedKeys.length) await tx.productImage.deleteMany({ where: { productId: id, key: { in: removedKeys } } });
      for (const row of imageRows) {
        await tx.productImage.upsert({
          where: { key: row.key },
          create: { ...row, productId: id },
          update: { alt: row.alt, position: row.position },
        });
      }

      const updated = await tx.product.update({ where: { id }, data: { ...base, stock: data.stock }, select: { id: true, slug: true } });
      const delta = data.stock - existing.stock;
      if (delta !== 0) {
        await tx.inventoryMovement.create({
          data: { productId: id, delta, stockAfter: data.stock, reason: "ADJUSTMENT", note: "Modification depuis la fiche produit", userId: user.id },
        });
      }
      return updated;
    });

    // Storage cleanup happens after the DB commit; failures are only logged.
    await Promise.all(removedKeys.map((k) => deleteStoredImage(k).catch((err) => logger.warn("Image delete failed", { key: k, err }))));

    invalidate(TAGS.catalog);
    revalidatePath("/admin/products");
    return ok({ id: product.id, slug: product.slug });
  } catch (err) {
    return toActionError(err, "saveProduct");
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await assertStaff();
    const product = await db.product.findUnique({ where: { id }, select: { images: { select: { key: true } }, _count: { select: { orderItems: true } } } });
    if (!product) throw new UserFacingError("Produit introuvable.");
    if (product._count.orderItems > 0) {
      // Keep history intact: products that were sold are archived, not deleted.
      await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    } else {
      await db.product.delete({ where: { id } });
      await Promise.all(product.images.map((i) => deleteStoredImage(i.key).catch(() => undefined)));
    }
    invalidate(TAGS.catalog);
    revalidatePath("/admin/products");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "deleteProduct");
  }
}

export async function setProductStatus(ids: string[], status: "DRAFT" | "ACTIVE" | "ARCHIVED"): Promise<ActionResult> {
  try {
    await assertStaff();
    await db.product.updateMany({ where: { id: { in: ids } }, data: { status } });
    invalidate(TAGS.catalog);
    revalidatePath("/admin/products");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "setProductStatus");
  }
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await assertStaff();
    const p = await db.product.findUnique({ where: { id } });
    if (!p) throw new UserFacingError("Produit introuvable.");
    const suffix = Date.now().toString(36).slice(-4);
    const copy = await db.product.create({
      data: {
        shortDescription: p.shortDescription,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice,
        lowStockThreshold: p.lowStockThreshold,
        isFeatured: false,
        warrantyMonths: p.warrantyMonths,
        categoryId: p.categoryId,
        brandId: p.brandId,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        specs: p.specs ?? [],
        name: `${p.name} (copie)`, slug: `${p.slug}-copie-${suffix}`, sku: `${p.sku}-C${suffix}`.toUpperCase(), status: "DRAFT", stock: 0 },
      select: { id: true },
    });
    revalidatePath("/admin/products");
    return ok({ id: copy.id });
  } catch (err) {
    return toActionError(err, "duplicateProduct");
  }
}
