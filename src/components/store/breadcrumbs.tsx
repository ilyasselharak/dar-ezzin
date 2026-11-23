import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getSeoSettings } from "@/server/queries/seo";

export async function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const all = [{ name: "Accueil", path: "/" }, ...items];
  const seo = await getSeoSettings();
  return (
    <>
      {seo.sdBreadcrumbs ? <JsonLd data={breadcrumbJsonLd(all, seo)} /> : null}
      <nav aria-label="Fil d'Ariane" className="overflow-x-auto scrollbar-none">
        <ol className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
          {all.map((it, i) => (
            <li key={it.path} className="flex items-center gap-1.5">
              {i > 0 ? <ChevronRight className="size-3.5 opacity-60" aria-hidden /> : null}
              {i === all.length - 1 ? (
                <span aria-current="page" className="max-w-[60vw] truncate font-medium text-foreground">{it.name}</span>
              ) : (
                <Link href={it.path} className="hover:text-foreground">{it.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
