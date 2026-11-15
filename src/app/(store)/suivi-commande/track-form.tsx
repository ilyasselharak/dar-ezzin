"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrder } from "@/server/actions/checkout";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
type Result = Extract<Awaited<ReturnType<typeof trackOrder>>, { ok: true }>["data"];

export function TrackOrderForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Result | null>(null);

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-3xl border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        action={(fd) =>
          start(async () => {
            setError(null);
            const res = await trackOrder({ number: String(fd.get("number") ?? ""), phone: String(fd.get("phone") ?? "") });
            if (res.ok) setOrder(res.data);
            else {
              setOrder(null);
              setError(res.error);
            }
          })
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="number">N° de commande</Label>
          <Input id="number" name="number" required placeholder="DZ261113-ABCD" className="h-12 uppercase" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" type="tel" required placeholder="06 12 34 56 78" className="h-12" />
        </div>
        <Button type="submit" disabled={pending} className="h-12 rounded-xl px-6">
          {pending ? <Loader2 className="animate-spin" /> : null} Rechercher
        </Button>
      </form>
      {error ? <p className="rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive" role="alert">{error}</p> : null}
      {order ? (
        <div className="space-y-6 rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-lg font-bold">{order.number}</h2>
            <p className="text-sm text-muted-foreground">Passée le {formatDate(order.createdAt)} · {formatPrice(order.total)}</p>
          </div>
          {order.status === "CANCELLED" || order.status === "RETURNED" ? (
            <p className="rounded-xl bg-muted p-4 font-medium">Statut : {ORDER_STATUS_LABELS[order.status]}</p>
          ) : (
            <ol className="space-y-4">
              {STEPS.map((s, i) => {
                const reached = STEPS.indexOf(order.status) >= i;
                const event = order.events.find((e) => e.status === s);
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border-2", reached ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
                      {reached ? <Check className="size-4" /> : <span className="text-xs">{i + 1}</span>}
                    </span>
                    <span className={cn("flex-1 text-sm", reached ? "font-semibold" : "text-muted-foreground")}>{ORDER_STATUS_LABELS[s]}</span>
                    {event ? <span className="text-xs text-muted-foreground">{formatDate(event.createdAt, { dateStyle: "short", timeStyle: "short" })}</span> : null}
                  </li>
                );
              })}
            </ol>
          )}
          <ul className="border-t pt-4 text-sm text-muted-foreground">
            {order.items.map((it, i) => <li key={i}>{it.name} × {it.quantity}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
