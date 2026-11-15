import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncElectroDarnaStock } from "@/server/electrodarna";
import { invalidate, TAGS } from "@/server/cache";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Scheduled stock sync with Electro Darna (Vercel Cron or any external scheduler). */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncElectroDarnaStock();
    if (result.updated > 0) invalidate(TAGS.catalog);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("Electro Darna sync failed", { err });
    return NextResponse.json({ error: "Sync failed" }, { status: 502 });
  }
}
