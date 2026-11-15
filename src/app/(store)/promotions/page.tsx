import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { listProducts } from "@/server/queries/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }: PageProps<"/promotions">): Promise<Metadata> {
  return buildMetadata({
    title: "Promotions électroménager au Maroc",
    description: "Les meilleures promotions sur l'électroménager au Maroc : réfrigérateurs, machines à laver, climatiseurs et plus. Livraison partout au Maroc.",
    path: "/promotions",
    noIndex: parseListingParams(await searchParams).hasFilters,
  });
}

export default async function PromotionsPage({ searchParams }: PageProps<"/promotions">) {
  const sp = await searchParams;
  const { hasFilters: _h, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, onSale: true });
  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={[{ name: "Promotions", path: "/promotions" }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">Promotions</h1>
      <ProductListing result={result} basePath="/promotions" searchParams={sp} />
    </div>
  );
}
