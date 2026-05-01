import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { Dealer, KpiKey } from "@/data/types";
import { KPI_META } from "@/data/types";
import { gapToTarget } from "@/data/health";
import { cn } from "@/lib/utils";

export function KpiTrendCard({
  dealer,
  peers,
  kpi,
}: {
  dealer: Dealer;
  peers: Dealer[];
  kpi: KpiKey;
}) {
  const meta = KPI_META[kpi];
  const data = useMemo(() => {
    return dealer.history.map((p, idx) => {
      const peerAvg =
        peers.reduce((s, peer) => s + (peer.history[idx]?.[kpi] ?? 0), 0) /
        Math.max(1, peers.length);
      return {
        month: p.month.slice(2),
        value: p[kpi],
        peer: Math.round(peerAvg * 10) / 10,
      };
    });
  }, [dealer, peers, kpi]);

  const current = dealer.history[dealer.history.length - 1][kpi];
  const prev = dealer.history[dealer.history.length - 2][kpi];
  const delta = current - prev;
  const gap = gapToTarget(dealer, kpi);
  const behind = gap > 0;

  const fmt = (v: number) =>
    meta.unit === "$" ? `$${(v / 1000).toFixed(0)}k` : `${v.toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{fmt(current)}</span>
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                meta.goodDirection === "up"
                  ? delta >= 0
                    ? "text-success"
                    : "text-danger"
                  : delta <= 0
                  ? "text-success"
                  : "text-danger",
              )}
            >
              {delta >= 0 ? "+" : ""}
              {meta.unit === "$" ? `$${Math.round(delta).toLocaleString()}` : `${delta.toFixed(1)}pt`}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Target {fmt(meta.target)} ·{" "}
            <span className={behind ? "text-danger" : "text-success"}>
              {behind ? "Behind" : "Ahead"} by{" "}
              {meta.unit === "$" ? `$${Math.round(Math.abs(gap)).toLocaleString()}` : `${Math.abs(gap).toFixed(1)}pt`}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${kpi}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.52 0.22 27)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="oklch(0.52 0.22 27)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 256)" vertical={false} />
            <XAxis dataKey="month" stroke="oklch(0.5 0.03 258)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.5 0.03 258)" fontSize={10} tickLine={false} axisLine={false} width={48} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.91 0.012 256)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name) => [fmt(v), name === "peer" ? "Peer avg" : "This dealer"]}
            />
            <ReferenceLine y={meta.target} stroke="oklch(0.5 0.03 258)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="value" stroke="oklch(0.52 0.22 27)" strokeWidth={2} fill={`url(#grad-${kpi})`} />
            <Line type="monotone" dataKey="peer" stroke="oklch(0.5 0.03 258)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}