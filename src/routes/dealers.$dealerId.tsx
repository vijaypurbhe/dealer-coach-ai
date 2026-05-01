import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Calendar, Users, Building2, Star, Globe } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { HealthBadge } from "@/components/app/HealthBadge";
import { KpiTrendCard } from "@/components/app/KpiTrendCard";
import { CoachInsightsPanel } from "@/components/app/CoachInsights";
import { CoachChat } from "@/components/app/CoachChat";
import { DEALERS, getDealer } from "@/data/dealers";
import { computeHealth } from "@/data/health";
import type { KpiKey } from "@/data/types";

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

function DealerPage() {
  const { dealer } = Route.useLoaderData();
  const peers = DEALERS.filter((d) => dealer.peerIds.includes(d.id));
  const health = computeHealth(dealer);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
        </Link>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{dealer.name}</h1>
              <HealthBadge status={health.status} score={health.score} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {dealer.city}, {dealer.state}</span>
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {dealer.region} · {dealer.district} · {dealer.sizeBand}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Last visit {dealer.lastVisit}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" /> Peers: {peers.length}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dealer.modelMix.map((m) => (
                <span key={m} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{m}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-muted/40 px-4 py-3">
            <div className="text-center">
              <div className="text-2xl font-semibold tabular-nums">{health.score}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Health score</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">KPI Trends</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {KPI_GRID.map((k) => (
                  <KpiTrendCard key={k} dealer={dealer} peers={peers} kpi={k} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Coach insights</h2>
              <CoachInsightsPanel dealerId={dealer.id} />
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Action plan history</h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
                <ul className="divide-y divide-border">
                  {dealer.actions.map((a) => (
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
            </section>
          </div>

          <div className="space-y-6">
            <CoachChat dealerId={dealer.id} dealerName={dealer.name} />

            <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Context signals</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Globe className="h-3 w-3" /> Online presence
                    {dealer.context.online.source === "google_places" && (
                      <span className="ml-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">Live</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-medium">{dealer.context.online.googleRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">· {dealer.context.online.reviewCount} reviews</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {dealer.context.online.recentThemes.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">"{t}"</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Facility notes</div>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-foreground">
                    {dealer.context.facilityNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Accessibility</div>
                  <p>{dealer.context.accessibility}</p>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Staffing</div>
                  <p>{dealer.context.staffingNotes}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
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
