import { getSiteSettings } from "@/lib/settings";

export async function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings().catch(() => null);
  return (
    <div className="container-wide py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {settings?.business_name || "Alok Traders Akola"} · This page is managed by the store and may be
          updated. For questions contact{" "}
          {settings?.email ? <a href={`mailto:${settings.email}`} className="text-brand underline">{settings.email}</a> : "us"}
          {settings?.phone ? <> or {settings.phone}</> : ""}.
        </p>
        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
