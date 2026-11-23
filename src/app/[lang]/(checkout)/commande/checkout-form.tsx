"use client";

import { useState, useTransition } from "react";
import { Link, useLocalePath } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, ShoppingBag, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrderSummary } from "@/components/store/order-summary";
import { useCart } from "@/hooks/use-cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { createOrder } from "@/server/actions/checkout";
import { moroccanPhone } from "@/lib/validators/common";
import { MOROCCAN_CITIES } from "@/lib/constants";

const formSchema = z.object({
  fullName: z.string().trim().min(3, "Indiquez votre nom complet"),
  phone: moroccanPhone,
  email: z.union([z.literal(""), z.email("Email invalide")]).optional(),
  city: z.string().trim().min(2, "Indiquez votre ville"),
  address: z.string().trim().min(8, "Indiquez une adresse complète (quartier, rue, n°)"),
  note: z.string().max(500).optional(),
  website: z.string().optional(),
});
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive" role="alert">{message}</p> : null;
}

export function CheckoutForm({ defaults }: { defaults: { fullName: string; email: string; phone: string } }) {
  const router = useRouter();
  const lp = useLocalePath();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const { data: quote, isFetching, isEmpty, mounted } = useCartQuote();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaults, city: "", address: "", note: "", website: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  function onSubmit(values: FormOut) {
    setServerError(null);
    startTransition(async () => {
      const res = await createOrder({
        ...values,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      if (!res.ok) {
        setServerError(res.error);
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) form.setError(k as keyof FormIn, { message: v[0] });
        }
        toast.error(res.error);
        return;
      }
      clear();
      router.replace(lp(`/commande/confirmation/${res.data.number}`));
    });
  }

  if (!mounted) return <div className="h-96" />;

  if (isEmpty) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border bg-card p-10 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <p className="text-lg font-semibold">Votre panier est vide</p>
        <Button asChild className="rounded-full"><Link href="/">Continuer mes achats</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-[1fr_420px] lg:gap-10">
      <div className="space-y-6">
        <section className="space-y-5 rounded-3xl border bg-card p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-bold">Vos coordonnées de livraison</h2>
            <p className="text-sm text-muted-foreground">Aucun paiement en ligne : vous payez à la réception.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fullName">Nom complet *</Label>
              <Input id="fullName" autoComplete="name" className="h-12" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
              <FieldError message={errors.fullName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" className="h-12" aria-invalid={!!errors.phone} {...form.register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ville *</Label>
              <Input id="city" list="cities" autoComplete="address-level2" placeholder="Casablanca" className="h-12" aria-invalid={!!errors.city} {...form.register("city")} />
              <datalist id="cities">{MOROCCAN_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              <FieldError message={errors.city?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Adresse complète *</Label>
              <Textarea id="address" rows={2} autoComplete="street-address" placeholder="Quartier, rue, numéro, étage…" aria-invalid={!!errors.address} {...form.register("address")} />
              <FieldError message={errors.address?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Input id="email" type="email" autoComplete="email" className="h-12" aria-invalid={!!errors.email} {...form.register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="note">Instructions de livraison <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Textarea id="note" rows={2} placeholder="Ex : appeler avant de livrer, livraison l'après-midi…" {...form.register("note")} />
            </div>
            {/* Honeypot */}
            <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...form.register("website")} />
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-bold">Mode de paiement</h2>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-4">
            <Wallet className="size-6 text-primary" />
            <div>
              <p className="font-semibold">Paiement à la livraison</p>
              <p className="text-sm text-muted-foreground">En espèces, à la réception de votre commande.</p>
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-5 rounded-3xl border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-bold">Récapitulatif</h2>
          <OrderSummary quote={quote} loading={isFetching} />
          {serverError ? <p className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive" role="alert">{serverError}</p> : null}
          <Button type="submit" disabled={pending || !quote || quote.lines.length === 0} className="h-14 w-full rounded-2xl text-base font-semibold">
            {pending ? <><Loader2 className="animate-spin" /> Envoi en cours…</> : "Confirmer ma commande"}
          </Button>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> Notre équipe vous appelle pour confirmer avant l&apos;expédition</li>
            <li className="flex items-center gap-2"><Truck className="size-4 text-success" /> Livraison en 24 à 72 h partout au Maroc</li>
          </ul>
          <p className="text-[11px] text-muted-foreground">
            En confirmant, vous acceptez nos <Link href="/conditions-generales" className="underline">conditions générales de vente</Link>.
          </p>
        </div>
      </aside>
    </form>
  );
}
