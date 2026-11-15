import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { Price } from "@/components/store/price";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { discountPercent } from "@/lib/money";
import type { ProductCardData } from "@/server/queries/catalog";

const NEW_DAYS = 30;

function isRecent(date: Date | string | number) {
  return Date.now() - new Date(date).getTime() < NEW_DAYS * 86_400_000;
}

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const [first, second] = product.images;
  const off = discountPercent(product.price, product.compareAtPrice);
  const isNew = isRecent(product.createdAt);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/produit/${product.slug}`} className="relative block aspect-square overflow-hidden bg-white" prefetch={false}>
        <StoreImage
          imageKey={first?.key}
          alt={first?.alt ?? product.name}
          fill
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
          className="object-contain p-4 transition-all duration-500 group-hover:scale-[1.03]"
          priority={priority}
        />
        {second ? (
          <StoreImage
            imageKey={second.key}
            alt=""
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
            className="object-contain p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-md:hidden"
          />
        ) : null}
        <div className="absolute start-2.5 top-2.5 flex flex-col gap-1.5">
          {off ? <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-white">-{off}%</span> : null}
          {isNew && !off ? <span className="rounded-full bg-brass px-2.5 py-1 text-xs font-bold text-brass-foreground">Nouveau</span> : null}
        </div>
        {outOfStock ? (
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-lg bg-foreground/80 py-1.5 text-center text-xs font-semibold text-background">
            Rupture de stock
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {product.brand ? (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{product.brand.name}</span>
        ) : null}
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-foreground">
          <Link href={`/produit/${product.slug}`} prefetch={false} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          <div className="relative z-10">
            <AddToCartButton
              variant="icon"
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageKey: first?.key ?? null,
                maxQuantity: product.stock,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
