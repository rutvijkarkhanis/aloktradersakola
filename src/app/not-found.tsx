import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-wide flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-black text-brand">404</p>
      <h1 className="mt-3 text-xl font-bold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="brand"><Link href="/">Go home</Link></Button>
        <Button asChild variant="outline"><Link href="/shop">Shop products</Link></Button>
      </div>
    </div>
  );
}
