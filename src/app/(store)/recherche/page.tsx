import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { listProducts } from "@/server/queries/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }: PageProps<"/recherche">): Promise<Metadata> {
  const { q, hasFilters } = parseListingParams(await searchParams);
  return buildMetadata({
    title: q ? `Résultats pour « ${q} »` : "Tous nos produits d'électroménager",
    path: "/recherche",
    noIndex: Boolean(q) || hasFilters,
  });
}

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const sp = await searchParams;
  const { hasFilters: _h, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, q: listing.q?.toLowerCase() });
  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={[{ name: listing.q ? "Recherche" : "Tous les produits", path: "/recherche" }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">{listing.q ? <>Résultats pour « {listing.q} »</> : "Tous nos produits"}</h1>
      <ProductListing result={result} basePath="/recherche" searchParams={sp} />
    </div>
  );
}
