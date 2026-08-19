"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/types/database";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border bg-secondary text-muted-foreground">
        No image
      </div>
    );
  }
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt ?? name} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border bg-secondary",
                i === active ? "ring-2 ring-brand" : "opacity-80 hover:opacity-100",
              )}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? `${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {current.source_page && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Catalogue page {current.source_page}
        </p>
      )}
    </div>
  );
}
