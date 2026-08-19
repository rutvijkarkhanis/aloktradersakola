"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AVAILABILITY_OPTIONS, PRODUCT_TYPES } from "@/lib/constants";
import type { Category } from "@/lib/types/database";

const TYPE_LABELS: Record<string, string> = {
  READY_MADE: "Ready made",
  CUSTOM: "Custom",
  READY_MADE_AND_CUSTOM: "Ready made & custom",
  QUOTE_ONLY: "Quote only",
};

export function ShopFilters({
  categories,
  onApplied,
}: {
  categories: Category[];
  onApplied?: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [category, setCategory] = useState(params.get("category") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");
  const [availability, setAvailability] = useState(params.get("availability") ?? "");
  const [productType, setProductType] = useState(params.get("productType") ?? "");
  const [material, setMaterial] = useState(params.get("material") ?? "");
  const [colour, setColour] = useState(params.get("colour") ?? "");

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  function apply() {
    const sp = new URLSearchParams();
    const q = params.get("q");
    const sort = params.get("sort");
    const event = params.get("event");
    if (q) sp.set("q", q);
    if (sort) sp.set("sort", sort);
    if (event) sp.set("event", event);
    if (category) sp.set("category", category);
    if (minPrice) sp.set("minPrice", minPrice);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    if (availability) sp.set("availability", availability);
    if (productType) sp.set("productType", productType);
    if (material) sp.set("material", material);
    if (colour) sp.set("colour", colour);
    router.push(`/shop?${sp.toString()}`);
    onApplied?.();
  }

  function clear() {
    setCategory(""); setMinPrice(""); setMaxPrice(""); setAvailability("");
    setProductType(""); setMaterial(""); setColour("");
    router.push("/shop");
    onApplied?.();
  }

  return (
    <div className="space-y-1">
      <Accordion type="multiple" defaultValue={["category", "price", "availability", "type"]}>
        <AccordionItem value="category">
          <AccordionTrigger>Category</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="cat" checked={category === ""} onChange={() => setCategory("")} /> All
              </label>
              {parents.map((p) => (
                <div key={p.id} className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="radio" name="cat" checked={category === p.slug} onChange={() => setCategory(p.slug)} />
                    {p.name}
                  </label>
                  {childrenOf(p.id).map((c) => (
                    <label key={c.id} className="ml-5 flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" name="cat" checked={category === c.slug} onChange={() => setCategory(c.slug)} />
                      {c.name}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger>Price (₹)</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <span className="text-muted-foreground">—</span>
              <Input type="number" min={0} placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="availability">
          <AccordionTrigger>Availability</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="avail" checked={availability === ""} onChange={() => setAvailability("")} /> Any
              </label>
              {AVAILABILITY_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="avail" checked={availability === o.value} onChange={() => setAvailability(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="type">
          <AccordionTrigger>Product Type</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="ptype" checked={productType === ""} onChange={() => setProductType("")} /> Any
              </label>
              {PRODUCT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="ptype" checked={productType === t} onChange={() => setProductType(t)} />
                  {TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="attrs">
          <AccordionTrigger>Material & Colour</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Material</Label>
                <Input placeholder="e.g. metal" value={material} onChange={(e) => setMaterial(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Colour</Label>
                <Input placeholder="e.g. golden" value={colour} onChange={(e) => setColour(e.target.value)} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex gap-2 pt-3">
        <Button onClick={apply} variant="brand" className="flex-1">Apply</Button>
        <Button onClick={clear} variant="outline">Clear</Button>
      </div>
    </div>
  );
}
