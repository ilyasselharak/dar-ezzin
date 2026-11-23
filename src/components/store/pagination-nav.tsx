import { Link } from "@/i18n/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Crawlable pagination with real <a href> links. */
export function PaginationNav({ page, pageCount, basePath, searchParams }: { page: number; pageCount: number; basePath: string; searchParams: Record<string, string | string[] | undefined> }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    return `${basePath}${sp.size ? `?${sp}` : ""}`;
  };
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="flex size-10 items-center justify-center rounded-full border hover:bg-muted" aria-label="Page précédente">
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn("flex size-10 items-center justify-center rounded-full text-sm font-medium", p === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className="flex size-10 items-center justify-center rounded-full border hover:bg-muted" aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
