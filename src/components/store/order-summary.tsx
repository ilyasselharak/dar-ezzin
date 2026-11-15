"use client";

import { StoreImage } from "@/components/shared/store-image";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/money";
import type { CartQuote } from "@/server/actions/checkout";

export function OrderSummary({ quote, loading }: { quote?: CartQuote; loading?: boolean }) {
  if (!quote) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }
  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <ul className="divide-y">
        {quote.lines.map((l) => (
          <li key={l.productId} className="flex items-center gap-3 py-3">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-white">
              <StoreImage imageKey={l.imageKey} alt={l.name} fill sizes="64px" className="object-contain p-1" />
              <span className="absolute -end-0 -top-0 flex size-5 items-center justify-center rounded-bl-lg bg-primary text-[11px] font-bold text-primary-foreground">{l.quantity}</span>
            </span>
            <span className="line-clamp-2 flex-1 text-sm">{l.name}</span>
            <span className="text-sm font-semibold tabular-nums">{formatPrice(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd className="tabular-nums">{formatPrice(quote.subtotal)}</dd></div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Livraison</dt>
          <dd className="tabular-nums">{quote.shippingFee === 0 ? <span className="font-medium text-success">Gratuite</span> : formatPrice(quote.shippingFee)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">Total à payer à la livraison</dt>
          <dd className="font-heading text-xl font-bold tabular-nums">{formatPrice(quote.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
