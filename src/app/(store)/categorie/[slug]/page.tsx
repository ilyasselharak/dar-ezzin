import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { getCategoryBySlug, listProducts } from "@/server/queries/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { buildMetadata } from "@/lib/seo";
import { imageUrl } from "@/lib/images";

export async function generateMetadata({ params, searchParams }: PageProps<"/categorie/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  const { hasFilters } = parseListingParams(await searchParams);
  return buildMetadata({
    title: category.metaTitle ?? `${category.name} au meilleur prix au Maroc`,
    description:
      category.metaDescription ??
      category.description?.slice(0, 160) ??
      `Achetez ${category.name.toLowerCase()} au meilleur prix au Maroc chez Dar Ezzin. Livraison partout au Maroc, paiement à la livraison.`,
    path: `/categorie/${category.slug}`,
    image: category.imageKey ? imageUrl(category.imageKey, 1200) : undefined,
    // Filtered/sorted variants consolidate to the canonical and stay out of the index
    noIndex: hasFilters,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categorie/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { hasFilters: _h, ...listing } = parseListingParams(sp);
  const result = await listProducts({ ...listing, categoryId: category.id, includeChildCategories: category.children.map((c) => c.id) });

  const crumbs = [
    ...(category.parent ? [{ name: category.parent.name, path: `/categorie/${category.parent.slug}` }] : []),
    { name: category.name, path: `/categorie/${category.slug}` },
  ];

  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
        {category.description ? <p className="max-w-3xl text-muted-foreground">{category.description}</p> : null}
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
    </div>
  );
}
