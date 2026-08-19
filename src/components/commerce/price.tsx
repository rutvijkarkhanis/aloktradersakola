import { formatINR, cn } from "@/lib/utils";

export function Price({
  price,
  salePrice,
  isQuoteOnly,
  className,
  size = "md",
}: {
  price: number | null;
  salePrice?: number | null;
  isQuoteOnly?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  } as const;

  if (isQuoteOnly || price == null) {
    return <span className={cn("font-semibold text-brand", sizes[size], className)}>Price on request</span>;
  }

  const onSale = salePrice != null && salePrice > 0 && salePrice < price;
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-bold text-foreground", sizes[size])}>
        {formatINR(onSale ? salePrice! : price)}
      </span>
      {onSale && (
        <span className="text-sm font-medium text-muted-foreground line-through">{formatINR(price)}</span>
      )}
    </span>
  );
}
