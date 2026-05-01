import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DEALERS, getDealer } from "@/data/dealers";
import { dealerDataPacket, streamAi } from "@/server/ai.server";

const bodySchema = z.object({
  dealerId: z.string().min(1).max(64),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

export const Route = createFileRoute("/api/coach-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
        }
        const dealer = getDealer(body.dealerId);
        if (!dealer) return new Response(JSON.stringify({ error: "Dealer not found" }), { status: 404 });
        const peers = DEALERS.filter((d) => dealer.peerIds.includes(d.id));
        const packet = dealerDataPacket(dealer, peers);

        const system = `You are an AI coach helping a Mitsubishi district manager think through one specific dealer's performance. Be conversational, concise, and grounded in the data below. Use markdown for structure when helpful. If asked for talking points or action ideas, propose specific, dealer-tailored next steps.\n\nDEALER DATA:\n${JSON.stringify(packet)}`;

        try {
          const upstream = await streamAi({
            messages: [{ role: "system", content: system }, ...body.messages],
          });
          if (!upstream.ok) {
            const status = upstream.status;
            const msg =
              status === 429
                ? "Rate limit reached. Please try again in a moment."
                : status === 402
                ? "AI credits exhausted for this workspace."
                : "AI service error.";
            return new Response(JSON.stringify({ error: msg }), { status });
          }
          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "AI error" }), { status: 500 });
        }
      },
    },
  },
});