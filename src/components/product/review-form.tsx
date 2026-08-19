"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReview } from "@/app/actions/reviews";
import { cn } from "@/lib/utils";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="brand" disabled={pending}>{pending ? "Submitting…" : "Submit review"}</Button>;
}

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [state, action] = useFormState(submitReview, { ok: false, error: null } as any);
  const [rating, setRating] = useState(5);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-4 text-sm">
        Thanks! Your review was submitted and is pending approval.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <Label className="mb-1 block">Your rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} star`}>
              <Star className={cn("h-6 w-6", i <= rating ? "fill-warning text-warning" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Great quality" />
      </div>
      <div>
        <Label htmlFor="comment">Review</Label>
        <Textarea id="comment" name="comment" placeholder="Share your experience with this product" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitBtn />
    </form>
  );
}
