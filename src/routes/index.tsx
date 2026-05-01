import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingDown, TrendingUp, Minus, AlertTriangle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { HealthBadge } from "@/components/app/HealthBadge";
import { DEALERS } from "@/data/dealers";
import { computeHealth, formatKpi, latest } from "@/data/health";
import { KPI_META } from "@/data/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dealer Portfolio · MMNA AI Coach" },
      { name: "description", content: "AI-coached portfolio view of dealer performance for district managers." },
    ],
  }),
  component: PortfolioPage,
});

type Filter = "all" | "attention" | "watch" | "on_track" | "improving";

function PortfolioPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const enriched = useMemo(
    () =>
      DEALERS.map((d) => ({ dealer: d, health: computeHealth(d) })).sort(
        (a, b) => a.health.score - b.health.score,
      ),
    [],
  );

  const filtered = enriched.filter(({ dealer, health }) => {
    if (query && !`${dealer.name} ${dealer.city}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "all") return true;
    if (filter === "improving") return health.trend === "up";
    return health.status === filter;
  });

  const summary = useMemo(() => {
    const csi =
      enriched.reduce((s, { dealer }) => s + latest(dealer).csi, 0) / enriched.length;
    const ret1 =
      enriched.reduce((s, { dealer }) => s + latest(dealer).retention1y, 0) / enriched.length;
    const attention = enriched.filter((e) => e.health.status === "attention").length;
    const improving = enriched.filter((e) => e.health.trend === "up").length;
    return { csi, ret1, attention, improving };
  }, [enriched]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">Coaching dashboard</span>
          <h1 className="text-3xl font-semibold tracking-tight">Your dealer portfolio</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AI-ranked by where your coaching attention will move the needle most this month.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="Avg 1-yr retention" value={`${summary.ret1.toFixed(1)}%`} hint={`Target ${KPI_META.retention1y.target}%`} />
          <SummaryCard label="Avg CSI" value={`${summary.csi.toFixed(1)}%`} hint={`Target ${KPI_META.csi.target}%`} />
          <SummaryCard label="Need attention" value={`${summary.attention}`} hint="Dealers below threshold" tone="danger" />
          <SummaryCard label="Trending up" value={`${summary.improving}`} hint="Last 90 days" tone="success" />
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", "attention", "watch", "on_track", "improving"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {f === "all" ? "All" : f === "on_track" ? "On track" : f === "attention" ? "Needs attention" : f === "watch" ? "Watch" : "Improving"}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dealers"
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Dealer</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Trend</th>
                <th className="px-5 py-3 font-medium">Top issue</th>
                <th className="px-5 py-3 font-medium">Last visit</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(({ dealer, health }) => (
                <tr key={dealer.id} className="group transition-colors hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="font-medium">{dealer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {dealer.city}, {dealer.state} · {dealer.district} · {dealer.sizeBand}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <HealthBadge status={health.status} score={health.score} />
                  </td>
                  <td className="px-5 py-4">
                    <TrendChip trend={health.trend} />
                  </td>
                  <td className="px-5 py-4">
                    {health.topIssue ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        <span>
                          <span className="font-medium">{KPI_META[health.topIssue.kpi].label}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            now {formatKpi(health.topIssue.kpi, latest(dealer)[health.topIssue.kpi])}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No flags</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{dealer.lastVisit}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to="/dealers/$dealerId"
                      params={{ dealerId: dealer.id }}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Open <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No dealers match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function TrendChip({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <TrendingUp className="h-3.5 w-3.5" /> Improving
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <TrendingDown className="h-3.5 w-3.5" /> Declining
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="h-3.5 w-3.5" /> Stable
    </span>
  );
}
