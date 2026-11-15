import { NextResponse } from "next/server";
import { storage, storageDriverName, verifyLocalUploadToken } from "@/lib/storage";

/** Development-only stand-in for R2 presigned uploads (STORAGE_DRIVER=local). */
export async function PUT(req: Request) {
  if (storageDriverName !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const ct = url.searchParams.get("ct") ?? "";
  const size = Number(url.searchParams.get("size"));
  const expires = Number(url.searchParams.get("expires"));
  const token = url.searchParams.get("token") ?? "";
  if (!verifyLocalUploadToken(key, ct, size, expires, token)) {
    return NextResponse.json({ error: "Signature invalide ou expirée" }, { status: 403 });
  }
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length !== size) return NextResponse.json({ error: "Taille inattendue" }, { status: 400 });
  await storage.put(key, body, ct);
  return new NextResponse(null, { status: 200 });
}
