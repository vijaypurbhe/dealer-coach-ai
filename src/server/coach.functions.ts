import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEALERS, getDealer } from "@/data/dealers";
import { callAi, dealerDataPacket } from "./ai.server";

const idSchema = z.object({ dealerId: z.string().min(1).max(64) });

export const getCoachInsights = createServerFn({ method: "POST" })
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const dealer = getDealer(data.dealerId);
    if (!dealer) throw new Error("Dealer not found");
    const peers = DEALERS.filter((d) => dealer.peerIds.includes(d.id));
    const packet = dealerDataPacket(dealer, peers);

    const tools = [
      {
        type: "function",
        function: {
          name: "report_insights",
          description: "Return a coaching summary with root causes and ranked next-best actions.",
          parameters: {
            type: "object",
            properties: {
              headline: { type: "string", description: "One-sentence summary of the dealer's current situation." },
              whats_wrong: { type: "string", description: "2-3 sentence plain-English summary of what is slipping and where this dealer trails peers." },
              root_causes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    cause: { type: "string", description: "Likely root cause, grounded in data and context signals." },
                    evidence: { type: "string", description: "Specific KPI gaps, action history, or context that supports this cause." },
                    confidence: { type: "string", enum: ["low", "medium", "high"] },
                  },
                  required: ["cause", "evidence", "confidence"],
                  additionalProperties: false,
                },
                minItems: 2,
                maxItems: 4,
              },
              peer_benchmark: {
                type: "string",
                description: "Where this dealer leads or lags vs anonymized peers, in plain English.",
              },
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    rationale: { type: "string", description: "Why this action will help, tied to the data." },
                    similar_case: { type: "string", description: "Reference to a peer dealer's successful historical action." },
                    expected_lift: { type: "string", description: "Estimated lift, e.g., '+3-5pt CSI in 60 days'." },
                    effort: { type: "string", enum: ["low", "medium", "high"] },
                    target_kpi: { type: "string" },
                  },
                  required: ["title", "rationale", "similar_case", "expected_lift", "effort", "target_kpi"],
                  additionalProperties: false,
                },
                minItems: 3,
                maxItems: 5,
              },
            },
            required: ["headline", "whats_wrong", "root_causes", "peer_benchmark", "actions"],
            additionalProperties: false,
          },
        },
      },
    ];

    const system =
      "You are an AI coach for Mitsubishi Motors district managers. Help them shift from auditing to coaching dealers. Be specific, ground every claim in the provided data, and reference peer best practices. Avoid generic advice.";

    const user = `Analyze this dealer and produce coaching insights.\n\nDATA:\n${JSON.stringify(packet, null, 2)}`;

    const result = await callAi({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "report_insights" } },
    });

    const call = result?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("AI did not return structured insights");
    return JSON.parse(call.function.arguments) as {
      headline: string;
      whats_wrong: string;
      root_causes: Array<{ cause: string; evidence: string; confidence: "low" | "medium" | "high" }>;
      peer_benchmark: string;
      actions: Array<{
        title: string;
        rationale: string;
        similar_case: string;
        expected_lift: string;
        effort: "low" | "medium" | "high";
        target_kpi: string;
      }>;
    };
  });

export type CoachInsights = Awaited<ReturnType<typeof getCoachInsights>>;