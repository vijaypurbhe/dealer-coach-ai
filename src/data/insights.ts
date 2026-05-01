import type { Dealer, KpiKey } from "./types";
import { KPI_META } from "./types";
import { computeHealth, gapToTarget, latest } from "./health";

export type InsightTone = "opportunity" | "risk" | "win" | "watch";

export interface DealerInsight {
  tone: InsightTone;
  headline: string;
  detail: string;
  confidence: number; // 0-1
  drivers: string[];
}

function fmt(k: KpiKey, v: number) {
  const meta = KPI_META[k];
  if (meta.unit === "$") return `$${Math.round(v / 1000)}k`;
  return `${v.toFixed(1)}%`;
}

/**
 * Deterministic, rule-based "AI" insight for a dealer.
 * Used to render Einstein-style chips on the portfolio without
 * a server round-trip. The full coach narrative still runs via Gemini.
 */
export function getDealerInsight(dealer: Dealer): DealerInsight {
  const health = computeHealth(dealer);
  const last = latest(dealer);
  const prev = dealer.history[dealer.history.length - 2];
  const m3 = dealer.history.slice(-3);
  const m6 = dealer.history.slice(-6, -3);

  const csiDelta = last.csi - prev.csi;
  const retDelta = last.retention1y - prev.retention1y;
  const partsTrend =
    m3.reduce((s, p) => s + p.partsSales, 0) / 3 - m6.reduce((s, p) => s + p.partsSales, 0) / 3;

  // Win path
  if (health.status === "on_track" && health.trend === "up") {
    return {
      tone: "win",
      headline: `Momentum compounding — replicate playbook`,
      detail: `CSI ${fmt("csi", last.csi)} and retention ${fmt("retention1y", last.retention1y)} both trending up. Capture what's working before peers regress.`,
      confidence: 0.86,
      drivers: ["3-mo CSI ↑", "Retention above target", "Stable parts mix"],
    };
  }

  // Retention risk dominates
  const retGap = gapToTarget(dealer, "retention1y");
  if (retGap > 4 && retDelta < 0) {
    return {
      tone: "risk",
      headline: `Retention slipping — reactivate lapsed owners`,
      detail: `1-yr retention at ${fmt("retention1y", last.retention1y)} (${retGap.toFixed(1)}pt below target) and down ${Math.abs(retDelta).toFixed(1)}pt MoM. Peer top-quartile recovers via 7/30/60-day service touches.`,
      confidence: 0.82,
      drivers: ["Retention −MoM", `Gap ${retGap.toFixed(1)}pt`, "Loaner availability low"],
    };
  }

  // CSI risk
  const csiGap = gapToTarget(dealer, "csi");
  if (csiGap > 3 || csiDelta < -1) {
    return {
      tone: "risk",
      headline: `CSI pressure from service wait times`,
      detail: `CSI ${fmt("csi", last.csi)} (${csiGap > 0 ? `${csiGap.toFixed(1)}pt below target` : "near target"}). Recent reviews flag wait time and communication — advisor coaching has +3pt lift in similar dealers.`,
      confidence: 0.78,
      drivers: ["CSI ↓", "Review themes: wait", "Advisor headcount −1"],
    };
  }

  // Parts/accessory opportunity
  if (partsTrend < -2000 || gapToTarget(dealer, "partsSales") > 8000) {
    return {
      tone: "opportunity",
      headline: `Parts attach softening — recover $${Math.round(Math.max(8000, -partsTrend) / 1000)}k`,
      detail: `Parts sales trending ${partsTrend < 0 ? "down" : "flat"} vs prior 3-mo. Menu pricing refresh + accessory bundle at delivery has ~6% lift in peer set.`,
      confidence: 0.74,
      drivers: ["Parts 3-mo ↓", "Accessory attach <peer", "PHEV mix growing"],
    };
  }

  // Improving but not yet on-track
  if (health.trend === "up") {
    return {
      tone: "win",
      headline: `Recovery underway — protect the gains`,
      detail: `Composite health up over 90 days. Lock in retention process and revisit warranty leakage before next quarter.`,
      confidence: 0.7,
      drivers: ["Health ↑ 90d", "Actions worked +2", "Warranty stable"],
    };
  }

  return {
    tone: "watch",
    headline: `Mixed signals — confirm on next visit`,
    detail: `No single KPI dominates. Worth a 20-min walk of service drive and a sample of last-30-day RO surveys.`,
    confidence: 0.6,
    drivers: ["Flat trend", "Within peer band", "Few outliers"],
  };
}
