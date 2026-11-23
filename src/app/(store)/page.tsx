import Link from "next/link";
import { ArrowRight, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { StoreImage } from "@/components/shared/store-image";
import { ProductRail } from "@/components/store/product-card";
import { TrustBar } from "@/components/store/footer";
import { getActiveBrands, getHomeCollections, getNavCategories, type ProductCardData } from "@/server/queries/catalog";
import { getSettings } from "@/server/queries/settings";
import { getSeoSettings } from "@/server/queries/seo";
import { formatPrice } from "@/lib/money";
import { buildMetadata, keywordList } from "@/lib/seo";
import { imageUrl } from "@/lib/images";

export const revalidate = 600;

export async function generateMetadata() {
  const seo = await getSeoSettings();
  const ogKey = seo.homeOgImageKey || seo.ogImageKey;
  return buildMetadata({
    title: seo.homeTitle || seo.defaultTitle,
    absoluteTitle: true,
    description: seo.homeDescription || seo.defaultDescription,
    path: "/",
    keywords: keywordList(seo.homeKeywords, seo.defaultKeywords),
    image: ogKey ? imageUrl(ogKey, 1200) : undefined,
    ogTitle: seo.homeOgTitle || seo.ogTitle,
    ogDescription: seo.homeOgDescription || seo.ogDescription,
    seo,
  });
}

function Section({ title, href, children, eyebrow }: { title: string; href?: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="container-page py-8 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-brass">{eyebrow}</p> : null}
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        </div>
        {href ? (
          <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Voir tout <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function HeroProduct({ product }: { product?: ProductCardData }) {
  if (!product) return null;
  return (
    <Link href={`/produit/${product.slug}`} className="group relative mx-auto block aspect-square w-full max-w-md">
      <div className="absolute inset-[8%] rounded-full bg-brass/25 blur-3xl" />
      <div className="relative size-full overflow-hidden rounded-[2rem] bg-white/95 shadow-2xl shadow-black/20">
        <StoreImage imageKey={product.images[0]?.key} alt={product.name} fill priority sizes="(min-width: 1024px) 420px, 80vw" className="object-contain p-8 transition duration-700 group-hover:scale-105" />
      </div>
      <div className="absolute -bottom-4 start-4 end-4 rounded-2xl bg-background/95 p-4 text-foreground shadow-xl backdrop-blur sm:start-8 sm:end-8">
        <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
        <p className="font-heading text-lg font-bold">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [collections, categories, brands, settings, seo] = await Promise.all([getHomeCollections(), getNavCategories(), getActiveBrands(), getSettings(), getSeoSettings()]);
  const heroProduct = collections.featured[0] ?? collections.bestSellers[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-zellige opacity-60" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-primary-foreground/20">
              <span className="size-1.5 rounded-full bg-brass" /> Livraison partout au Maroc
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              {seo.homeH1 ? seo.homeH1 : <>L&apos;électroménager qui rend <span className="text-brass">la maison plus belle</span>.</>}
            </h1>
            <p className="max-w-lg text-base opacity-85 sm:text-lg">
              Réfrigérateurs, lave-linge, cuisinières, climatiseurs et petit électroménager des grandes marques — garantis, livrés chez vous et payés à la livraison.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-brass px-6 text-base text-brass-foreground hover:bg-brass/90">
                <Link href="/recherche">Découvrir le catalogue <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href="/promotions"><BadgePercent /> Promotions</Link>
              </Button>
            </div>
            <p className="text-sm opacity-75">Livraison gratuite dès {formatPrice(settings.freeShippingThreshold)} · Paiement en espèces à la réception</p>
          </div>
          <div className="pb-6 max-lg:hidden">
            <HeroProduct product={heroProduct} />
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length ? (
        <Section title="Nos catégories" eyebrow="Explorer">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categorie/${c.slug}`} className="group flex h-full flex-col items-center gap-3 rounded-2xl border bg-card p-3 text-center transition hover:border-primary/30 hover:shadow-md sm:p-5">
                  <span className="relative flex aspect-square w-full max-w-24 items-center justify-center overflow-hidden rounded-2xl bg-accent/60 text-primary transition group-hover:bg-accent">
                    {c.imageKey ? (
                      <StoreImage imageKey={c.imageKey} alt={c.imageAlt || c.name} fill sizes="120px" className="object-contain p-2" />
                    ) : (
                      <CategoryIcon name={c.icon} className="size-9 sm:size-11" />
                    )}
                  </span>
                  <span className="text-xs font-semibold leading-tight sm:text-sm">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="container-page"><TrustBar freeShippingThreshold={settings.freeShippingThreshold} /></div>

      {collections.featured.length ? (
        <Section title="Notre sélection" eyebrow="Coups de cœur" href="/recherche?tri=pertinence">
          <ProductRail products={collections.featured} />
        </Section>
      ) : null}

      {collections.deals.length ? (
        <section className="bg-accent/40 py-2">
          <Section title="Bonnes affaires" eyebrow="Promotions" href="/promotions">
            <ProductRail products={collections.deals} />
          </Section>
        </section>
      ) : null}

      {collections.bestSellers.length ? (
        <Section title="Meilleures ventes" eyebrow="Populaires" href="/recherche?tri=meilleures-ventes">
          <ProductRail products={collections.bestSellers} />
        </Section>
      ) : null}

      {collections.newest.length ? (
        <Section title="Nouveautés" eyebrow="Arrivages" href="/recherche?tri=nouveautes">
          <ProductRail products={collections.newest} />
        </Section>
      ) : null}

      {brands.length ? (
        <Section title="Nos marques">
          <ul className="flex flex-wrap gap-3">
            {brands.map((b) => (
              <li key={b.id}>
                <Link href={`/marque/${b.slug}`} className="flex h-16 min-w-32 items-center justify-center rounded-2xl border bg-card px-6 transition hover:border-primary/30 hover:shadow-md">
                  {b.logoKey ? (
                    <span className="relative h-8 w-24"><StoreImage imageKey={b.logoKey} alt={b.name} fill sizes="96px" className="object-contain" /></span>
                  ) : (
                    <span className="font-heading text-base font-bold tracking-wide text-foreground/80">{b.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* SEO copy */}
      <section className="container-page py-8">
        <div className="rounded-3xl border bg-card p-6 sm:p-10">
          <h2 className="mb-3 text-xl font-bold sm:text-2xl">{seo.homeSeoHeading || <>Dar Ezzin, votre spécialiste de l&apos;électroménager au Maroc</>}</h2>
          <div className="prose-store max-w-3xl">
            {seo.homeSeoText ? (
              seo.homeSeoText.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)
            ) : (
              <>
                <p>
                  Dar Ezzin sélectionne pour vous le meilleur du gros et du petit électroménager : réfrigérateurs, congélateurs, machines à laver, lave-vaisselle,
                  cuisinières, fours, micro-ondes, climatiseurs, téléviseurs et accessoires pour la maison. Tous nos produits sont neufs, d&apos;origine et couverts par la garantie constructeur.
                </p>
                <p>
                  Nous livrons à Casablanca, Rabat, Marrakech, Tanger, Fès, Agadir et dans toutes les villes du Maroc. Commandez en quelques secondes, notre équipe vous appelle pour confirmer,
                  et vous payez en espèces à la livraison.
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
