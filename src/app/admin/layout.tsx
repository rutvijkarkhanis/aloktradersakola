import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?redirect=/admin");

  return (
    <div className="container-wide py-6">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <div className="sticky top-24 rounded-lg border bg-card p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
            <AdminNav />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
