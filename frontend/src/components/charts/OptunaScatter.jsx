import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"

export default function OptunaScatter({ points = [] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 700, marginBottom: 10 }}>튜닝 시도 분포</div>
      <div style={{ height: 240 }}>
        {points.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="x" name="trial" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
              <YAxis dataKey="y" name="score" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={points} fill="#1677FF" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--text-secondary)", fontSize: 12 }}>trial 데이터 없음</div>
        )}
      </div>
    </div>
  )
}
