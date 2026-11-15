"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/session";
import { invalidate, TAGS } from "@/server/cache";
import { cloneRemoteProduct, fetchRemoteProducts, syncElectroDarnaStock, type SyncResult } from "@/server/electrodarna";
import { logger } from "@/lib/logger";
import { ok, toActionError, UserFacingError, type ActionResult } from "./result";

const importSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(50),
  status: z.enum(["DRAFT", "ACTIVE"]),
});

export async function importElectroDarnaProducts(input: z.input<typeof importSchema>): Promise<ActionResult<{ created: number; skipped: number; failed: string[] }>> {
  try {
    const user = await assertStaff();
    const { ids, status } = importSchema.parse(input);
    const remote = await fetchRemoteProducts(ids);
    if (!remote.length) throw new UserFacingError("Produits introuvables sur Electro Darna.");

    let created = 0;
    let skipped = 0;
    const failed: string[] = [];
    for (const p of remote) {
      try {
        const res = await cloneRemoteProduct(p, { status, userId: user.id });
        if (res.created) created++;
        else skipped++;
      } catch (err) {
        logger.error("Electro Darna clone failed", { id: p.id, err });
        failed.push(p.name);
      }
    }

    invalidate(TAGS.catalog);
    revalidatePath("/admin/products");
    revalidatePath("/admin/electrodarna");
    return ok({ created, skipped, failed });
  } catch (err) {
    return toActionError(err, "importElectroDarnaProducts");
  }
}

export async function syncElectroDarnaNow(): Promise<ActionResult<SyncResult>> {
  try {
    const user = await assertStaff();
    const result = await syncElectroDarnaStock(user.id);
    invalidate(TAGS.catalog);
    revalidatePath("/admin/electrodarna");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    return ok(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Electro Darna")) return { ok: false, error: err.message };
    return toActionError(err, "syncElectroDarnaNow");
  }
}
