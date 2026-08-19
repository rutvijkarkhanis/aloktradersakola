import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ProductActions } from "@/components/admin/product-actions";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: { filter?: string; q?: string } }) {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*, category:categories(name), images:product_images(url, is_primary)")
    .order("created_at", { ascending: false });
  if (searchParams.q) query = query.ilike("name", `%${searchParams.q}%`);
  const { data: products } = await query;

  let list = (products as any[]) ?? [];
  if (searchParams.filter === "low") list = list.filter((p) => !p.is_quote_only && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{list.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/admin/products/import"><Upload className="h-4 w-4" /> Import</Link></Button>
          <Button asChild variant="brand"><Link href="/admin/products/new"><Plus className="h-4 w-4" /> Add Product</Link></Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => {
              const img = p.images?.find((i: any) => i.is_primary) ?? p.images?.[0];
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-secondary">
                        {img ? <img src={img.url} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-sm">{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{p.is_quote_only ? "Quote" : formatINR(p.price)}</TableCell>
                  <TableCell className="text-sm">{p.is_quote_only ? "—" : p.stock_quantity}</TableCell>
                  <TableCell>
                    {p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}
                  </TableCell>
                  <TableCell><ProductActions id={p.id} isActive={p.is_active} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {list.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No products. <Link href="/admin/products/import" className="text-brand underline">Import the catalogue</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
