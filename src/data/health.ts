import type { Dealer, DealerHealth, KpiKey } from "./types";
import { KPI_META } from "./types";

export function latest(dealer: Dealer) {
  return dealer.history[dealer.history.length - 1];
}

export function gapToTarget(dealer: Dealer, k: KpiKey): number {
  const v = latest(dealer)[k];
  const meta = KPI_META[k];
  // Positive gap = behind target, negative = ahead
  return meta.goodDirection === "up" ? meta.target - v : v - meta.target;
}

export function computeHealth(dealer: Dealer): DealerHealth {
  const kpis = Object.keys(KPI_META) as KpiKey[];
  let score = 100;
  let worst: { kpi: KpiKey; gap: number } | null = null;

  for (const k of kpis) {
    const meta = KPI_META[k];
    const v = latest(dealer)[k];
    const range = meta.unit === "$" ? meta.target * 0.4 : meta.goodDirection === "up" ? 30 : 15;
    const gap = gapToTarget(dealer, k);
    if (gap > 0) {
      const penalty = Math.min(20, (gap / range) * 20);
      score -= penalty;
      if (!worst || gap / range > worst.gap / range) worst = { kpi: k, gap };
    }
  }
  score = Math.max(0, Math.round(score));

  const status: DealerHealth["status"] = score >= 80 ? "on_track" : score >= 60 ? "watch" : "attention";

  // Trend: compare last 3 months CSI+retention vs previous 3
  const slice = (start: number, end: number) =>
    dealer.history.slice(start, end).reduce((a, p) => a + p.csi + p.retention1y, 0) / Math.max(1, end - start);
  const recent = slice(9, 12);
  const prev = slice(6, 9);
  const diff = recent - prev;
  const trend: DealerHealth["trend"] = diff > 1 ? "up" : diff < -1 ? "down" : "flat";

  return { score, status, topIssue: worst, trend };
}

export function formatKpi(k: KpiKey, v: number): string {
  const meta = KPI_META[k];
  if (meta.unit === "$") return `$${Math.round(v).toLocaleString()}`;
  return `${v.toFixed(1)}%`;
}

export function statusLabel(s: DealerHealth["status"]): string {
  return s === "on_track" ? "On track" : s === "watch" ? "Watch" : "Needs attention";
}