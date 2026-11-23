import { Link } from "@/i18n/client";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreImage } from "@/components/shared/store-image";
import { api } from "@convex/_generated/api";
import { fetchAuthQuery } from "@/lib/convex";
import { LAST_ORDER_COOKIE } from "@/lib/constants";
import { formatPrice } from "@/lib/money";
import { localizedMetadata } from "@/lib/seo-server";
import { getSettings } from "@/server/queries/settings";

export async function generateMetadata() {
  return localizedMetadata({ title: "Commande confirmée", path: "/commande/confirmation", noIndex: true });
}

export default async function ConfirmationPage({ params }: PageProps<"/[lang]/commande/confirmation/[number]">) {
  const { number } = await params;
  if (!/^DZ\d{6}-[A-Z0-9]{4}$/.test(number)) notFound();
  const jar = await cookies();
  const [cookieNumber, token] = (jar.get(LAST_ORDER_COOKIE)?.value ?? "").split(".");
  // Details (PII) are only returned to the buyer's browser (cookie token) or the account owner
  const [order, settings] = await Promise.all([
    fetchAuthQuery(api.orders.confirmation, { number, token: cookieNumber === number ? token : undefined }),
    getSettings(),
  ]);
  if (!order) notFound();

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="space-y-6 rounded-3xl border bg-card p-6 text-center sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="size-9 text-success" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">Merci, votre commande est enregistrée !</h1>
          <p className="text-muted-foreground">
            Numéro de commande : <strong className="font-mono text-foreground">{order.number}</strong>
          </p>
          <p className="text-sm text-muted-foreground">Notre équipe vous appellera très prochainement pour confirmer la livraison.</p>
        </div>

        {order.canSee ? (
          <div className="space-y-4 rounded-2xl bg-muted/50 p-4 text-start sm:p-5">
            <ul className="divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2.5">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-white">
                    <StoreImage imageKey={it.imageKey} alt={it.name} fill sizes="48px" className="object-contain p-0.5" />
                  </span>
                  <span className="flex-1 text-sm">{it.name} <span className="text-muted-foreground">× {it.quantity}</span></span>
                  <span className="text-sm font-semibold tabular-nums">{formatPrice(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt>Livraison</dt><dd>{order.shippingFee ? formatPrice(order.shippingFee) : "Gratuite"}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total à payer</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
            <div className="border-t pt-3 text-sm">
              <p className="font-semibold">Livraison à</p>
              <p className="text-muted-foreground">{order.fullName} · {order.phone}<br />{order.address}, {order.city}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="h-12 rounded-xl px-6"><Link href="/">Continuer mes achats</Link></Button>
          <Button asChild variant="outline" className="h-12 rounded-xl px-6"><Link href="/suivi-commande">Suivre ma commande</Link></Button>
        </div>
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Phone className="size-4" /> Une question ? {settings.phone}
        </p>
      </div>
    </div>
  );
}
