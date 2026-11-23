import "server-only";
import { getSitemapData } from "@/server/queries/catalog";
import { getSeoSettings } from "@/server/queries/seo";
import { STATIC_PAGES } from "@/lib/content/pages";
import { imageUrl } from "@/lib/images";
import { urlFor, type SeoSettings } from "@/lib/seo";

export const SITEMAP_SECTIONS = ["pages", "categories", "products", "brands"] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

type Entry = { loc: string; lastmod?: number; changefreq?: string; priority?: number; images?: string[] };

/** Only self-canonical, indexable pages belong in the sitemap. */
const selfCanonical = (seo: SeoSettings, path: string, canonical: string | null) => !canonical || urlFor(canonical, seo) === urlFor(path, seo);

export async function sitemapEntries(section: SitemapSection): Promise<Entry[]> {
  const [data, seo] = await Promise.all([getSitemapData(), getSeoSettings()]);
  if (!seo.robotsIndex) return [];
  const now = Date.now();
  switch (section) {
    case "pages":
      return [
        { loc: urlFor("/", seo), lastmod: now, changefreq: "daily", priority: 1 },
        { loc: urlFor("/promotions", seo), lastmod: now, changefreq: "daily", priority: 0.8 },
        { loc: urlFor("/recherche", seo), lastmod: now, changefreq: "daily", priority: 0.6 },
        ...(seo.sitemapIncludeStaticPages
          ? [...Object.keys(STATIC_PAGES).map((p) => ({ loc: urlFor(`/${p}`, seo), changefreq: "yearly", priority: 0.3 })), { loc: urlFor("/suivi-commande", seo), changefreq: "yearly", priority: 0.3 }]
          : []),
      ];
    case "categories":
      return data.categories
        .filter((c) => !c.noindex && selfCanonical(seo, `/categorie/${c.slug}`, c.canonicalUrl))
        .map((c) => ({
          loc: urlFor(`/categorie/${c.slug}`, seo),
          lastmod: c.updatedAt,
          changefreq: "daily",
          priority: 0.9,
          images: seo.sitemapIncludeImages && c.imageKey ? [imageUrl(c.imageKey, 1200)] : undefined,
        }));
    case "products":
      return data.products
        .filter((p) => !p.noindex && selfCanonical(seo, `/produit/${p.slug}`, p.canonicalUrl))
        .map((p) => ({
          loc: urlFor(`/produit/${p.slug}`, seo),
          lastmod: p.updatedAt,
          changefreq: "weekly",
          priority: 0.8,
          images: seo.sitemapIncludeImages ? p.images.map((i) => imageUrl(i.key, 1200)) : undefined,
        }));
    case "brands":
      return seo.sitemapIncludeBrands ? data.brands.map((b) => ({ loc: urlFor(`/marque/${b.slug}`, seo), lastmod: b.updatedAt, changefreq: "weekly", priority: 0.6 })) : [];
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const iso = (t: number) => new Date(t).toISOString();

export function renderUrlset(entries: Entry[]) {
  const body = entries
    .map((e) =>
      [
        "<url>",
        `<loc>${esc(e.loc)}</loc>`,
        e.lastmod ? `<lastmod>${iso(e.lastmod)}</lastmod>` : "",
        e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : "",
        e.priority != null ? `<priority>${e.priority}</priority>` : "",
        ...(e.images ?? []).map((img) => `<image:image><image:loc>${esc(img)}</image:loc></image:image>`),
        "</url>",
      ].join(""),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

export async function renderIndex() {
  const seo = await getSeoSettings();
  const sections = [];
  for (const s of SITEMAP_SECTIONS) {
    const entries = await sitemapEntries(s);
    if (!entries.length) continue;
    const lastmod = Math.max(...entries.map((e) => e.lastmod ?? 0));
    sections.push(`<sitemap><loc>${esc(urlFor(`/sitemaps/${s}.xml`, seo))}</loc>${lastmod ? `<lastmod>${iso(lastmod)}</lastmod>` : ""}</sitemap>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sections.join("\n")}\n</sitemapindex>\n`;
}

export const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };
