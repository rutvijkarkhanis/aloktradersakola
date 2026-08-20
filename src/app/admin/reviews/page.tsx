import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/product/star-rating";
import { ReviewActions } from "@/components/admin/review-actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const supabase = createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, product:products!reviews_product_id_fkey(name, slug)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="text-sm text-muted-foreground">Moderate customer reviews. Only approved reviews show on the storefront.</p>
      {!reviews || reviews.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No reviews yet.</div>
      ) : (
        <ul className="mt-5 space-y-3">
          {reviews.map((r: any) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div>
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} size={14} />
                  {r.is_approved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}
                  {r.is_verified_purchase && <Badge variant="secondary">Verified</Badge>}
                </div>
                <p className="mt-1 text-sm font-medium">{r.product?.name} — {r.title || "(no title)"}</p>
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{r.profile?.full_name || "Customer"} · {formatDate(r.created_at)}</p>
              </div>
              <ReviewActions id={r.id} approved={r.is_approved} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
