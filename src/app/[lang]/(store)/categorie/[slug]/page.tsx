import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { getCategoryBySlug, listProducts } from "@/server/queries/catalog";
import { getSeoSettings } from "@/server/queries/seo";
import { parseListingParams } from "@/lib/listing-params";
import { keywordList, pagedPath, pagedTitle } from "@/lib/seo";
import { localizedMetadata } from "@/lib/seo-server";
import { imageUrl } from "@/lib/images";
import { truncate } from "@/lib/utils";

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/categorie/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [category, seo] = await Promise.all([getCategoryBySlug(slug), getSeoSettings()]);
  if (!category) return {};
  const { hasFilters, page } = parseListingParams(await searchParams);
  const meta = category.seo;
  const ogKey = meta.ogImageKey ?? category.imageKey;
  const path = `/categorie/${category.slug}`;
  return localizedMetadata({
    title: pagedTitle(category.metaTitle ?? `${category.name} au meilleur prix au Maroc`, page),
    description:
      category.metaDescription ??
      (category.description ? truncate(category.description, 160) : null) ??
      `Achetez ${category.name.toLowerCase()} au meilleur prix au Maroc chez ${seo.siteName}. Livraison partout au Maroc, paiement à la livraison.`,
    path: pagedPath(path, page),
    // A custom canonical only applies to the unfiltered first page.
    canonical: page && page > 1 ? null : meta.canonicalUrl,
    image: ogKey ? imageUrl(ogKey, 1200) : undefined,
    imageAlt: meta.imageAlt,
    keywords: keywordList(meta.keywords, meta.keywordsAr),
    ogTitle: meta.ogTitle,
    ogDescription: meta.ogDescription,
    // Filtered/sorted variants stay out of the index; pagination stays indexable.
    noIndex: hasFilters || meta.noindex,
    noFollow: meta.nofollow,
    seo,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[lang]/categorie/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { hasFilters, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, categoryId: category.id, includeChildCategories: category.children.map((c) => c.id) });
  // Out-of-range pagination is a real 404, not an empty 200 page.
  if ((listing.page ?? 1) > result.pageCount) notFound();
  const meta = category.seo;
  const firstPage = (listing.page ?? 1) === 1 && !hasFilters;

  const crumbs = [
    ...(category.parent ? [{ name: category.parent.name, path: `/categorie/${category.parent.slug}` }] : []),
    { name: category.name, path: `/categorie/${category.slug}` },
  ];

  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{meta.h1 || category.name}</h1>
        {category.description ?<p className="max-w-3xl text-muted-foreground">{category.description}</p> : null}
        {category.children.length ? (
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {category.children.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link href={`/categorie/${c.slug}`} className="inline-flex rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <ProductListing result={result} basePath={`/categorie/${category.slug}`} searchParams={sp} />

      {/* SEO copy: only on the first, unfiltered page to avoid duplicate content across pages. */}
      {firstPage && (meta.longDescription || meta.descriptionAr) ? (
        <section className="space-y-6 rounded-3xl border bg-card p-6 sm:p-10">
          {meta.longDescription ? (
            <div className="prose-store max-w-3xl">
              <h2 className="text-xl font-bold sm:text-2xl">{`${category.name} : guide et conseils d'achat`}</h2>
              {meta.longDescription.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
            </div>
          ) : null}
          {category.parent ? (
            <p className="text-sm text-muted-foreground">
              Voir aussi : <Link href={`/categorie/${category.parent.slug}`} className="font-medium text-primary hover:underline">{category.parent.name}</Link>
            </p>
          ) : null}
          {meta.descriptionAr ? (
            <div lang="ar" dir="rtl" className="prose-store max-w-3xl border-t pt-6">
              {meta.titleAr ? <h2 className="text-xl font-bold">{meta.titleAr}</h2> : null}
              {meta.descriptionAr.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
