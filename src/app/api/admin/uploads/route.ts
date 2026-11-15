import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { assertStaff, AuthorizationError } from "@/lib/session";
import { storage } from "@/lib/storage";
import { uploadRequestSchema } from "@/lib/validators/catalog";
import { logger } from "@/lib/logger";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Issues a short-lived presigned PUT URL. The browser uploads straight to R2. */
export async function POST(req: Request) {
  try {
    await assertStaff();
    const body = uploadRequestSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
    const { contentType, size, scope } = body.data;
    const d = new Date();
    const key = `${scope}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${randomUUID()}.${EXT[contentType]}`;
    const target = await storage.createUploadUrl(key, contentType, size);
    return NextResponse.json({ key, ...target });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    logger.error("Presign failed", { err });
    return NextResponse.json({ error: "Impossible de préparer l'envoi" }, { status: 500 });
  }
}
