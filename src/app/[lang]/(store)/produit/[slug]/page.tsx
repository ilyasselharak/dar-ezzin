import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, ShieldCheck, Truck, Wallet, RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductBuyBox } from "@/components/store/product-buy-box";
import { ProductRail } from "@/components/store/product-card";
import { Price } from "@/components/store/price";
import { JsonLd } from "@/components/shared/json-ld";
import { getProductBySlug, getRelatedProducts } from "@/server/queries/catalog";
import { getSettings } from "@/server/queries/settings";
import { getSeoSettings } from "@/server/queries/seo";
import { keywordList, productJsonLd, urlFor } from "@/lib/seo";
import { localizedMetadata } from "@/lib/seo-server";
import { imageUrl } from "@/lib/images";
import { discountPercent, formatPrice } from "@/lib/money";
import { truncate } from "@/lib/utils";

type Spec = { label: string; value: string };

// ISR: rendered on first visit, cached, and refreshed when the catalog tag is invalidated
export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/produit/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, seo] = await Promise.all([getProductBySlug(slug), getSeoSettings()]);
  if (!product) return {};
  const meta = product.seo;
  const fallbackDesc = `${product.name}${product.brand ? ` ${product.brand.name}` : ""} à ${formatPrice(product.price)} au Maroc. ${product.shortDescription ?? ""} Livraison partout au Maroc, paiement à la livraison.`;
  const ogKey = meta.ogImageKey ?? product.images[0]?.key;
  return localizedMetadata({
    title: product.metaTitle ?? `${product.name} — Prix Maroc`,
    description: product.metaDescription ?? truncate(fallbackDesc.replace(/\s+/g, " "), 160),
    path: `/produit/${product.slug}`,
    canonical: meta.canonicalUrl,
    image: ogKey ? imageUrl(ogKey, 1200) : undefined,
    imageAlt: meta.ogImageKey ? undefined : (product.images[0]?.alt ?? product.name),
    keywords: keywordList(meta.keywords, meta.keywordsAr),
    ogTitle: meta.ogTitle,
    ogDescription: meta.ogDescription,
    noIndex: meta.noindex,
    noFollow: meta.nofollow,
    seo,
  });
}

export default async function ProductPage({ params }: PageProps<"/[lang]/produit/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, settings, seo] = await Promise.all([getRelatedProducts(product.id, product.categoryId, product.brandId), getSettings(), getSeoSettings()]);
  const meta = product.seo;
  const specs = (Array.isArray(product.specs) ? product.specs : []) as Spec[];
  const off = discountPercent(product.price, product.compareAtPrice);
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const freeShipping = product.price >= settings.freeShippingThreshold;

  const crumbs = [
    ...(product.category?.parent ? [{ name: product.category.parent.name, path: `/categorie/${product.category.parent.slug}` }] : []),
    ...(product.category ? [{ name: product.category.name, path: `/categorie/${product.category.slug}` }] : []),
    { name: product.name, path: `/produit/${product.slug}` },
  ];

  return (
    <div className="has-sticky-cta pb-20 lg:pb-0">
      {seo.sdProduct ? (
        <JsonLd
          data={productJsonLd(
            {
              name: product.name,
              url: urlFor(meta.canonicalUrl || `/produit/${product.slug}`, seo),
              sku: product.sku,
              description: product.shortDescription ?? product.description,
              price: product.price,
              stock: product.stock,
              images: product.images.map((i) => imageUrl(i.key, 1200)),
              brand: product.brand?.name,
              category: product.category?.name,
              warrantyMonths: product.warrantyMonths,
              shippingFee: settings.shippingFee,
              freeShippingThreshold: settings.freeShippingThreshold,
            },
            seo,
          )}
        />
      ) : null}
      <div className="container-page space-y-6 py-5 sm:py-8">
        <Breadcrumbs items={crumbs} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <ProductGallery images={product.images.map((i) => ({ key: i.key, alt: i.alt }))} name={product.name} />

          <div className="space-y-6">
            <div className="space-y-3">
              {product.brand ? (
                <Link href={`/marque/${product.brand.slug}`} className="text-xs font-bold uppercase tracking-[0.14em] text-primary hover:underline">
                  {product.brand.name}
                </Link>
              ) : null}
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{meta.h1 || product.name}</h1>
              <p className="text-xs text-muted-foreground">Réf. {product.sku}</p>
            </div>

            <div className="space-y-2 rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
                {off ? <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-white">-{off}%</span> : null}
              </div>
              {off && product.compareAtPrice ? (
                <p className="text-sm font-medium text-success">Vous économisez {formatPrice(product.compareAtPrice - product.price)}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">Prix TTC en dirhams</p>
            </div>

            <p className="flex items-center gap-2 text-sm font-medium">
              {product.stock <= 0 ? (
                <><CircleAlert className="size-4 text-destructive" /> <span className="text-destructive">Rupture de stock</span></>
              ) : lowStock ? (
                <><CircleAlert className="size-4 text-amber-600" /> <span className="text-amber-700">Plus que {product.stock} en stock — commandez vite</span></>
              ) : (
                <><CheckCircle2 className="size-4 text-success" /> <span className="text-success">En stock, prêt à être livré</span></>
              )}
            </p>

            {product.shortDescription ? <p className="text-[15px] leading-7 text-foreground/80">{product.shortDescription}</p> : null}

            <ProductBuyBox
              whatsapp={settings.whatsapp}
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageKey: product.images[0]?.key ?? null,
                maxQuantity: product.stock,
              }}
            />

            <ul className="grid grid-cols-2 gap-2.5 text-sm">
              <li className="flex items-center gap-2.5 rounded-xl border p-3"><Truck className="size-5 shrink-0 text-primary" /> {freeShipping ? "Livraison gratuite" : `Livraison ${formatPrice(settings.shippingFee)}`}</li>
              <li className="flex items-center gap-2.5 rounded-xl border p-3"><Wallet className="size-5 shrink-0 text-primary" /> Paiement à la livraison</li>
              <li className="flex items-center gap-2.5 rounded-xl border p-3"><ShieldCheck className="size-5 shrink-0 text-primary" /> {product.warrantyMonths ? `Garantie ${product.warrantyMonths >= 12 && product.warrantyMonths % 12 === 0 ? `${product.warrantyMonths / 12} an${product.warrantyMonths > 12 ? "s" : ""}` : `${product.warrantyMonths} mois`}` : "Garantie constructeur"}</li>
              <li className="flex items-center gap-2.5 rounded-xl border p-3"><RotateCcw className="size-5 shrink-0 text-primary" /> Retour sous 7 jours</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <Accordion type="multiple" defaultValue={["description", "specs", "arabic"]} className="rounded-2xl border bg-card px-5">
            {product.description ? (
              <AccordionItem value="description">
                <AccordionTrigger className="text-base font-semibold">Description</AccordionTrigger>
                <AccordionContent>
                  <div className="prose-store whitespace-pre-line">{product.description}</div>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {specs.length ? (
              <AccordionItem value="specs">
                <AccordionTrigger className="text-base font-semibold">Caractéristiques techniques</AccordionTrigger>
                <AccordionContent>
                  <dl className="divide-y overflow-hidden rounded-xl border">
                    {specs.map((s, i) => (
                      <div key={`${s.label}-${i}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm even:bg-muted/40">
                        <dt className="text-muted-foreground">{s.label}</dt>
                        <dd className="font-medium">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {meta.descriptionAr ? (
              <AccordionItem value="arabic">
                <AccordionTrigger className="text-base font-semibold">
                  <span lang="ar" dir="rtl">{meta.titleAr || "الوصف بالعربية"}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div lang="ar" dir="rtl" className="prose-store whitespace-pre-line">{meta.descriptionAr}</div>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            <AccordionItem value="delivery" className="border-b-0">
              <AccordionTrigger className="text-base font-semibold">Livraison & paiement</AccordionTrigger>
              <AccordionContent className="prose-store">
                <p>
                  Livraison partout au Maroc en 24 à 72 h selon votre ville. Frais de livraison : {formatPrice(settings.shippingFee)}, offerts dès {formatPrice(settings.freeShippingThreshold)} d&apos;achat.
                </p>
                <p>Après votre commande, notre équipe vous appelle pour confirmer. Vous payez en espèces à la réception, après avoir vérifié votre colis.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {related.length ? (
        <section className="container-page py-8">
          <h2 className="mb-5 text-2xl font-bold">Vous aimerez aussi</h2>
          <ProductRail products={related} />
        </section>
      ) : null}
    </div>
  );
}
