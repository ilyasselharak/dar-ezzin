import Link from "next/link";
import { ChevronDown, Phone } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { CategoryIcon } from "@/components/shared/category-icon";
import { SearchBox } from "@/components/store/search-box";
import { CartButton, CartSheet } from "@/components/store/cart-sheet";
import { MobileMenu } from "@/components/store/mobile-menu";
import { AccountButton } from "@/components/store/account-button";
import { getNavCategories } from "@/server/queries/catalog";
import { getSettings } from "@/server/queries/settings";

export async function Header() {
  const [categories, settings] = await Promise.all([getNavCategories(), getSettings()]);

  return (
    <>
      {settings.announcement ? (
        <div className="bg-primary text-primary-foreground">
          <div className="container-page flex h-9 items-center justify-center gap-6 text-xs font-medium sm:justify-between">
            <p className="truncate">{settings.announcement}</p>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hidden items-center gap-1.5 opacity-90 hover:opacity-100 sm:flex">
              <Phone className="size-3.5" /> {settings.phone}
            </a>
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75">
        <div className="container-page flex h-16 items-center gap-3 lg:h-[72px] lg:gap-8">
          <MobileMenu categories={categories} phone={settings.phone} />
          <Logo className="shrink-0" />
          <SearchBox className="hidden max-w-xl flex-1 md:block" />
          <div className="ms-auto flex items-center gap-0.5">
            <AccountButton />
            <CartButton />
          </div>
        </div>
        <div className="container-page pb-3 md:hidden">
          <SearchBox />
        </div>
        <nav aria-label="Catégories" className="hidden border-t lg:block">
          <ul className="container-page flex h-12 items-center gap-1">
            {categories.map((c) => (
              <li key={c.id} className="group relative">
                <Link
                  href={`/categorie/${c.slug}`}
                  className="flex h-12 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground/80 transition hover:text-primary"
                >
                  <CategoryIcon name={c.icon} className="size-4 text-muted-foreground group-hover:text-primary" />
                  {c.name}
                  {c.children.length ? <ChevronDown className="size-3.5 opacity-60 transition group-hover:rotate-180" /> : null}
                </Link>
                {c.children.length ? (
                  <div className="invisible absolute start-0 top-full z-50 min-w-56 translate-y-1 rounded-2xl border bg-popover p-2 opacity-0 shadow-xl transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {c.children.map((sub) => (
                      <Link key={sub.id} href={`/categorie/${sub.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                        {sub.name}
                      </Link>
                    ))}
                    <Link href={`/categorie/${c.slug}`} className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-muted">
                      Tout voir →
                    </Link>
                  </div>
                ) : null}
              </li>
            ))}
            <li className="ms-auto">
              <Link href="/promotions" className="flex h-12 items-center rounded-md px-3 text-sm font-semibold text-destructive hover:opacity-80">
                Promotions
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <CartSheet shippingFee={settings.shippingFee} freeShippingThreshold={settings.freeShippingThreshold} />
    </>
  );
}
