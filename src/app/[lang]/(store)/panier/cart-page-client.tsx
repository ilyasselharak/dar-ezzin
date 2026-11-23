"use client";

import { Link } from "@/i18n/client";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreImage } from "@/components/shared/store-image";
import { QuantityStepper } from "@/components/store/cart-sheet";
import { useCart } from "@/hooks/use-cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { formatPrice } from "@/lib/money";

export function CartPageClient() {
  const { lines, setQuantity, remove } = useCart();
  const { data: quote, isEmpty, mounted } = useCartQuote();

  if (!mounted) return <div className="h-64" />;
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border bg-card p-12 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <p className="text-lg font-semibold">Votre panier est vide</p>
        <Button asChild className="rounded-full"><Link href="/recherche">Découvrir nos produits</Link></Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-10">
      <ul className="divide-y rounded-3xl border bg-card px-4 sm:px-6">
        {lines.map((l) => (
          <li key={l.productId} className="flex gap-4 py-5">
            <Link href={`/produit/${l.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-2xl border bg-white">
              <StoreImage imageKey={l.imageKey} alt={l.name} fill sizes="96px" className="object-contain p-2" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex justify-between gap-2">
                <Link href={`/produit/${l.slug}`} className="line-clamp-2 font-medium hover:underline">{l.name}</Link>
                <button type="button" onClick={() => remove(l.productId)} className="h-fit rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Retirer ${l.name}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{formatPrice(l.price)} / unité</p>
              <div className="mt-auto flex items-center justify-between">
                <QuantityStepper size="sm" value={l.quantity} max={l.maxQuantity} onChange={(v) => setQuantity(l.productId, v)} />
                <span className="font-semibold tabular-nums">{formatPrice(l.price * l.quantity)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-4 rounded-3xl border bg-card p-6 lg:sticky lg:top-32">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd className="tabular-nums">{quote ? formatPrice(quote.subtotal) : "…"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd>{quote ? (quote.shippingFee ? formatPrice(quote.shippingFee) : "Gratuite") : "…"}</dd></div>
          <div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{quote ? formatPrice(quote.total) : "…"}</dd></div>
        </dl>
        <Button asChild className="h-12 w-full rounded-xl text-base"><Link href="/commande">Passer la commande</Link></Button>
        <p className="text-center text-xs text-muted-foreground">Paiement en espèces à la livraison</p>
      </aside>
    </div>
  );
}
