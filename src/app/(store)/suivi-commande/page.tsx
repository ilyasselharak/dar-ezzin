import { TrackOrderForm } from "./track-form";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Suivre ma commande",
  description: "Suivez l'état de votre commande Dar Ezzin avec votre numéro de commande et votre téléphone.",
  path: "/suivi-commande",
});

export default function TrackOrderPage() {
  return (
    <div className="container-page max-w-2xl space-y-6 py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Suivre ma commande", path: "/suivi-commande" }]} />
      <h1 className="text-3xl font-extrabold">Suivre ma commande</h1>
      <TrackOrderForm />
    </div>
  );
}
