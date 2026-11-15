import Link from "next/link";
import { Headset, Mail, MapPin, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { getNavCategories } from "@/server/queries/catalog";
import { getSettings } from "@/server/queries/settings";
import { formatPrice } from "@/lib/money";

export function TrustBar({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const items = [
    { icon: Truck, title: "Livraison partout au Maroc", text: `Gratuite dès ${formatPrice(freeShippingThreshold)}` },
    { icon: Wallet, title: "Paiement à la livraison", text: "Payez en espèces à la réception" },
    { icon: ShieldCheck, title: "Garantie officielle", text: "Produits neufs et garantis" },
    { icon: Headset, title: "Service client", text: "Conseil avant et après l'achat" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3 rounded-2xl border bg-card p-3.5 sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-5">{title}</span>
            <span className="block text-xs text-muted-foreground">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function Footer() {
  const [settings, categories] = await Promise.all([getSettings(), getNavCategories()]);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="inline-flex rounded-xl bg-background p-2 pe-3 text-foreground">
            <Logo />
          </div>
          <p className="max-w-xs text-sm opacity-80">{settings.tagline}</p>
          <div className="flex gap-3 text-sm">
            {settings.facebookUrl ? <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">Facebook</a> : null}
            {settings.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">Instagram</a> : null}
            {settings.tiktokUrl ? <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">TikTok</a> : null}
          </div>
        </div>
        <nav aria-label="Catégories">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brass">Catégories</h2>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 8).map((c) => (
              <li key={c.id}><Link href={`/categorie/${c.slug}`} className="opacity-80 hover:opacity-100">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Aide">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brass">Aide</h2>
          <ul className="space-y-2.5 text-sm">
            {[
              ["/suivi-commande", "Suivre ma commande"],
              ["/livraison-retours", "Livraison & retours"],
              ["/a-propos", "À propos"],
              ["/contact", "Contact"],
              ["/conditions-generales", "Conditions générales de vente"],
              ["/confidentialite", "Politique de confidentialité"],
            ].map(([href, label]) => (
              <li key={href}><Link href={href} className="opacity-80 hover:opacity-100">{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brass">Contact</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0 opacity-70" /><a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="opacity-80 hover:opacity-100">{settings.phone}</a></li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0 opacity-70" /><a href={`mailto:${settings.email}`} className="opacity-80 hover:opacity-100">{settings.email}</a></li>
            <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 opacity-70" /><span className="opacity-80">{settings.address}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs opacity-70 sm:flex-row">
          <p>© {year} {settings.storeName}. Tous droits réservés.</p>
          <p>Prix en dirhams marocains (MAD), TTC.</p>
        </div>
      </div>
    </footer>
  );
}
