import { cn } from "@/lib/utils";
import type { Health } from "@/data/types";
import { statusLabel } from "@/data/health";

const styles: Record<Health, string> = {
  on_track: "bg-success/15 text-success border-success/30",
  watch: "bg-warning/20 text-warning-foreground border-warning/40",
  attention: "bg-danger/15 text-danger border-danger/30",
};

export function HealthBadge({ status, score }: { status: Health; score?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
      {typeof score === "number" && <span className="opacity-70">· {score}</span>}
    </span>
  );
}