"use client";

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

export type UploadedImage = {
  key: string;
  thumbKey: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
};

export type UploadScope = "products" | "categories" | "brands";

export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return `${file.name} : format non supporté (JPEG, PNG, WebP, AVIF)`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} : fichier trop lourd (10 Mo max)`;
  return null;
}

/**
 * 1. Ask our API for a presigned URL (auth + validation server-side)
 * 2. PUT the file directly to R2 (never through our server; secrets stay server-side)
 * 3. Ask our API to verify the object and generate variants
 */
export async function uploadImage(file: File, scope: UploadScope, onProgress?: (pct: number) => void): Promise<UploadedImage> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const presign = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, scope }),
  });
  const target = await presign.json();
  if (!presign.ok) throw new Error(target.error ?? "Échec de la préparation de l'envoi");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    for (const [k, v] of Object.entries(target.headers as Record<string, string>)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 90));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Envoi refusé (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'envoi (vérifiez la configuration CORS du bucket R2)"));
    xhr.send(file);
  });

  const complete = await fetch("/api/admin/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: target.key }),
  });
  const result = await complete.json();
  if (!complete.ok) throw new Error(result.error ?? "Traitement de l'image impossible");
  onProgress?.(100);
  return result as UploadedImage;
}
