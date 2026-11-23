import { TrackOrderForm } from "./track-form";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { localizedMetadata } from "@/lib/seo-server";
import { getSeoSettings } from "@/server/queries/seo";

export async function generateMetadata() {
  return localizedMetadata({
    title: "Suivre ma commande",
    description: "Suivez l'état de votre commande Dar Ezzin avec votre numéro de commande et votre téléphone.",
    path: "/suivi-commande",
    seo: await getSeoSettings(),
  });
}

export default function TrackOrderPage() {
  return (
    <div className="container-page max-w-2xl space-y-6 py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Suivre ma commande", path: "/suivi-commande" }]} />
      <h1 className="text-3xl font-extrabold">Suivre ma commande</h1>
      <TrackOrderForm />
    </div>
  );
}
