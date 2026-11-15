import { PackageSearch } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { ActiveFilters, ListingSidebar, ListingToolbar } from "@/components/store/listing-filters";
import { PaginationNav } from "@/components/store/pagination-nav";
import { JsonLd } from "@/components/shared/json-ld";
import { itemListJsonLd } from "@/lib/seo";
import type { ListingResult } from "@/server/queries/catalog";

export function ProductListing({ result, basePath, searchParams }: { result: ListingResult; basePath: string; searchParams: Record<string, string | string[] | undefined> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
      <ListingSidebar facets={result.facets} />
      <div className="min-w-0 space-y-5">
        <ListingToolbar total={result.total} facets={result.facets} />
        <ActiveFilters brands={result.facets.brands} />
        {result.items.length ? (
          <>
            <JsonLd data={itemListJsonLd(result.items)} />
            <ProductGrid products={result.items} priorityCount={4} />
            <PaginationNav page={result.page} pageCount={result.pageCount} basePath={basePath} searchParams={searchParams} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
            <PackageSearch className="size-10 text-muted-foreground" />
            <p className="font-medium">Aucun produit ne correspond à votre recherche</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier ou de retirer certains filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
