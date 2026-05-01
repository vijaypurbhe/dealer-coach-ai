import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Lightbulb, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { getCoachInsights, type CoachInsights } from "@/server/coach.functions";
import { cn } from "@/lib/utils";

function ConfidencePill({ c }: { c: "low" | "medium" | "high" }) {
  const tone =
    c === "high" ? "bg-success/15 text-success" : c === "medium" ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", tone)}>{c}</span>;
}

function EffortPill({ e }: { e: "low" | "medium" | "high" }) {
  const tone =
    e === "low" ? "bg-success/15 text-success" : e === "medium" ? "bg-warning/20 text-warning-foreground" : "bg-danger/15 text-danger";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", tone)}>{e} effort</span>;
}

export function CoachInsightsPanel({ dealerId }: { dealerId: string }) {
  const fn = useServerFn(getCoachInsights);
  const [planAdded, setPlanAdded] = useState<Record<number, boolean>>({});

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["insights", dealerId],
    queryFn: () => fn({ data: { dealerId } }),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (isLoading) return <InsightsSkeleton />;
  if (isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-sm">
        <div className="flex items-center gap-2 font-medium text-danger">
          <AlertCircle className="h-4 w-4" /> Couldn't generate insights
        </div>
        <p className="mt-1 text-muted-foreground">{(error as Error)?.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Try again
        </button>
      </div>
    );
  }
  const insights = data as CoachInsights;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-xl border border-border p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-90">
          <Sparkles className="h-3.5 w-3.5" /> AI Coach summary
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug">{insights.headline}</h2>
        <p className="mt-2 text-sm opacity-95">{insights.whats_wrong}</p>
        {isFetching && <div className="mt-2 text-xs opacity-80">Refreshing…</div>}
      </div>

      <Section icon={<Lightbulb className="h-4 w-4" />} title="Likely root causes">
        <div className="space-y-3">
          {insights.root_causes.map((rc, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-sm">{rc.cause}</div>
                <ConfidencePill c={rc.confidence} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{rc.evidence}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Users className="h-4 w-4" />} title="Peer benchmark">
        <p className="text-sm text-muted-foreground">{insights.peer_benchmark}</p>
      </Section>

      <Section icon={<Target className="h-4 w-4" />} title="Recommended next-best actions">
        <div className="space-y-3">
          {insights.actions.map((a, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Targets: {a.target_kpi}</div>
                </div>
                <EffortPill e={a.effort} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.rationale}</p>
              <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs">
                <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <div>
                  <div className="font-medium text-foreground">{a.expected_lift}</div>
                  <div className="mt-0.5 text-muted-foreground">Similar success: {a.similar_case}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setPlanAdded((p) => ({ ...p, [i]: !p[i] }))}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    planAdded[i]
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-background hover:bg-accent",
                  )}
                >
                  {planAdded[i] ? "✓ Added to plan" : "Add to action plan"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <div className="text-center text-xs text-muted-foreground">AI is analyzing this dealer…</div>
    </div>
  );
}