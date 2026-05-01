import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, ArrowUpRight, TrendingDown, TrendingUp, Minus, Search, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { HealthBadge } from "@/components/app/HealthBadge";
import { Sparkline } from "@/components/app/Sparkline";
import { InsightChip } from "@/components/app/InsightChip";
import { DEALERS } from "@/data/dealers";
import { computeHealth, latest } from "@/data/health";
import { getDealerInsight } from "@/data/insights";
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
type SortKey = "score" | "name" | "csi" | "retention1y" | "lastVisit";
type Region = "all" | "West" | "Central" | "East";
type Size = "all" | "Small" | "Mid" | "Large";

function PortfolioPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region>("all");
  const [size, setSize] = useState<Size>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const enriched = useMemo(
    () => DEALERS.map((d) => ({ dealer: d, health: computeHealth(d), insight: getDealerInsight(d) })),
    [],
  );

  const filtered = useMemo(() => {
    const rows = enriched.filter(({ dealer, health }) => {
      if (query && !`${dealer.name} ${dealer.city} ${dealer.state}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (region !== "all" && dealer.region !== region) return false;
      if (size !== "all" && dealer.sizeBand !== size) return false;
      if (filter === "all") return true;
      if (filter === "improving") return health.trend === "up";
      return health.status === filter;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const get = (e: typeof a) => {
        switch (sortKey) {
          case "name": return e.dealer.name;
          case "csi": return latest(e.dealer).csi;
          case "retention1y": return latest(e.dealer).retention1y;
          case "lastVisit": return e.dealer.lastVisit;
          default: return e.health.score;
        }
      };
      const av = get(a); const bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }, [enriched, query, region, size, filter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" || k === "lastVisit" ? "asc" : "asc"); }
  };

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

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="Avg 1-yr retention" value={`${summary.ret1.toFixed(1)}%`} hint={`Target ${KPI_META.retention1y.target}%`} />
          <SummaryCard label="Avg CSI" value={`${summary.csi.toFixed(1)}%`} hint={`Target ${KPI_META.csi.target}%`} />
          <SummaryCard label="Need attention" value={`${summary.attention}`} hint="Dealers below threshold" tone="danger" />
          <SummaryCard label="Trending up" value={`${summary.improving}`} hint="Last 90 days" tone="success" />
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
                {f === "all" ? `All (${enriched.length})` : f === "on_track" ? "On track" : f === "attention" ? "Needs attention" : f === "watch" ? "Watch" : "Improving"}
              </button>
            ))}
            <div className="mx-2 h-5 w-px bg-border" />
            <FacetSelect label="Region" value={region} onChange={(v) => setRegion(v as Region)} options={["all", "West", "Central", "East"]} />
            <FacetSelect label="Size" value={size} onChange={(v) => setSize(v as Size)} options={["all", "Small", "Mid", "Large"]} />
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dealers"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mb-3 text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {enriched.length} dealers
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <SortHeader label="Dealer" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortHeader label="Health" k="score" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="px-4 py-3 font-medium">90-day trend</th>
                <th className="px-4 py-3 font-medium">AI insight</th>
                <SortHeader label="CSI" k="csi" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="1-yr Ret." k="retention1y" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="Last visit" k="lastVisit" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(({ dealer, health, insight }, i) => {
                const last = latest(dealer);
                const csiSeries = dealer.history.map((p) => p.csi);
                return (
                  <tr
                    key={dealer.id}
                    className="group row-stagger transition-colors hover:bg-muted/30"
                    style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                  >
                    <td className="px-4 py-3">
                      <Link to="/dealers/$dealerId" params={{ dealerId: dealer.id }} className="font-medium hover:text-primary">
                        {dealer.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {dealer.city}, {dealer.state} · {dealer.region} · {dealer.sizeBand}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge status={health.status} score={health.score} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20"><Sparkline values={csiSeries} tone={health.trend === "down" ? "danger" : health.trend === "up" ? "success" : "muted"} /></div>
                        <TrendChip trend={health.trend} compact />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[280px]">
                        <InsightChip insight={insight} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{last.csi.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{last.retention1y.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{dealer.lastVisit}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/dealers/$dealerId"
                        params={{ dealerId: dealer.id }}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-60 transition-opacity group-hover:opacity-100"
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
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

function TrendChip({ trend, compact }: { trend: "up" | "down" | "flat"; compact?: boolean }) {
  const cls = "inline-flex items-center gap-1 text-xs";
  if (trend === "up")
    return (
      <span className={cn(cls, "text-success")}>
        <TrendingUp className="h-3 w-3" /> {compact ? "Up" : "Improving"}
      </span>
    );
  if (trend === "down")
    return (
      <span className={cn(cls, "text-danger")}>
        <TrendingDown className="h-3 w-3" /> {compact ? "Down" : "Declining"}
      </span>
    );
  return (
    <span className={cn(cls, "text-muted-foreground")}>
      <Minus className="h-3 w-3" /> {compact ? "Flat" : "Stable"}
    </span>
  );
}

function FacetSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "all" ? "All" : o}</option>
        ))}
      </select>
    </label>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === k;
  return (
    <th className={cn("px-4 py-3 font-medium", align === "right" && "text-right")}>
      <button
        onClick={() => onClick(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
        {active && <span className="text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
