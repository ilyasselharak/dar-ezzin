"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/session";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, STOCK_RELEASED_STATUSES } from "@/lib/constants";
import { orderStatusUpdateSchema } from "@/lib/validators/orders";
import { invalidate, TAGS } from "@/server/cache";
import { ok, toActionError, UserFacingError, type ActionResult } from "./result";

export async function updateOrderStatus(input: { orderId: string; status: string; message?: string }): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const data = orderStatusUpdateSchema.parse(input);

    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        select: { id: true, number: true, status: true, items: { select: { productId: true, quantity: true } } },
      });
      if (!order) throw new UserFacingError("Commande introuvable.");
      if (!ORDER_TRANSITIONS[order.status].includes(data.status)) {
        throw new UserFacingError(`Transition impossible : ${ORDER_STATUS_LABELS[order.status]} → ${ORDER_STATUS_LABELS[data.status]}.`);
      }

      // Release reserved stock when an order is cancelled or returned
      if (STOCK_RELEASED_STATUSES.includes(data.status) && !STOCK_RELEASED_STATUSES.includes(order.status)) {
        for (const item of order.items) {
          if (!item.productId) continue;
          const p = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity }, salesCount: { decrement: item.quantity } },
            select: { stock: true },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              delta: item.quantity,
              stockAfter: p.stock,
              reason: data.status === "CANCELLED" ? "ORDER_CANCELLED" : "RETURN",
              orderId: order.id,
              note: `Commande ${order.number}`,
              userId: user.id,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: data.status,
          ...(data.status === "DELIVERED" ? { paymentStatus: "PAID" } : {}),
          ...(data.status === "RETURNED" ? { paymentStatus: "REFUNDED" } : {}),
          events: {
            create: { status: data.status, message: data.message || `Statut : ${ORDER_STATUS_LABELS[data.status]}`, userId: user.id },
          },
        },
      });
    });

    invalidate(TAGS.catalog);
    revalidatePath(`/admin/orders/${data.orderId}`);
    revalidatePath("/admin/orders");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "updateOrderStatus");
  }
}

export async function addOrderNote(orderId: string, message: string): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const text = message.trim();
    if (!text || text.length > 1000) throw new UserFacingError("Note invalide.");
    await db.orderEvent.create({ data: { orderId, message: text, userId: user.id } });
    revalidatePath(`/admin/orders/${orderId}`);
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "addOrderNote");
  }
}

export async function updateOrderCustomer(
  orderId: string,
  input: { fullName: string; phone: string; city: string; address: string; internalNote?: string },
): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const { moroccanPhone } = await import("@/lib/validators/common");
    const phone = moroccanPhone.parse(input.phone);
    if (input.fullName.trim().length < 2 || input.address.trim().length < 4 || input.city.trim().length < 2) {
      throw new UserFacingError("Informations client invalides.");
    }
    await db.order.update({
      where: { id: orderId },
      data: {
        fullName: input.fullName.trim(),
        phone,
        city: input.city.trim(),
        address: input.address.trim(),
        internalNote: input.internalNote?.trim() || null,
        events: { create: { message: "Informations client modifiées", userId: user.id } },
      },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "updateOrderCustomer");
  }
}
