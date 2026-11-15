"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StoreImage } from "@/components/shared/store-image";
import { cartCount, cartSubtotal, useCart } from "@/hooks/use-cart";
import { useMounted } from "@/hooks/use-mounted";
import { formatPrice } from "@/lib/money";

export function CartButton() {
  const lines = useCart((s) => s.lines);
  const open = useCart((s) => s.open);
  const mounted = useMounted();
  const count = mounted ? cartCount(lines) : 0;
  return (
    <button
      type="button"
      onClick={open}
      className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
      aria-label={`Panier (${count} article${count > 1 ? "s" : ""})`}
    >
      <ShoppingBag className="size-5.5" />
      {count > 0 ? (
        <span className="absolute end-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brass px-1 text-[11px] font-bold leading-5 text-brass-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function QuantityStepper({ value, max, onChange, size = "md" }: { value: number; max: number; onChange: (v: number) => void; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-8" : "h-11";
  return (
    <div className={`inline-flex ${h} items-center rounded-full border bg-background`}>
      <button type="button" className="flex h-full w-9 items-center justify-center rounded-s-full hover:bg-muted disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Diminuer la quantité">
        <Minus className="size-3.5" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="flex h-full w-9 items-center justify-center rounded-e-full hover:bg-muted disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= Math.min(max, 20)} aria-label="Augmenter la quantité">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function CartSheet({ shippingFee, freeShippingThreshold }: { shippingFee: number; freeShippingThreshold: number }) {
  const { lines, isOpen, setOpen, setQuantity, remove } = useCart();
  const mounted = useMounted();
  const subtotal = cartSubtotal(lines);
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / Math.max(1, freeShippingThreshold)) * 100);

  return (
    <Sheet open={mounted && isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-heading text-lg">Mon panier ({cartCount(lines)})</SheetTitle>
          <SheetDescription className="sr-only">Articles de votre panier</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <p className="font-medium">Votre panier est vide</p>
            <Button asChild variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              <Link href="/recherche">Découvrir nos produits</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b bg-accent/50 px-5 py-3">
              <p className="flex items-center gap-2 text-sm">
                <Truck className="size-4 text-accent-foreground" />
                {remaining > 0 ? (
                  <span>
                    Plus que <strong>{formatPrice(remaining)}</strong> pour la livraison gratuite
                  </span>
                ) : (
                  <strong>Livraison gratuite offerte 🎉</strong>
                )}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-brass transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.productId} className="flex gap-3 py-4">
                  <Link href={`/produit/${l.slug}`} onClick={() => setOpen(false)} className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-white">
                    <StoreImage imageKey={l.imageKey} alt={l.name} fill sizes="80px" className="object-contain p-1.5" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/produit/${l.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-medium leading-5 hover:underline">
                        {l.name}
                      </Link>
                      <button type="button" onClick={() => remove(l.productId)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Retirer ${l.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <QuantityStepper size="sm" value={l.quantity} max={l.maxQuantity} onChange={(v) => setQuantity(l.productId, v)} />
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(l.price * l.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <SheetFooter className="gap-3 border-t bg-muted/30 p-5">
              <div className="flex items-center justify-between text-base">
                <span>Sous-total</span>
                <span className="font-heading text-lg font-bold tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Livraison : {remaining > 0 ? formatPrice(shippingFee) : "gratuite"} · Paiement à la livraison
              </p>
              <Button asChild className="h-12 rounded-xl text-base" onClick={() => setOpen(false)}>
                <Link href="/commande">Commander maintenant</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>
                <Link href="/panier">Voir le panier</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
