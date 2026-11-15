/**
 * Image URL helpers — safe for both server and client.
 *
 * Originals live in R2 under keys like "products/2026/11/<uuid>.jpg" and are served
 * from the custom domain (NEXT_PUBLIC_IMAGE_BASE_URL, e.g. https://images.darezzin.ma).
 *
 * When NEXT_PUBLIC_CF_IMAGE_TRANSFORMS=true, URLs go through Cloudflare Image
 * Transformations (/cdn-cgi/image/...) with format=auto → AVIF or WebP depending on the browser.
 * Otherwise we fall back to the WebP variants generated at upload time.
 */
export const IMAGE_VARIANT_WIDTHS = [480, 1200] as const;

const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "").replace(/\/$/, "");
const CF_TRANSFORMS = process.env.NEXT_PUBLIC_CF_IMAGE_TRANSFORMS === "true";

export function variantKey(key: string, width: number) {
  return `${key.replace(/\.[a-z0-9]+$/i, "")}-w${width}.webp`;
}

export function originalUrl(key: string) {
  return `${BASE}/${key}`;
}

export function imageUrl(key: string, width = 1200, quality = 80) {
  if (CF_TRANSFORMS) {
    return `${BASE}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down/${key}`;
  }
  const variant = IMAGE_VARIANT_WIDTHS.find((w) => width <= w) ?? IMAGE_VARIANT_WIDTHS[IMAGE_VARIANT_WIDTHS.length - 1];
  return `${BASE}/${variantKey(key, variant)}`;
}
