import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Calendar, Users, Building2, Star, Globe, MessageSquare, AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { HealthBadge } from "@/components/app/HealthBadge";
import { KpiTrendCard } from "@/components/app/KpiTrendCard";
import { Sparkline } from "@/components/app/Sparkline";
import { CoachInsightsPanel } from "@/components/app/CoachInsights";
import { CoachChat } from "@/components/app/CoachChat";
import { DEALERS, getDealer } from "@/data/dealers";
import { computeHealth, formatKpi, gapToTarget, latest } from "@/data/health";
import { KPI_META, type KpiKey } from "@/data/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dealers/$dealerId")({
  loader: ({ params }) => {
    const dealer = getDealer(params.dealerId);
    if (!dealer) throw notFound();
    return { dealer };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.dealer.name ?? "Dealer"} · MMNA AI Coach` },
      { name: "description", content: `AI coaching insights for ${loaderData?.dealer.name ?? "dealer"}.` },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Dealer not found</h2>
        <Link to="/" className="mt-3 inline-block text-sm text-primary">Back to portfolio</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center text-sm text-muted-foreground">
        <p>Couldn't load dealer.</p>
        <p className="mt-2">{error.message}</p>
      </div>
    </div>
  ),
  component: DealerPage,
});

const KPI_GRID: KpiKey[] = ["retention1y", "retention7y", "csi", "partsSales", "accessorySales", "warrantyLeakage"];
const KPI_STRIP: KpiKey[] = ["retention1y", "csi", "partsSales", "warrantyLeakage"];

function DealerPage() {
  const { dealer } = Route.useLoaderData();
  const peers = DEALERS.filter((d) => dealer.peerIds.includes(d.id));
  const health = computeHealth(dealer);
  const [chatOpen, setChatOpen] = useState(false);
  const last = latest(dealer);
  const prev = dealer.history[dealer.history.length - 2];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-7xl px-6 pt-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4 pb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight">{dealer.name}</h1>
                <HealthBadge status={health.status} score={health.score} />
                <TrendChip trend={health.trend} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {dealer.city}, {dealer.state}</span>
                <span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {dealer.region} · {dealer.district} · {dealer.sizeBand}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Last visit {dealer.lastVisit}</span>
                <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" /> {peers.length} peers</span>
              </div>
            </div>
            <Sheet open={chatOpen} onOpenChange={setChatOpen}>
              <SheetTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                  <MessageSquare className="h-4 w-4" /> Coach chat
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full p-0 sm:max-w-md">
                <div className="h-full p-4">
                  <CoachChat dealerId={dealer.id} dealerName={dealer.name} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-3 md:grid-cols-4">
            {KPI_STRIP.map((k) => (
              <KpiStripItem key={k} kpi={k} value={last[k]} prev={prev[k]} dealer={dealer} />
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 h-10 w-full justify-start overflow-x-auto bg-transparent p-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-muted">Overview</TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-muted">KPI trends</TabsTrigger>
            <TabsTrigger value="coach" className="data-[state=active]:bg-muted">AI Coach</TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-muted">Actions ({dealer.actions.length})</TabsTrigger>
            <TabsTrigger value="context" className="data-[state=active]:bg-muted">Context</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <SectionTitle>Top focus areas</SectionTitle>
                <FocusCards dealer={dealer} />
              </section>
              <section>
                <SectionTitle>Quick context</SectionTitle>
                <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] text-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-medium">{dealer.context.online.googleRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">· {dealer.context.online.reviewCount} reviews</span>
                    {dealer.context.online.source === "google_places" && (
                      <span className="ml-auto rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">Live</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{dealer.context.staffingNotes}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dealer.modelMix.map((m) => (
                      <span key={m} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{m}</span>
                    ))}
                  </div>
                </div>
              </section>
            </div>
            <section>
              <SectionTitle>Recent action plans</SectionTitle>
              <ActionsList actions={dealer.actions.slice(0, 4)} />
            </section>
          </TabsContent>

          <TabsContent value="kpis" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {KPI_GRID.map((k) => (
                <KpiTrendCard key={k} dealer={dealer} peers={peers} kpi={k} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coach" className="mt-0">
            <CoachInsightsPanel dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="actions" className="mt-0">
            <ActionsList actions={dealer.actions} />
          </TabsContent>

          <TabsContent value="context" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              <ContextCard title="Online presence" icon={<Globe className="h-3.5 w-3.5" />}>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-medium">{dealer.context.online.googleRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">· {dealer.context.online.reviewCount} reviews</span>
                  {dealer.context.online.source === "google_places" && (
                    <span className="ml-2 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">Live</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {dealer.context.online.recentThemes.map((t) => (
                    <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">"{t}"</span>
                  ))}
                </div>
              </ContextCard>
              <ContextCard title="Facility notes" icon={<Building2 className="h-3.5 w-3.5" />}>
                <ul className="ml-4 list-disc space-y-1 text-sm text-foreground">
                  {dealer.context.facilityNotes.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </ContextCard>
              <ContextCard title="Accessibility" icon={<MapPin className="h-3.5 w-3.5" />}>
                <p className="text-sm">{dealer.context.accessibility}</p>
              </ContextCard>
              <ContextCard title="Staffing" icon={<Users className="h-3.5 w-3.5" />}>
                <p className="text-sm">{dealer.context.staffingNotes}</p>
              </ContextCard>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function ContextCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function KpiStripItem({ kpi, value, prev, dealer }: { kpi: KpiKey; value: number; prev: number; dealer: import("@/data/types").Dealer }) {
  const meta = KPI_META[kpi];
  const delta = value - prev;
  const goodUp = meta.goodDirection === "up";
  const positive = goodUp ? delta >= 0 : delta <= 0;
  const gap = gapToTarget(dealer, kpi);
  const series = dealer.history.map((p) => p[kpi]);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-base font-semibold tabular-nums">{formatKpi(kpi, value)}</span>
            <span className={cn("text-[10px] tabular-nums", positive ? "text-success" : "text-danger")}>
              {delta >= 0 ? "+" : ""}{meta.unit === "$" ? `$${Math.round(delta).toLocaleString()}` : `${delta.toFixed(1)}pt`}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {gap > 0 ? <span className="text-danger">−{meta.unit === "$" ? `$${Math.round(gap).toLocaleString()}` : `${gap.toFixed(1)}pt`} vs target</span> : <span className="text-success">at/above target</span>}
          </div>
        </div>
        <div className="h-8 w-16 shrink-0">
          <Sparkline values={series} tone={positive ? "success" : "danger"} height={32} />
        </div>
      </div>
    </div>
  );
}

function FocusCards({ dealer }: { dealer: import("@/data/types").Dealer }) {
  // Top 3 KPIs with the largest gap
  const kpis = (Object.keys(KPI_META) as KpiKey[])
    .map((k) => {
      const meta = KPI_META[k];
      const range = meta.unit === "$" ? meta.target * 0.4 : meta.goodDirection === "up" ? 30 : 15;
      return { k, gap: gapToTarget(dealer, k), range };
    })
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap / b.range - a.gap / a.range)
    .slice(0, 3);

  if (kpis.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
        All KPIs at or above target — keep coaching to maintain momentum.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {kpis.map(({ k, gap }) => {
        const meta = KPI_META[k];
        const v = latest(dealer)[k];
        return (
          <div key={k} className="rounded-xl border border-warning/40 bg-warning/5 p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
              <AlertTriangle className="h-3 w-3 text-warning" /> Focus
            </div>
            <div className="mt-1 text-sm font-medium">{meta.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{formatKpi(k, v)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {meta.unit === "$" ? `$${Math.round(gap).toLocaleString()}` : `${gap.toFixed(1)}pt`} below {formatKpi(k, meta.target)} target
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionsList({ actions }: { actions: import("@/data/types").ActionPlan[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <ul className="divide-y divide-border">
        {actions.map((a) => (
          <li key={a.id} className="flex items-start gap-4 px-4 py-3 text-sm">
            <div className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">{a.date}</div>
            <div className="flex-1">
              <div className="font-medium">{a.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{a.category} · {a.description}</div>
            </div>
            <OutcomePill outcome={a.outcome} liftPct={a.liftPct} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendChip({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"><TrendingUp className="h-3 w-3" /> Improving</span>;
  if (trend === "down") return <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger"><TrendingDown className="h-3 w-3" /> Declining</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"><Minus className="h-3 w-3" /> Stable</span>;
}

function OutcomePill({ outcome, liftPct }: { outcome: string; liftPct?: number }) {
  const map: Record<string, string> = {
    worked: "bg-success/15 text-success",
    no_change: "bg-muted text-muted-foreground",
    negative: "bg-danger/15 text-danger",
    in_progress: "bg-warning/20 text-warning-foreground",
  };
  const label = outcome === "worked" ? `Worked${liftPct ? ` +${liftPct}pt` : ""}` : outcome === "no_change" ? "No change" : outcome === "negative" ? "Negative" : "In progress";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${map[outcome]}`}>{label}</span>;
}
