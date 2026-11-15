import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <p className="font-heading text-7xl font-extrabold text-primary">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="text-muted-foreground">Cette page n&apos;existe pas ou a été déplacée.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild className="rounded-full"><Link href="/">Retour à l&apos;accueil</Link></Button>
        <Button asChild variant="outline" className="rounded-full"><Link href="/recherche">Voir les produits</Link></Button>
      </div>
    </div>
  );
}
