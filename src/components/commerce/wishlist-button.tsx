"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

export function WishlistButton({
  productId,
  className,
  showLabel = false,
}: {
  productId: string;
  className?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: row } = await supabase
          .from("wishlist_items")
          .select("id")
          .eq("user_id", uid)
          .eq("product_id", productId)
          .maybeSingle();
        setActive(!!row);
      }
    });
  }, [productId]);

  async function toggle() {
    if (!userId) {
      toast.info("Please log in to save to your wishlist");
      router.push("/login?redirect=/shop");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    if (active) {
      await supabase.from("wishlist_items").delete().eq("user_id", userId).eq("product_id", productId);
      setActive(false);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist_items").insert({ user_id: userId, product_id: productId });
      setActive(true);
      toast.success("Saved to wishlist");
    }
    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "default" : "icon"}
      className={cn(className)}
      onClick={toggle}
      aria-label="Add to wishlist"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", active && "fill-brand text-brand")} />
      )}
      {showLabel && (active ? "Saved" : "Wishlist")}
    </Button>
  );
}
