import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaffPage } from "@/lib/session";
import { db } from "@/lib/db";
import { fetchRemoteCatalog, isElectroDarnaConfigured, type RemoteProduct } from "@/server/electrodarna";
import { logger } from "@/lib/logger";
import { RemoteCatalog } from "./remote-catalog";
import { SyncButton } from "./sync-button";

export const metadata = { title: "Electro Darna" };

export default async function ElectroDarnaPage() {
  await requireStaffPage();

  let remote: RemoteProduct[] = [];
  let error: string | null = null;
  if (!isElectroDarnaConfigured()) {
    error = "Le lien n'est pas configuré : ajoutez ELECTRODARNA_API_URL et ELECTRODARNA_API_KEY dans l'environnement.";
  } else {
    try {
      remote = await fetchRemoteCatalog();
    } catch (err) {
      logger.error("Electro Darna catalog fetch failed", { err });
      error = "Impossible de joindre Electro Darna pour le moment. Réessayez plus tard.";
    }
  }

  const linked = await db.product.findMany({
    where: { sourceId: { not: null } },
    select: { id: true, sourceId: true, stock: true, price: true, sourceSyncedAt: true },
  });
  const lastSync = linked.reduce<Date | null>((max, p) => (p.sourceSyncedAt && (!max || p.sourceSyncedAt > max) ? p.sourceSyncedAt : max), null);

  return (
    <>
      <PageHeader
        title="Electro Darna"
        description="Produits disponibles chez Electro Darna. Clonez-les dans votre catalogue : leur stock est ensuite synchronisé automatiquement."
        actions={<SyncButton linkedCount={linked.length} lastSync={lastSync?.toISOString() ?? null} />}
      />
      {error ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : (
        <RemoteCatalog
          products={remote}
          linked={Object.fromEntries(linked.map((p) => [p.sourceId!, { id: p.id, stock: p.stock, price: p.price }]))}
        />
      )}
    </>
  );
}
