"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ListingResult } from "@/server/queries/catalog";

const SORT_LABELS: Record<string, string> = {
  pertinence: "Pertinence",
  "meilleures-ventes": "Meilleures ventes",
  nouveautes: "Nouveautés",
  "prix-asc": "Prix croissant",
  "prix-desc": "Prix décroissant",
};

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in changes)) next.delete("page");
    startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }
  return { sp, update, pending };
}

function FilterPanel({ facets }: { facets: ListingResult["facets"] }) {
  const { sp, update } = useUrlState();
  const selectedBrands = (sp.get("marque") ?? "").split(",").filter(Boolean);
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  function toggleBrand(slug: string, checked: boolean) {
    const set = new Set(selectedBrands);
    if (checked) set.add(slug);
    else set.delete(slug);
    update({ marque: [...set].join(",") || null });
  }

  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Disponibilité</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            En stock uniquement
            <Switch checked={sp.get("stock") === "1"} onCheckedChange={(v) => update({ stock: v ? "1" : null })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            En promotion
            <Switch checked={sp.get("promo") === "1"} onCheckedChange={(v) => update({ promo: v ? "1" : null })} />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Prix (DH)</h3>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ min: min || null, max: max || null });
          }}
        >
          <Input inputMode="numeric" placeholder={String(Math.floor(facets.minPrice / 100))} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} aria-label="Prix minimum" className="h-10" />
          <span className="text-muted-foreground">–</span>
          <Input inputMode="numeric" placeholder={String(Math.ceil(facets.maxPrice / 100))} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} aria-label="Prix maximum" className="h-10" />
          <Button type="submit" variant="outline" className="h-10">OK</Button>
        </form>
      </section>

      {facets.brands.length ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold">Marques</h3>
          <ul className="space-y-2.5">
            {facets.brands.map((b) => (
              <li key={b.id}>
                <Label className="flex cursor-pointer items-center gap-2.5 font-normal">
                  <Checkbox checked={selectedBrands.includes(b.slug)} onCheckedChange={(v) => toggleBrand(b.slug, v === true)} />
                  <span className="flex-1">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.count}</span>
                </Label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function ListingToolbar({ total, facets }: { total: number; facets: ListingResult["facets"] }) {
  const { sp, update, pending } = useUrlState();
  const activeCount = ["marque", "min", "max", "stock", "promo"].filter((k) => sp.get(k)).length;
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        <span><strong className="text-foreground">{total}</strong> produit{total > 1 ? "s" : ""}</span>
      </p>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 rounded-full lg:hidden">
              <SlidersHorizontal /> Filtres {activeCount ? `(${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl p-5">
            <SheetHeader className="p-0 pb-4">
              <SheetTitle>Filtres</SheetTitle>
              <SheetDescription className="sr-only">Affiner les résultats</SheetDescription>
            </SheetHeader>
            <FilterPanel facets={facets} />
          </SheetContent>
        </Sheet>
        <Select value={sp.get("tri") ?? "pertinence"} onValueChange={(v) => update({ tri: v === "pertinence" ? null : v })}>
          <SelectTrigger className="h-10 w-44 rounded-full" aria-label="Trier par">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(SORT_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ListingSidebar({ facets }: { facets: ListingResult["facets"] }) {
  return (
    <aside className="hidden lg:block" aria-label="Filtres">
      <div className="sticky top-32 rounded-2xl border bg-card p-5">
        <FilterPanel facets={facets} />
      </div>
    </aside>
  );
}

export function ActiveFilters({ brands }: { brands: { slug: string; name: string }[] }) {
  const { sp, update } = useUrlState();
  const chips: { label: string; clear: Record<string, string | null> }[] = [];
  const selected = (sp.get("marque") ?? "").split(",").filter(Boolean);
  for (const slug of selected) {
    chips.push({
      label: brands.find((b) => b.slug === slug)?.name ?? slug,
      clear: { marque: selected.filter((s) => s !== slug).join(",") || null },
    });
  }
  if (sp.get("min") || sp.get("max")) chips.push({ label: `${sp.get("min") ?? "0"} – ${sp.get("max") ?? "∞"} DH`, clear: { min: null, max: null } });
  if (sp.get("stock")) chips.push({ label: "En stock", clear: { stock: null } });
  if (sp.get("promo")) chips.push({ label: "En promotion", clear: { promo: null } });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={() => update(c.clear)} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
          {c.label} <X className="size-3" />
        </button>
      ))}
      <button type="button" onClick={() => update({ marque: null, min: null, max: null, stock: null, promo: null })} className="text-xs font-medium text-primary hover:underline">
        Tout effacer
      </button>
    </div>
  );
}
