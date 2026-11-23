import { CheckoutForm } from "./checkout-form";
import { localizedMetadata } from "@/lib/seo-server";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata() {
  return localizedMetadata({ title: "Finaliser ma commande", path: "/commande", noIndex: true });
}

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return (
    <div className="container-page py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Finaliser ma commande</h1>
      <CheckoutForm defaults={{ fullName: user?.name ?? "", email: user?.email ?? "", phone: (user as { phone?: string } | null)?.phone ?? "" }} />
    </div>
  );
}
