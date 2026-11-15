import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { TAGS } from "@/server/cache";

const CACHE = { tags: [TAGS.catalog], revalidate: 600 };

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  isFeatured: true,
  createdAt: true,
  brand: { select: { name: true, slug: true } },
  images: {
    orderBy: { position: "asc" },
    take: 2,
    select: { key: true, alt: true, width: true, height: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

// ── Navigation ─────────────────────────────────────────────

export const getNavCategories = unstable_cache(
  async () =>
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        imageKey: true,
        children: {
          where: { isActive: true },
          orderBy: [{ position: "asc" }, { name: "asc" }],
          select: { id: true, name: true, slug: true },
        },
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    }),
  ["nav-categories"],
  CACHE,
);
export type NavCategory = Awaited<ReturnType<typeof getNavCategories>>[number];

export const getActiveBrands = unstable_cache(
  async () =>
    db.brand.findMany({
      where: { isActive: true, products: { some: { status: "ACTIVE" } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, logoKey: true },
    }),
  ["active-brands"],
  CACHE,
);

// ── Home collections ───────────────────────────────────────

export const getHomeCollections = unstable_cache(
  async () => {
    const active = { status: "ACTIVE" } as const;
    const [featured, newest, bestSellers, deals] = await Promise.all([
      db.product.findMany({ where: { ...active, isFeatured: true }, orderBy: { updatedAt: "desc" }, take: 8, select: productCardSelect }),
      db.product.findMany({ where: active, orderBy: { createdAt: "desc" }, take: 8, select: productCardSelect }),
      db.product.findMany({ where: active, orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }], take: 8, select: productCardSelect }),
      db.product.findMany({ where: { ...active, compareAtPrice: { not: null } }, orderBy: { updatedAt: "desc" }, take: 8, select: productCardSelect }),
    ]);
    return { featured, newest, bestSellers, deals: deals.filter((p) => (p.compareAtPrice ?? 0) > p.price) };
  },
  ["home-collections"],
  CACHE,
);

// ── Product detail ─────────────────────────────────────────

export const getProductBySlug = unstable_cache(
  async (slug: string) =>
    db.product.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        images: { orderBy: { position: "asc" } },
        brand: { select: { id: true, name: true, slug: true } },
        category: {
          select: { id: true, name: true, slug: true, parent: { select: { name: true, slug: true } } },
        },
      },
    }),
  ["product-by-slug"],
  CACHE,
);
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export const getRelatedProducts = unstable_cache(
  async (productId: string, categoryId: string | null, brandId: string | null) =>
    db.product.findMany({
      where: {
        status: "ACTIVE",
        id: { not: productId },
        OR: [categoryId ? { categoryId } : {}, brandId ? { brandId } : {}].filter((o) => Object.keys(o).length),
      },
      orderBy: [{ salesCount: "desc" }],
      take: 8,
      select: productCardSelect,
    }),
  ["related-products"],
  CACHE,
);

// ── Listing / search ───────────────────────────────────────

export type SortOption = "pertinence" | "nouveautes" | "prix-asc" | "prix-desc" | "meilleures-ventes";

export interface ListingParams {
  categoryId?: string;
  includeChildCategories?: string[];
  brandId?: string;
  brandSlugs?: string[];
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: SortOption;
  page?: number;
}

function buildWhere(p: ListingParams): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
  if (p.categoryId) and.push({ categoryId: { in: [p.categoryId, ...(p.includeChildCategories ?? [])] } });
  if (p.brandId) and.push({ brandId: p.brandId });
  if (p.brandSlugs?.length) and.push({ brand: { slug: { in: p.brandSlugs } } });
  if (p.inStock) and.push({ stock: { gt: 0 } });
  if (p.onSale) and.push({ compareAtPrice: { not: null } });
  if (p.minPrice != null) and.push({ price: { gte: p.minPrice } });
  if (p.maxPrice != null) and.push({ price: { lte: p.maxPrice } });
  if (p.q) {
    const terms = p.q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const term of terms) {
      and.push({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { shortDescription: { contains: term, mode: "insensitive" } },
        ],
      });
    }
  }
  return { AND: and };
}

function buildOrder(sort: SortOption | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "nouveautes":
      return [{ createdAt: "desc" }];
    case "prix-asc":
      return [{ price: "asc" }];
    case "prix-desc":
      return [{ price: "desc" }];
    case "meilleures-ventes":
      return [{ salesCount: "desc" }, { createdAt: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { salesCount: "desc" }, { createdAt: "desc" }];
  }
}

export const listProducts = unstable_cache(
  async (params: ListingParams) => {
    const page = Math.max(1, params.page ?? 1);
    const where = buildWhere(params);
    // Facets ignore the brand filter itself so users can multi-select brands
    const facetWhere = buildWhere({ ...params, brandSlugs: undefined, minPrice: undefined, maxPrice: undefined });
    const [items, total, brandFacets, priceRange] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: buildOrder(params.sort),
        skip: (page - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
        select: productCardSelect,
      }),
      db.product.count({ where }),
      db.product.groupBy({ by: ["brandId"], where: { ...facetWhere, brandId: { not: null } }, _count: true }),
      db.product.aggregate({ where: facetWhere, _min: { price: true }, _max: { price: true } }),
    ]);
    const brands = brandFacets.length
      ? await db.brand.findMany({
          where: { id: { in: brandFacets.map((b) => b.brandId!) } },
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        })
      : [];
    return {
      items,
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
      facets: {
        brands: brands.map((b) => ({ ...b, count: brandFacets.find((f) => f.brandId === b.id)?._count ?? 0 })),
        minPrice: priceRange._min.price ?? 0,
        maxPrice: priceRange._max.price ?? 0,
      },
    };
  },
  ["list-products"],
  CACHE,
);
export type ListingResult = Awaited<ReturnType<typeof listProducts>>;

export const searchSuggestions = unstable_cache(
  async (q: string) =>
    db.product.findMany({
      where: buildWhere({ q }),
      orderBy: [{ salesCount: "desc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { key: true } },
        brand: { select: { name: true } },
      },
    }),
  ["search-suggestions"],
  { ...CACHE, revalidate: 300 },
);

// ── Category / brand pages ─────────────────────────────────

export const getCategoryBySlug = unstable_cache(
  async (slug: string) =>
    db.category.findFirst({
      where: { slug, isActive: true },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true, slug: true } },
      },
    }),
  ["category-by-slug"],
  CACHE,
);

export const getBrandBySlug = unstable_cache(
  async (slug: string) => db.brand.findFirst({ where: { slug, isActive: true } }),
  ["brand-by-slug"],
  CACHE,
);

// ── Cart pricing (never cached — used at checkout) ─────────

export async function getProductsForCart(ids: string[]) {
  if (!ids.length) return [];
  return db.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      stock: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { key: true } },
    },
  });
}

// ── Sitemap ────────────────────────────────────────────────

export const getSitemapData = unstable_cache(
  async () => {
    const [products, categories, brands] = await Promise.all([
      db.product.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true, images: { orderBy: { position: "asc" }, take: 1, select: { key: true } } },
      }),
      db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      db.brand.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    ]);
    return { products, categories, brands };
  },
  ["sitemap-data"],
  { ...CACHE, revalidate: 3600 },
);
