import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({
  values,
  tone = "primary",
  height = 28,
}: {
  values: number[];
  tone?: "primary" | "success" | "danger" | "muted";
  height?: number;
}) {
  const data = values.map((v, i) => ({ i, v }));
  const stroke =
    tone === "success"
      ? "oklch(0.62 0.17 152)"
      : tone === "danger"
      ? "oklch(0.58 0.22 27)"
      : tone === "muted"
      ? "oklch(0.6 0.02 258)"
      : "oklch(0.52 0.22 27)";
  const id = `spark-${tone}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}