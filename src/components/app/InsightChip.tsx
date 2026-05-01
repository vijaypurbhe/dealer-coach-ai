import { Sparkles, AlertTriangle, TrendingUp, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealerInsight } from "@/data/insights";

const TONE_STYLES: Record<DealerInsight["tone"], { bg: string; text: string; ring: string; Icon: typeof Sparkles }> = {
  opportunity: { bg: "bg-primary/8", text: "text-primary", ring: "ring-primary/20", Icon: Sparkles },
  risk: { bg: "bg-danger/10", text: "text-danger", ring: "ring-danger/20", Icon: AlertTriangle },
  win: { bg: "bg-success/10", text: "text-success", ring: "ring-success/25", Icon: TrendingUp },
  watch: { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border", Icon: Eye },
};

export function InsightChip({ insight, compact }: { insight: DealerInsight; compact?: boolean }) {
  const s = TONE_STYLES[insight.tone];
  const Icon = s.Icon;
  return (
    <div
      className={cn(
        "group/insight relative flex items-start gap-2 rounded-lg px-2.5 py-1.5 ring-1 transition-all",
        s.bg,
        s.ring,
        "hover:ring-2",
      )}
    >
      <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-background/60", s.text)}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0">
        <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", s.text)}>
          AI insight
          <span className="rounded-sm bg-background/60 px-1 py-px text-[9px] font-medium tabular-nums text-muted-foreground">
            {Math.round(insight.confidence * 100)}%
          </span>
        </div>
        <div className="mt-0.5 text-xs font-medium leading-snug text-foreground line-clamp-2">
          {insight.headline}
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap gap-1">
            {insight.drivers.slice(0, 3).map((d) => (
              <span key={d} className="rounded-sm bg-background/70 px-1.5 py-px text-[10px] text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
