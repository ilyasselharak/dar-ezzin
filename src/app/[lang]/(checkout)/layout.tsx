import { Link } from "@/i18n/client";
import { Lock, Phone } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { getSettings } from "@/server/queries/settings";

/** Distraction-free checkout layout (no menus) to maximise conversion. */
export default async function CheckoutLayout({ children }: LayoutProps<"/[lang]">) {
  const settings = await getSettings();
  return (
    <>
      <header className="border-b bg-background">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hidden items-center gap-1.5 hover:text-foreground sm:flex"><Phone className="size-4" />{settings.phone}</a>
            <span className="flex items-center gap-1.5"><Lock className="size-4" /> Commande sécurisée</span>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted/30">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <Link href="/conditions-generales" className="hover:underline">Conditions générales de vente</Link> · <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
      </footer>
    </>
  );
}
