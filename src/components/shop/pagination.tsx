import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageCount,
  searchParams,
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const build = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") sp.set(k, v);
    });
    sp.set("page", String(p));
    return `/shop?${sp.toString()}`;
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <div className="mt-8 flex items-center justify-center gap-1">
      <Button asChild variant="outline" size="sm" disabled={page <= 1}>
        <Link href={build(Math.max(1, page - 1))} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Link>
      </Button>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const gap = prev && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {gap && <span className="px-1 text-muted-foreground">…</span>}
            <Button asChild variant={p === page ? "brand" : "outline"} size="sm">
              <Link href={build(p)}>{p}</Link>
            </Button>
          </span>
        );
      })}
      <Button asChild variant="outline" size="sm" disabled={page >= pageCount}>
        <Link href={build(Math.min(pageCount, page + 1))} aria-label="Next"><ChevronRight className="h-4 w-4" /></Link>
      </Button>
    </div>
  );
}
