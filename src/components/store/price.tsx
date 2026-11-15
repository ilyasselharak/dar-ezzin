import { discountPercent, formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  price,
  compareAtPrice,
  size = "md",
  className,
}: {
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const off = discountPercent(price, compareAtPrice);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-heading font-bold tabular-nums",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-3xl",
          off && "text-destructive",
        )}
      >
        {formatPrice(price)}
      </span>
      {off && compareAtPrice ? (
        <span className={cn("text-muted-foreground line-through tabular-nums", size === "lg" ? "text-lg" : "text-sm")}>
          {formatPrice(compareAtPrice)}
        </span>
      ) : null}
    </div>
  );
}
