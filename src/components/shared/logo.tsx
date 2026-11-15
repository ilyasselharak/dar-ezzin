import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-9", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path d="M20 50V30a12 12 0 0 1 24 0v20" fill="none" className="stroke-brass" strokeWidth="5" strokeLinecap="round" />
      <path d="M27 50V34a5 5 0 0 1 10 0v16" className="fill-brass" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="Dar Ezzin — accueil">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-extrabold tracking-tight">DAR EZZIN</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Électroménager</span>
      </span>
    </Link>
  );
}
