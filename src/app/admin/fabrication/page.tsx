import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { FabricationControl } from "@/components/admin/fabrication-control";
import { formatINR, formatDate } from "@/lib/utils";
import { FABRICATION_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminFabricationPage() {
  const supabase = createClient();
  const { data: requests } = await supabase
    .from("custom_fabrication_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">Fabrication Enquiries</h1>
      <p className="text-sm text-muted-foreground">{requests?.length ?? 0} enquiries</p>

      {!requests || requests.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No enquiries yet.</div>
      ) : (
        <div className="mt-5 space-y-4">
          {requests.map((r: any) => (
            <div key={r.id} className="grid gap-4 rounded-lg border bg-card p-5 lg:grid-cols-[1fr_240px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.request_number}</span>
                  <Badge variant="secondary">{FABRICATION_STATUS_LABELS[r.status as keyof typeof FABRICATION_STATUS_LABELS]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <Info label="Name" value={r.name} />
                  <Info label="Phone" value={r.phone} />
                  {r.email && <Info label="Email" value={r.email} />}
                  {r.event_type && <Info label="Event" value={r.event_type} />}
                  {r.product_required && <Info label="Product" value={r.product_required} />}
                  {r.dimensions && <Info label="Dimensions" value={r.dimensions} />}
                  {r.quantity && <Info label="Quantity" value={String(r.quantity)} />}
                  {r.material && <Info label="Material" value={r.material} />}
                  {r.colour && <Info label="Colour" value={r.colour} />}
                  {r.finish && <Info label="Finish" value={r.finish} />}
                  {r.required_date && <Info label="Required by" value={formatDate(r.required_date)} />}
                  {r.budget != null && <Info label="Budget" value={formatINR(r.budget)} />}
                </div>
                {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
              </div>
              <FabricationControl id={r.id} current={r.status} notes={r.admin_notes} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <p><span className="text-muted-foreground">{label}:</span> <span className="font-medium">{value}</span></p>;
}
