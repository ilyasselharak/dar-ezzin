import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { listProducts } from "@/server/queries/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { buildMetadata, pagedPath, pagedTitle } from "@/lib/seo";
import { getSeoSettings } from "@/server/queries/seo";

export async function generateMetadata({ searchParams }: PageProps<"/[lang]/promotions">): Promise<Metadata> {
  const [{ hasFilters, page }, seo] = await Promise.all([searchParams.then(parseListingParams), getSeoSettings()]);
  return buildMetadata({
    title: pagedTitle("Promotions électroménager au Maroc", page),
    description: "Les meilleures promotions sur l'électroménager au Maroc : réfrigérateurs, machines à laver, climatiseurs et plus. Livraison partout au Maroc.",
    path: pagedPath("/promotions", page),
    noIndex: hasFilters,
    seo,
  });
}

export default async function PromotionsPage({ searchParams }: PageProps<"/[lang]/promotions">) {
  const sp = await searchParams;
  const { hasFilters: _h, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, onSale: true });
  // Out-of-range pagination is a real 404, not an empty 200 page.
  if ((listing.page ?? 1) > result.pageCount) notFound();
  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={[{ name: "Promotions", path: "/promotions" }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">Promotions</h1>
      <ProductListing result={result} basePath="/promotions" searchParams={sp} />
    </div>
  );
}
