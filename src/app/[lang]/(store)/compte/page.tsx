import { Link } from "@/i18n/client";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyOrders } from "@/server/queries/admin";
import { requireUser } from "@/lib/session";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { localizedMetadata } from "@/lib/seo-server";
import { SignOutButton } from "./sign-out-button";

export async function generateMetadata() {
  return localizedMetadata({ title: "Mon compte", path: "/compte", noIndex: true });
}

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const orders = await getMyOrders();

  return (
    <div className="container-page max-w-4xl space-y-8 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Bonjour {user.name.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton />
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Mes commandes</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border bg-card p-10 text-center">
            <Package className="size-9 text-muted-foreground" />
            <p className="font-medium">Vous n&apos;avez pas encore passé de commande.</p>
            <Button asChild className="rounded-full"><Link href="/">Commencer mes achats</Link></Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-2xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono font-semibold">{o.number}</p>
                  <Badge className={ORDER_STATUS_STYLES[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(o.createdAt)} · {formatPrice(o.total)}</p>
                <p className="mt-2 line-clamp-1 text-sm">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
