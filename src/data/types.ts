export type KpiKey =
  | "retention1y"
  | "retention7y"
  | "partsSales"
  | "accessorySales"
  | "csi"
  | "warrantyLeakage";

export const KPI_META: Record<
  KpiKey,
  { label: string; unit: "%" | "$"; goodDirection: "up" | "down"; target: number }
> = {
  retention1y: { label: "1-Year Retention", unit: "%", goodDirection: "up", target: 65 },
  retention7y: { label: "7-Year Retention", unit: "%", goodDirection: "up", target: 35 },
  partsSales: { label: "Parts Sales (monthly)", unit: "$", goodDirection: "up", target: 95000 },
  accessorySales: { label: "Accessory Sales (monthly)", unit: "$", goodDirection: "up", target: 22000 },
  csi: { label: "Customer Satisfaction (CSI)", unit: "%", goodDirection: "up", target: 90 },
  warrantyLeakage: { label: "Warranty Leakage", unit: "%", goodDirection: "down", target: 12 },
};

export type KpiPoint = { month: string } & Record<KpiKey, number>;

export type ActionOutcome = "worked" | "no_change" | "negative" | "in_progress";

export interface ActionPlan {
  id: string;
  date: string;
  title: string;
  category: "Retention" | "Parts" | "Accessories" | "CSI" | "Warranty" | "Facility";
  description: string;
  outcome: ActionOutcome;
  liftPct?: number;
}

export interface ContextSignals {
  facilityNotes: string[];
  online: {
    googleRating: number;
    reviewCount: number;
    recentThemes: string[];
    source: "mock" | "google_places";
  };
  accessibility: string;
  staffingNotes: string;
}

export interface Dealer {
  id: string;
  name: string;
  city: string;
  state: string;
  region: "West" | "Central" | "East";
  district: string;
  sizeBand: "Small" | "Mid" | "Large";
  modelMix: string[];
  lastVisit: string;
  history: KpiPoint[];
  actions: ActionPlan[];
  context: ContextSignals;
  peerIds: string[];
}

export type Health = "on_track" | "watch" | "attention";

export interface DealerHealth {
  score: number; // 0-100
  status: Health;
  topIssue: { kpi: KpiKey; gap: number } | null;
  trend: "up" | "down" | "flat";
}