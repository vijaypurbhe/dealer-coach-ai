import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDealer } from "@/data/dealers";
import { computeHealth, formatKpi, gapToTarget, latest } from "@/data/health";
import { KPI_META, type KpiKey } from "@/data/types";

type Msg = { role: "user" | "assistant"; content: string };

function buildContextualPrompts(dealerId: string): string[] {
  const dealer = getDealer(dealerId);
  if (!dealer) {
    return [
      "Summarize the biggest risks here.",
      "Draft talking points for my next visit.",
      "What worked at similar dealers?",
    ];
  }
  const health = computeHealth(dealer);
  const last = latest(dealer);
  const prev = dealer.history[dealer.history.length - 2];

  // Rank KPIs by gap-to-target severity
  const kpis = Object.keys(KPI_META) as KpiKey[];
  const ranked = kpis
    .map((k) => ({ k, gap: gapToTarget(dealer, k) }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const topKpi = ranked[0]?.k ?? health.topIssue?.kpi;
  const secondKpi = ranked[1]?.k;

  // Find a KPI that moved most MoM (negative direction)
  const droppingKpi = prev
    ? kpis
        .map((k) => {
          const dir = KPI_META[k].goodDirection === "up" ? 1 : -1;
          return { k, delta: (last[k] - prev[k]) * dir };
        })
        .sort((a, b) => a.delta - b.delta)[0]
    : null;

  // Recent successful action category
  const win = dealer.actions.find((a) => a.outcome === "worked");
  // Online review themes
  const theme = dealer.context.online.recentThemes[0];

  const prompts: string[] = [];

  if (topKpi) {
    prompts.push(
      `Why is ${KPI_META[topKpi].label} at ${formatKpi(topKpi, last[topKpi])} vs target ${formatKpi(topKpi, KPI_META[topKpi].target)}?`,
    );
  }
  if (droppingKpi && droppingKpi.delta < 0 && droppingKpi.k !== topKpi) {
    prompts.push(`What's driving the recent drop in ${KPI_META[droppingKpi.k].label}?`);
  }
  if (secondKpi && secondKpi !== droppingKpi?.k) {
    prompts.push(`How do peers in ${dealer.region} compare on ${KPI_META[secondKpi].label}?`);
  }
  if (theme) {
    prompts.push(`Customers mention "${theme.toLowerCase()}" — how should I address that with the GM?`);
  }
  if (win) {
    prompts.push(`Could the "${win.title}" playbook work again here?`);
  }
  prompts.push(`Draft talking points for my next visit to ${dealer.name.split(" ").slice(0, 2).join(" ")}.`);

  // Dedupe and cap
  return Array.from(new Set(prompts)).slice(0, 5);
}

export function CoachChat({ dealerId, dealerName }: { dealerId: string; dealerName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const starterPrompts = useMemo(() => buildContextualPrompts(dealerId), [dealerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    let acc = "";
    try {
      const resp = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId, messages: next }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Chat failed" }));
        setMessages((m) => [...m, { role: "assistant", content: `_${err.error ?? "Chat failed"}_` }]);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `_Network error: ${e?.message ?? e}_` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[560px] flex-col rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Coaching chat</div>
          <div className="text-xs text-muted-foreground">Scoped to {dealerName}</div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-3 w-3 text-primary" /> Ask anything about this dealer
              </div>
              I have this dealer's last 12 months of KPIs, action history, peer benchmarks, and context signals.
            </div>
            <div className="flex flex-wrap gap-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-headings:text-sm">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask about this dealer…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}