"use client";

import { useState } from "react";
import { Loader2, PackageOpen, FileUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { importBundledCatalogue, importCsv } from "@/app/actions/admin";

type Report = { imported: number; updated: number; failed: number; skipped: number; warnings: string[] };

export default function ImportCataloguePage() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  async function runBundled() {
    setBusy(true); setReport(null);
    try {
      const res = await importBundledCatalogue();
      setReport(res.report);
      toast[res.ok ? "success" : "error"](res.ok ? "Catalogue imported" : "Import finished with errors");
    } catch {
      toast.error("Import failed");
    }
    setBusy(false);
  }

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setReport(null);
    const text = await file.text();
    try {
      const res = await importCsv(text);
      setReport(res.report);
      toast[res.ok ? "success" : "error"](res.ok ? "CSV imported" : "CSV import finished with warnings");
    } catch {
      toast.error("CSV import failed");
    }
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Import Catalogue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Load the products supplied in your Fabrication catalogue, or upload your own CSV.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <PackageOpen className="h-6 w-6 text-brand" />
          <h2 className="mt-3 font-semibold">Bundled Fabrication catalogue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Imports the 37 products &amp; 14 categories extracted from Fabrication.pdf, with catalogue
            images. Existing products (matched by slug) are updated.
          </p>
          <Button onClick={runBundled} variant="brand" className="mt-4" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageOpen className="h-4 w-4" />} Import bundled catalogue
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            For full Supabase Storage upload of images, run <code className="rounded bg-muted px-1">npm run db:import</code>.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <FileUp className="h-6 w-6 text-brand" />
          <h2 className="mt-3 font-semibold">Upload CSV</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Columns: <code className="text-xs">name, price_inr, specifications, category, sku</code>.
            Rows with no price import as quote-only.
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80">
            <FileUp className="h-4 w-4" /> Choose CSV file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onCsv} disabled={busy} />
          </label>
        </div>
      </div>

      {report && (
        <div className="mt-6 rounded-lg border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            {report.failed === 0 ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
            Import Report
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Imported" value={report.imported} />
            <Stat label="Updated" value={report.updated} />
            <Stat label="Skipped" value={report.skipped} />
            <Stat label="Failed" value={report.failed} tone={report.failed ? "bad" : undefined} />
          </div>
          {report.warnings.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">Warnings ({report.warnings.length})</p>
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                {report.warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "bad" }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className={`text-xl font-bold ${tone === "bad" ? "text-destructive" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
