const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callAi(opts: {
  messages: AiMessage[];
  model?: string;
  tools?: any[];
  tool_choice?: any;
}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tool_choice,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit reached. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
    const text = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function streamAi(opts: { messages: AiMessage[]; model?: string }): Promise<Response> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: opts.messages,
      stream: true,
    }),
  });
  return res;
}

export function dealerDataPacket(dealer: any, peers: any[]) {
  const last = dealer.history[dealer.history.length - 1];
  const first = dealer.history[0];
  const lastQuarter = dealer.history.slice(-3);
  const peerLast = peers.map((p: any) => p.history[p.history.length - 1]);
  const peerAvg = (k: string) =>
    peerLast.reduce((s: number, r: any) => s + r[k], 0) / Math.max(1, peerLast.length);

  const kpis = ["retention1y", "retention7y", "partsSales", "accessorySales", "csi", "warrantyLeakage"];
  const snapshot = kpis.map((k) => ({
    kpi: k,
    current: last[k],
    yoyDelta: Math.round((last[k] - first[k]) * 10) / 10,
    last3moAvg: Math.round((lastQuarter.reduce((s: number, p: any) => s + p[k], 0) / 3) * 10) / 10,
    peerAvg: Math.round(peerAvg(k) * 10) / 10,
  }));

  return {
    dealer: {
      name: dealer.name,
      city: dealer.city,
      state: dealer.state,
      region: dealer.region,
      sizeBand: dealer.sizeBand,
      modelMix: dealer.modelMix,
    },
    kpis: snapshot,
    context: dealer.context,
    recentActions: dealer.actions.slice(0, 8).map((a: any) => ({
      date: a.date,
      title: a.title,
      category: a.category,
      outcome: a.outcome,
      liftPct: a.liftPct,
    })),
    peerHistoricalActions: peers.flatMap((p: any) =>
      p.actions
        .filter((a: any) => a.outcome === "worked")
        .slice(0, 3)
        .map((a: any) => ({
          peer: p.name,
          title: a.title,
          category: a.category,
          liftPct: a.liftPct,
        })),
    ),
  };
}