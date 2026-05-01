import { createFileRoute } from "@tanstack/react-router";
import { Database, FileSpreadsheet, Upload, CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { DEALERS } from "@/data/dealers";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Sources · MMNA AI Coach" },
      { name: "description", content: "Connected dealer data sources powering the AI coach." },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">Data foundation</span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Where the AI Coach gets its data</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            For this PoC the AI Coach is fed by mock dealer extracts shaped to mirror MMNA's warehouse. When real Excel/CSV extracts arrive, they
            drop into the same schema and the rest of the experience continues to work unchanged.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SourceCard icon={<Database />} title="MMNA SQL Server" desc="Primary KPI warehouse — Urban Science + DMS feeds" status="Mocked" />
          <SourceCard icon={<FileSpreadsheet />} title="Reputation CSI" desc="Survey results post-service visit" status="Mocked" />
          <SourceCard icon={<FileSpreadsheet />} title="Action Plan log" desc="Historical action plans + outcomes" status="Mocked" />
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-3 text-sm font-medium">Upload MMNA Excel extract</div>
          <p className="mt-1 text-xs text-muted-foreground">.xlsx or .csv — wires into the same schema as the mock data above.</p>
          <button className="mt-4 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Choose file
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground">Demo placeholder — wire to parser when real extracts arrive.</p>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Loaded dealers ({DEALERS.length})</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-4 py-2.5 font-medium">Dealer</th>
                  <th className="px-4 py-2.5 font-medium">Region</th>
                  <th className="px-4 py-2.5 font-medium">Months of history</th>
                  <th className="px-4 py-2.5 font-medium">Action records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEALERS.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.id}</td>
                    <td className="px-4 py-2.5">{d.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{d.region}</td>
                    <td className="px-4 py-2.5 tabular-nums">{d.history.length}</td>
                    <td className="px-4 py-2.5 tabular-nums">{d.actions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function SourceCard({ icon, title, desc, status }: { icon: React.ReactNode; title: string; desc: string; status: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning-foreground">
          <CheckCircle2 className="h-3 w-3" /> {status}
        </span>
      </div>
      <div className="mt-3 font-medium text-sm">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}