"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { QuantityStepper } from "@/components/store/cart-sheet";
import { useCart, type CartLine } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/money";

export function ProductBuyBox({ product, whatsapp }: { product: Omit<CartLine, "quantity">; whatsapp: string }) {
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const outOfStock = product.maxQuantity <= 0;

  function buyNow() {
    add(product, qty);
    setOpen(false);
    router.push("/commande");
  }

  const waText = `Bonjour, je souhaite commander : ${product.name} (x${qty}) — ${formatPrice(product.price * qty)}`;

  return (
    <>
      <div className="space-y-3">
        {!outOfStock ? (
          <div className="flex items-center gap-3">
            <QuantityStepper value={qty} max={product.maxQuantity} onChange={setQty} />
            <AddToCartButton product={product} quantity={qty} className="flex-1" />
          </div>
        ) : (
          <AddToCartButton product={product} className="w-full" />
        )}
        {!outOfStock ? (
          <Button type="button" onClick={buyNow} variant="secondary" className="h-12 w-full rounded-xl bg-brass text-base text-brass-foreground hover:bg-brass/90">
            <Zap /> Acheter maintenant — paiement à la livraison
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-12 w-full rounded-xl border-[#25D366]/40 text-base text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]">
          <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
            Commander via WhatsApp
          </a>
        </Button>
      </div>

      {/* Sticky mobile CTA */}
      {!outOfStock ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{product.name}</p>
              <p className="font-heading text-lg font-bold tabular-nums">{formatPrice(product.price)}</p>
            </div>
            <Button type="button" onClick={buyNow} className="h-12 rounded-xl px-5 text-base">
              Commander
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
