"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Menu, Phone, Search as SearchIcon, Package, BadgePercent, User } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Logo } from "@/components/shared/logo";
import type { NavCategory } from "@/server/queries/catalog";

export function MobileMenu({ categories, phone }: { categories: NavCategory[]; phone: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="-ms-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-muted lg:hidden" aria-label="Ouvrir le menu">
        <Menu className="size-5.5" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[88%] max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle asChild>
            <div onClick={close}>
              <Logo />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Navigation principale</SheetDescription>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Menu mobile">
          <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégories</p>
          <Accordion type="single" collapsible>
            {categories.map((c) =>
              c.children.length ? (
                <AccordionItem key={c.id} value={c.id} className="border-none">
                  <AccordionTrigger className="rounded-xl px-3 py-3 text-[15px] hover:bg-muted hover:no-underline">
                    <span className="flex items-center gap-3">
                      <CategoryIcon name={c.icon} className="size-5 text-primary" /> {c.name}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1 ps-11">
                    {c.children.map((s) => (
                      <Link key={s.id} href={`/categorie/${s.slug}`} onClick={close} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
                        {s.name}
                      </Link>
                    ))}
                    <Link href={`/categorie/${c.slug}`} onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary">
                      Tout voir
                    </Link>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <Link key={c.id} href={`/categorie/${c.slug}`} onClick={close} className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] hover:bg-muted">
                  <span className="flex items-center gap-3">
                    <CategoryIcon name={c.icon} className="size-5 text-primary" /> {c.name}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ),
            )}
          </Accordion>
          <div className="my-2 border-t" />
          {[
            { href: "/promotions", label: "Promotions", icon: BadgePercent },
            { href: "/recherche", label: "Tous les produits", icon: SearchIcon },
            { href: "/suivi-commande", label: "Suivre ma commande", icon: Package },
            { href: "/compte", label: "Mon compte", icon: User },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] hover:bg-muted">
              <Icon className="size-5 text-muted-foreground" /> {label}
            </Link>
          ))}
        </nav>
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="m-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
          <Phone className="size-4" /> {phone}
        </a>
      </SheetContent>
    </Sheet>
  );
}
