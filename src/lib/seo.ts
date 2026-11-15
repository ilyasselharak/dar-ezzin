import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

export const DEFAULT_DESCRIPTION =
  "Dar Ezzin, votre boutique d'électroménager au Maroc : réfrigérateurs, machines à laver, cuisinières, climatiseurs et petit électroménager des meilleures marques. Livraison partout au Maroc et paiement à la livraison.";

/** Consistent metadata with canonical URL & Open Graph for every indexable page. */
export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  noIndex,
  type = "website",
}: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fr_MA",
      type,
      ...(image ? { images: [{ url: image, width: 1200, height: 1200, alt: title }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(s: { storeName: string; phone: string; email: string; address: string; facebookUrl?: string | null; instagramUrl?: string | null; tiktokUrl?: string | null }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": absoluteUrl("/#store"),
    name: s.storeName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
    image: absoluteUrl("/opengraph-image"),
    telephone: s.phone,
    email: s.email,
    priceRange: "$$",
    currenciesAccepted: "MAD",
    paymentAccepted: "Cash",
    address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "MA" },
    areaServed: { "@type": "Country", name: "Morocco" },
    sameAs: [s.facebookUrl, s.instagramUrl, s.tiktokUrl].filter(Boolean),
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "fr-MA",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/recherche")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function productJsonLd(p: {
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  price: number;
  stock: number;
  images: string[];
  brand?: string | null;
  category?: string | null;
  warrantyMonths?: number | null;
  shippingFee: number;
  freeShippingThreshold: number;
}): JsonLd {
  const priceValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    mpn: p.sku,
    description: p.description ?? undefined,
    image: p.images,
    category: p.category ?? undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/produit/${p.slug}`),
      priceCurrency: "MAD",
      price: (p.price / 100).toFixed(2),
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": absoluteUrl("/#store") },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: (p.price >= p.freeShippingThreshold ? 0 : p.shippingFee / 100).toFixed(2),
          currency: "MAD",
        },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "MA" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "MA",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    ...(p.warrantyMonths
      ? { warranty: { "@type": "WarrantyPromise", durationOfWarranty: { "@type": "QuantitativeValue", value: p.warrantyMonths, unitCode: "MON" } } }
      : {}),
  };
}

export function itemListJsonLd(items: { slug: string; name: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/produit/${p.slug}`), name: p.name })),
  };
}
