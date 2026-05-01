
# MMNA Dealership AI Coach — PoC Plan

A demo-ready web app that reframes Mitsubishi Motors' dealership audit process as an "AI Coach for District Managers." Built with mock data now, designed to swap in MMNA's Excel extracts later. Target: demo-ready by mid-May.

## Storyline

A district manager opens the app, sees their portfolio of dealers ranked by health, drills into a struggling dealer, and gets three things AI generates on top of the existing KPI data:
1. **What's wrong** — plain-English summary of slipping metrics
2. **Why** — likely root causes tied to the data and contextual signals
3. **What worked elsewhere** — recommended actions grounded in similar dealers' historical action plans

A coaching chat sits alongside so the DM can ask follow-up questions about the dealer.

## Screens

### 1. Portfolio (home)
- Header with DM name, region, date.
- Sortable table / card grid of 6–8 mock dealers.
- Each row: dealer name, location, overall health score (red/amber/green), trend arrow, top slipping KPI, last visit date, "open" button.
- Filter chips: All / Needs attention / Improving / On track.
- Small portfolio summary at top: avg retention, avg CSI, # dealers needing attention, week-over-week movement.

### 2. Dealer Detail
Tabbed or stacked layout with the following blocks:

- **Header**: dealer name, address, DM, district, health score, last action plan status.
- **KPI Trends**: line/area charts for 1-yr retention, 7-yr retention, parts sales, accessory sales, CSI, warranty leakage. 12-month view with peer-group benchmark line overlay.
- **AI Coach Summary** (generated): "What's going wrong" paragraph + bulleted "Likely root causes" tied to specific data points and contextual signals.
- **Peer Benchmark**: anonymized comparison vs. 5 similar dealers (size, region, model mix). Shows where this dealer leads and lags.
- **Recommended Actions**: 3–5 ranked next-best actions, each with: rationale, similar dealer case it's drawn from, expected lift, effort level, and a "Add to action plan" button.
- **Action Plan History**: timeline of past actions with outcome tags (worked / no change / negative).
- **Context Signals**: facility notes (mock), online presence card with one **real Google Places** snippet (rating, review count, recent review themes) for one dealer to make it tangible, location/accessibility notes (mock).
- **Coaching Chat**: side panel or bottom drawer. The DM can ask "Why did 1-yr retention drop in Q3?" or "Draft talking points for my visit." Chat is scoped to this dealer's data and history.

### 3. Data Source page (lightweight)
- Shows that mock data is loaded.
- Upload area for CSV/XLSX (visual only for v1, wired to local parsing in v2). Establishes the "swap in real extracts" story for stakeholders.

## AI Capabilities

All AI calls go through a backend server function using Lovable AI Gateway (default `google/gemini-3-flash-preview`; `google/gemini-2.5-pro` for chat reasoning).

- **Trend summary & root-cause narrative**: server function takes one dealer's KPI series + action history + context signals → returns structured JSON (summary, root_causes[], confidence). Cached per dealer.
- **Peer benchmark insights**: deterministic peer-group selection in code (same region + size band), then AI narrates the gap.
- **Next-best actions**: server function receives current issues + similar dealers' historical action outcomes → returns ranked actions with rationale and expected lift. Uses tool-calling / structured output for clean rendering.
- **Coaching chat**: streaming chat endpoint, system prompt scoped to the selected dealer's full data packet. Markdown rendered.

## Mock Data Shape (baked in, ready to swap)

A single TypeScript module seeds:
- 8 dealers across 3 regions, varied performance profiles (1 star, 2 strugglers, 3 average, 2 improving).
- 12 months of monthly KPI history per dealer.
- 8–15 historical action plans per dealer with outcomes.
- Facility notes and contextual flags.
- Peer-group metadata.

When MMNA's Excel arrives, only the data module changes; UI and AI prompts stay put.

## One Real Enrichment Signal

For one demo dealer, fetch live data from Google Places API (rating, review count, top recent review snippets) on the server, cache it, and feed it into the root-cause prompt. Other dealers show simulated equivalents so the demo flows uniformly. This will require a Google Places API key — we'll request it when we get to that step.

## Visual Design

Clean, professional, executive-demo polish:
- Light theme primary, optional dark toggle.
- Mitsubishi-adjacent palette (deep red accent on neutral slate background) — adjustable.
- Typography: Inter for UI, tabular numerals for KPIs.
- shadcn/ui components, Recharts for trends, Lucide icons.
- Health badges, sparklines, and clear color semantics (red = attention, amber = watch, green = on track).
- Loading skeletons and streamed AI responses so the demo feels alive.

## Technical Notes

- TanStack Start with file-based routes: `/` (portfolio), `/dealers/$dealerId` (detail), `/data` (source page).
- Lovable Cloud enabled for the AI Gateway key (`LOVABLE_API_KEY`) and a small table to persist user-added action plan items during the demo.
- Server functions in `src/server/`: `ai-summary.functions.ts`, `ai-actions.functions.ts`, `chat.functions.ts` (streaming SSE), `places.functions.ts`.
- TanStack Query for caching AI responses so re-opening a dealer is instant.
- No real customer PII in mock data; dealer names are fictional Mitsubishi-style placeholders.

## Out of Scope for PoC

- Live SQL Server warehouse connection (we mimic the schema instead).
- Real Reputation/Urban Science integrations.
- Authentication/role management (single demo DM persona).
- Action plan tracking beyond an in-memory/db demo store.

## Suggested Build Order

1. Routes, layout shell, mock data module, portfolio screen with charts and health scoring.
2. Dealer detail screen with KPI charts, peer benchmark, action plan history.
3. AI server functions (summary + recommended actions) wired into detail screen with streaming/loading states.
4. Coaching chat panel.
5. Google Places enrichment for one dealer.
6. Polish pass: empty states, transitions, demo script-friendly copy.
