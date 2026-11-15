import { NextResponse } from "next/server";
import { z } from "zod";
import { assertStaff, AuthorizationError } from "@/lib/session";
import { processUploadedImage } from "@/lib/storage/image-processing";
import { logger } from "@/lib/logger";

const schema = z.object({ key: z.string().regex(/^(products|categories|brands)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/) });

/** Validates the uploaded original and generates responsive WebP variants. */
export async function POST(req: Request) {
  try {
    await assertStaff();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Clé invalide" }, { status: 400 });
    const result = await processUploadedImage(parsed.data.key);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    logger.error("Image processing failed", { err });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Traitement impossible" }, { status: 422 });
  }
}
