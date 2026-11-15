import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { getBrandBySlug, listProducts } from "@/server/queries/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params, searchParams }: PageProps<"/marque/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};
  return buildMetadata({
    title: brand.metaTitle ?? `${brand.name} Maroc — prix et produits`,
    description: brand.metaDescription ?? `Tous les produits ${brand.name} au meilleur prix au Maroc chez Dar Ezzin. Garantie officielle, livraison partout au Maroc.`,
    path: `/marque/${brand.slug}`,
    noIndex: parseListingParams(await searchParams).hasFilters,
  });
}

export default async function BrandPage({ params, searchParams }: PageProps<"/marque/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();
  const { hasFilters: _h, brandSlugs: _b, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, brandId: brand.id });
  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={[{ name: brand.name, path: `/marque/${brand.slug}` }]} />
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{brand.name}</h1>
        {brand.description ? <p className="max-w-3xl text-muted-foreground">{brand.description}</p> : null}
      </header>
      <ProductListing result={result} basePath={`/marque/${brand.slug}`} searchParams={sp} />
    </div>
  );
}
