import type { MetadataRoute } from "next";
import { getSitemapData } from "@/server/queries/catalog";
import { STATIC_PAGES } from "@/lib/content/pages";
import { imageUrl } from "@/lib/images";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, brands } = await getSitemapData();
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/promotions"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/recherche"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    ...categories.map((c) => ({ url: absoluteUrl(`/categorie/${c.slug}`), lastModified: new Date(c.updatedAt), changeFrequency: "daily" as const, priority: 0.9 })),
    ...products.map((p) => ({
      url: absoluteUrl(`/produit/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => imageUrl(i.key, 1200)),
    })),
    ...brands.map((b) => ({ url: absoluteUrl(`/marque/${b.slug}`), lastModified: new Date(b.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...Object.keys(STATIC_PAGES).map((p) => ({ url: absoluteUrl(`/${p}`), changeFrequency: "yearly" as const, priority: 0.3 })),
    { url: absoluteUrl("/suivi-commande"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
