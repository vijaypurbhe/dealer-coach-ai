import type { Dealer, KpiPoint, KpiKey, ActionPlan } from "./types";
import { KPI_META } from "./types";

function months(count: number): string[] {
  const out: string[] = [];
  const d = new Date(2026, 3, 1); // April 2026 anchor
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(dt.toISOString().slice(0, 7));
  }
  return out;
}

// Seeded pseudo-random for stable mock data
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Profile {
  id: string;
  name: string;
  city: string;
  state: string;
  region: Dealer["region"];
  district: string;
  sizeBand: Dealer["sizeBand"];
  modelMix: string[];
  archetype: "star" | "struggler_csi" | "struggler_retention" | "average" | "improving" | "parts_drag";
  seed: number;
}

const profiles: Profile[] = [
  { id: "d-101", name: "Pacific Mitsubishi of Long Beach", city: "Long Beach", state: "CA", region: "West", district: "West-1", sizeBand: "Large", modelMix: ["Outlander", "Eclipse Cross", "Mirage"], archetype: "star", seed: 11 },
  { id: "d-102", name: "Sunset Mitsubishi", city: "Phoenix", state: "AZ", region: "West", district: "West-2", sizeBand: "Mid", modelMix: ["Outlander", "Mirage"], archetype: "struggler_csi", seed: 22 },
  { id: "d-103", name: "Rocky Mountain Mitsubishi", city: "Denver", state: "CO", region: "Central", district: "Central-1", sizeBand: "Mid", modelMix: ["Outlander", "Outlander Sport"], archetype: "struggler_retention", seed: 33 },
  { id: "d-104", name: "Heartland Mitsubishi", city: "Kansas City", state: "MO", region: "Central", district: "Central-2", sizeBand: "Small", modelMix: ["Mirage", "Outlander Sport"], archetype: "average", seed: 44 },
  { id: "d-105", name: "Lakeshore Mitsubishi", city: "Chicago", state: "IL", region: "Central", district: "Central-3", sizeBand: "Large", modelMix: ["Outlander", "Eclipse Cross", "Outlander PHEV"], archetype: "improving", seed: 55 },
  { id: "d-106", name: "Atlantic Mitsubishi of Tampa", city: "Tampa", state: "FL", region: "East", district: "East-1", sizeBand: "Mid", modelMix: ["Outlander", "Mirage"], archetype: "parts_drag", seed: 66 },
  { id: "d-107", name: "Liberty Mitsubishi", city: "Edison", state: "NJ", region: "East", district: "East-2", sizeBand: "Large", modelMix: ["Outlander", "Eclipse Cross"], archetype: "average", seed: 77 },
  { id: "d-108", name: "Coastal Mitsubishi of Charleston", city: "Charleston", state: "SC", region: "East", district: "East-3", sizeBand: "Small", modelMix: ["Mirage", "Outlander Sport"], archetype: "improving", seed: 88 },
];

function generateHistory(p: Profile): KpiPoint[] {
  const rand = mulberry32(p.seed);
  const ms = months(12);
  const baseline: Record<KpiKey, number> = {
    retention1y: 65,
    retention7y: 35,
    partsSales: 95000,
    accessorySales: 22000,
    csi: 90,
    warrantyLeakage: 12,
  };
  const drift: Partial<Record<KpiKey, number>> = {};
  const noise = (k: KpiKey) => (rand() - 0.5) * (KPI_META[k].unit === "$" ? 4000 : 2);

  switch (p.archetype) {
    case "star":
      Object.keys(baseline).forEach((k) => (drift[k as KpiKey] = (k === "warrantyLeakage" ? -1 : 1) * 0.4));
      baseline.retention1y = 72; baseline.retention7y = 41; baseline.csi = 94; baseline.partsSales = 118000; baseline.accessorySales = 28000; baseline.warrantyLeakage = 8;
      break;
    case "struggler_csi":
      baseline.csi = 86; drift.csi = -0.6; baseline.retention1y = 60; drift.retention1y = -0.3;
      break;
    case "struggler_retention":
      baseline.retention1y = 56; baseline.retention7y = 28; drift.retention1y = -0.5; drift.retention7y = -0.3; baseline.warrantyLeakage = 16; drift.warrantyLeakage = 0.4;
      break;
    case "parts_drag":
      baseline.partsSales = 72000; baseline.accessorySales = 14000; drift.partsSales = -1500; drift.accessorySales = -300;
      break;
    case "improving":
      baseline.retention1y = 60; baseline.csi = 88; drift.retention1y = 0.6; drift.csi = 0.4; drift.partsSales = 1200;
      break;
    case "average":
    default:
      break;
  }

  return ms.map((m, i) => {
    const point: any = { month: m };
    (Object.keys(baseline) as KpiKey[]).forEach((k) => {
      const v = baseline[k] + (drift[k] ?? 0) * i + noise(k);
      point[k] = KPI_META[k].unit === "$" ? Math.max(0, Math.round(v)) : Math.max(0, Math.round(v * 10) / 10);
    });
    return point as KpiPoint;
  });
}

function generateActions(p: Profile): ActionPlan[] {
  const rand = mulberry32(p.seed + 1);
  const templates: Omit<ActionPlan, "id" | "date" | "outcome">[] = [
    { title: "Service follow-up call campaign", category: "Retention", description: "Outbound calls to customers 30 days post-service to capture rebooking intent.", liftPct: 4 },
    { title: "First-service free oil change voucher", category: "Retention", description: "Issued vouchers to all new vehicle buyers for complimentary first oil change.", liftPct: 6 },
    { title: "Service advisor CSI coaching", category: "CSI", description: "Two-day workshop on customer-pay write-up and expectation setting.", liftPct: 3 },
    { title: "Loaner vehicle program", category: "CSI", description: "Expanded loaner fleet to reduce service wait complaints.", liftPct: 5 },
    { title: "Accessory display refresh", category: "Accessories", description: "Showroom display updated with high-margin accessory bundles.", liftPct: 8 },
    { title: "Parts counter cross-sell training", category: "Parts", description: "Trained parts staff on attaching wear items to RO write-ups.", liftPct: 7 },
    { title: "Warranty claim audit", category: "Warranty", description: "Identified leakage to independent shops; targeted recall campaign.", liftPct: 4 },
    { title: "Service lane facility refresh", category: "Facility", description: "Refreshed service drive seating, signage, coffee bar.", liftPct: 2 },
    { title: "Digital service scheduler launch", category: "Retention", description: "Replaced phone-only booking with web/SMS scheduling.", liftPct: 9 },
  ];
  const count = 8 + Math.floor(rand() * 5);
  const outcomes: ActionPlan["outcome"][] = ["worked", "worked", "no_change", "negative", "in_progress"];
  const result: ActionPlan[] = [];
  for (let i = 0; i < count; i++) {
    const t = templates[Math.floor(rand() * templates.length)];
    const monthsAgo = Math.floor(rand() * 11) + 1;
    const dt = new Date(2026, 3 - monthsAgo, 5 + Math.floor(rand() * 20));
    const outcome = outcomes[Math.floor(rand() * outcomes.length)];
    result.push({
      id: `${p.id}-a${i}`,
      date: dt.toISOString().slice(0, 10),
      title: t.title,
      category: t.category,
      description: t.description,
      outcome,
      liftPct: outcome === "worked" ? t.liftPct : outcome === "negative" ? -2 : 0,
    });
  }
  return result.sort((a, b) => (a.date < b.date ? 1 : -1));
}

const facilityByArchetype: Record<Profile["archetype"], string[]> = {
  star: ["Recently refreshed showroom", "Service drive well-staffed at peak", "Strong front-of-house signage"],
  struggler_csi: ["Customer waiting area showing wear", "Service writers stretched at 8–10am peak", "Coffee bar frequently empty"],
  struggler_retention: ["Limited evening service hours", "No active loaner program", "Outdated email comms templates"],
  average: ["Facility meets brand standards", "Some signage faded on service entrance"],
  improving: ["Recent paint and signage refresh", "New hire on service desk reducing wait"],
  parts_drag: ["Parts counter not visible from service lane", "Accessory display dated", "Limited online accessory presence"],
};

export const DEALERS: Dealer[] = profiles.map((p) => ({
  id: p.id,
  name: p.name,
  city: p.city,
  state: p.state,
  region: p.region,
  district: p.district,
  sizeBand: p.sizeBand,
  modelMix: p.modelMix,
  lastVisit: new Date(2026, 2, 5 + (p.seed % 20)).toISOString().slice(0, 10),
  history: generateHistory(p),
  actions: generateActions(p),
  context: {
    facilityNotes: facilityByArchetype[p.archetype],
    online: {
      googleRating: p.archetype === "star" ? 4.7 : p.archetype === "struggler_csi" ? 3.6 : p.archetype === "improving" ? 4.2 : 4.0,
      reviewCount: 80 + (p.seed % 7) * 30,
      recentThemes:
        p.archetype === "struggler_csi"
          ? ["Long wait times", "Communication gaps", "Friendly staff"]
          : p.archetype === "parts_drag"
          ? ["Limited accessory selection", "Helpful parts staff", "Online order issues"]
          : p.archetype === "star"
          ? ["Quick turnaround", "Transparent pricing", "Comfortable lounge"]
          : ["Mixed service experience", "Knowledgeable advisors"],
      source: p.id === "d-101" ? "google_places" : "mock",
    },
    accessibility:
      p.archetype === "parts_drag"
        ? "Located off secondary highway; signage from main road is limited."
        : "Easy access from interstate with strong directional signage.",
    staffingNotes:
      p.archetype === "struggler_csi"
        ? "Two service advisor vacancies open >60 days."
        : p.archetype === "star"
        ? "Tenured service team, low turnover."
        : "Stable team, average tenure 3 years.",
  },
  peerIds: [],
}));

// Build peer groups: same region + size band (excluding self)
for (const d of DEALERS) {
  d.peerIds = DEALERS.filter((x) => x.id !== d.id && x.region === d.region).slice(0, 5).map((x) => x.id);
  if (d.peerIds.length < 3) {
    d.peerIds = DEALERS.filter((x) => x.id !== d.id && x.sizeBand === d.sizeBand).slice(0, 5).map((x) => x.id);
  }
}

export function getDealer(id: string): Dealer | undefined {
  return DEALERS.find((d) => d.id === id);
}