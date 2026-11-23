import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { listProducts } from "@/server/queries/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { buildMetadata, pagedPath, pagedTitle } from "@/lib/seo";
import { getSeoSettings } from "@/server/queries/seo";

export async function generateMetadata({ searchParams }: PageProps<"/recherche">): Promise<Metadata> {
  const [{ q, hasFilters, page }, seo] = await Promise.all([searchParams.then(parseListingParams), getSeoSettings()]);
  return buildMetadata({
    title: q ? `Résultats pour « ${q} »` : pagedTitle("Tous nos produits d'électroménager", page),
    path: q ? "/recherche" : pagedPath("/recherche", page),
    // Internal search results are never indexed (Google guidelines); the full catalogue is.
    noIndex: Boolean(q) || hasFilters,
    seo,
  });
}

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const sp = await searchParams;
  const { hasFilters: _h, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, q: listing.q?.toLowerCase() });
  // Out-of-range pagination is a real 404, not an empty 200 page.
  if ((listing.page ?? 1) > result.pageCount) notFound();
  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={[{ name: listing.q ? "Recherche" : "Tous les produits", path: "/recherche" }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">{listing.q ? <>Résultats pour « {listing.q} »</> : "Tous nos produits"}</h1>
      <ProductListing result={result} basePath="/recherche" searchParams={sp} />
    </div>
  );
}
