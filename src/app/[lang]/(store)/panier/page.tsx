import { CartPageClient } from "./cart-page-client";
import { localizedMetadata } from "@/lib/seo-server";

export async function generateMetadata() {
  return localizedMetadata({ title: "Mon panier", path: "/panier", noIndex: true });
}

export default function CartPage() {
  return (
    <div className="container-page py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Mon panier</h1>
      <CartPageClient />
    </div>
  );
}
