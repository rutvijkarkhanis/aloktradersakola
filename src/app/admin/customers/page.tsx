import { createClient } from "@/lib/supabase/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const supabase = createClient();
  const { data: customers } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">Customers</h1>
      <p className="text-sm text-muted-foreground">{customers?.length ?? 0} registered</p>
      <div className="mt-5 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(customers ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm font-medium">{c.full_name || "—"}</TableCell>
                <TableCell className="text-sm">{c.email}</TableCell>
                <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                <TableCell>{c.role === "admin" ? <Badge variant="brand">Admin</Badge> : <Badge variant="secondary">Customer</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
