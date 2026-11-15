import "server-only";
import sharp from "sharp";
import { storage } from "@/lib/storage";
import { IMAGE_VARIANT_WIDTHS, variantKey } from "@/lib/images";
import { MAX_IMAGE_BYTES } from "@/lib/constants";

export interface ProcessedImage {
  key: string;
  thumbKey: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

/**
 * Called once the browser finished uploading the original to storage.
 * Reads the original, validates it really is an image, and generates WebP variants
 * used as a fallback when Cloudflare Image Transformations are not enabled.
 * (With transformations enabled, Cloudflare serves AVIF/WebP on the fly from the original.)
 */
export async function processUploadedImage(key: string): Promise<ProcessedImage> {
  const head = await storage.head(key);
  if (!head) throw new Error("Fichier introuvable dans le stockage");
  if (head.size > MAX_IMAGE_BYTES) {
    await storage.delete([key]);
    throw new Error("Image trop volumineuse");
  }

  const original = await storage.get(key);
  const image = sharp(original, { failOn: "error" }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height || !meta.format) {
    await storage.delete([key]);
    throw new Error("Fichier image invalide");
  }

  await Promise.all(
    IMAGE_VARIANT_WIDTHS.map(async (w) => {
      const buf = await sharp(original)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      await storage.put(variantKey(key, w), buf, "image/webp");
    }),
  );

  // Dimensions after EXIF orientation
  const rotated = meta.orientation && meta.orientation >= 5;
  return {
    key,
    thumbKey: variantKey(key, IMAGE_VARIANT_WIDTHS[0]),
    width: rotated ? meta.height : meta.width,
    height: rotated ? meta.width : meta.height,
    size: head.size,
    mimeType: `image/${meta.format}`,
  };
}

/** Deletes an original and all generated variants. */
export async function deleteStoredImage(key: string) {
  await storage.delete([key, ...IMAGE_VARIANT_WIDTHS.map((w) => variantKey(key, w))]);
}
