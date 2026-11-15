"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin, assertStaff } from "@/lib/session";
import { toCentimes } from "@/lib/money";
import { settingsSchema, stockAdjustmentSchema, type SettingsInput } from "@/lib/validators/orders";
import { invalidate, TAGS } from "@/server/cache";
import { ok, toActionError, UserFacingError, type ActionResult } from "./result";

export async function adjustStock(input: { productId: string; delta: number; reason: string; note?: string }): Promise<ActionResult<{ stock: number }>> {
  try {
    const user = await assertStaff();
    const data = stockAdjustmentSchema.parse(input);
    const stock = await db.$transaction(async (tx) => {
      const res = await tx.product.updateMany({
        where: { id: data.productId, ...(data.delta < 0 ? { stock: { gte: -data.delta } } : {}) },
        data: { stock: { increment: data.delta } },
      });
      if (res.count === 0) throw new UserFacingError("Stock insuffisant pour ce retrait.");
      const p = await tx.product.findUniqueOrThrow({ where: { id: data.productId }, select: { stock: true } });
      await tx.inventoryMovement.create({
        data: { productId: data.productId, delta: data.delta, stockAfter: p.stock, reason: data.reason, note: data.note || null, userId: user.id },
      });
      return p.stock;
    });
    invalidate(TAGS.catalog);
    revalidatePath("/admin/inventory");
    return ok({ stock });
  } catch (err) {
    return toActionError(err, "adjustStock");
  }
}

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  try {
    await assertAdmin();
    const d = settingsSchema.parse(input);
    const values = {
      ...d,
      shippingFee: toCentimes(d.shippingFee),
      freeShippingThreshold: toCentimes(d.freeShippingThreshold),
      announcement: d.announcement || null,
      facebookUrl: d.facebookUrl || null,
      instagramUrl: d.instagramUrl || null,
      tiktokUrl: d.tiktokUrl || null,
    };
    await db.storeSettings.upsert({ where: { id: "store" }, update: values, create: { id: "store", ...values } });
    invalidate(TAGS.settings);
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "saveSettings");
  }
}

export async function setUserRole(userId: string, role: "CUSTOMER" | "STAFF" | "ADMIN"): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    if (!["CUSTOMER", "STAFF", "ADMIN"].includes(role)) throw new UserFacingError("Rôle invalide.");
    if (me.id === userId && role !== "ADMIN") throw new UserFacingError("Vous ne pouvez pas retirer votre propre accès administrateur.");
    await db.user.update({ where: { id: userId }, data: { role } });
    // Force re-login so the new role is applied everywhere
    await db.session.deleteMany({ where: { userId } });
    revalidatePath("/admin/customers");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "setUserRole");
  }
}

