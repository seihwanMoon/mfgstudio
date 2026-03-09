export default function PredictionHistory({ rows = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 10, padding: "10px 14px", background: "#111E2E", color: "#5A7A9A", fontSize: 10 }}>
        <span>시각</span>
        <span>모델</span>
        <span>소스</span>
        <span>결과</span>
        <span>점수</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 10, padding: "12px 14px", borderTop: "1px solid #1A3352", background: "#0D1926" }}>
          <span style={{ color: "#8BA8C8", fontSize: 12 }}>{row.created_at}</span>
          <span style={{ color: "#E2EEFF", fontSize: 12 }}>{row.model_name}</span>
          <span style={{ color: "#8BA8C8", fontSize: 12 }}>{row.source}</span>
          <span style={{ color: row.label === "positive" ? "#F87171" : "#34D399", fontSize: 12 }}>{row.label}</span>
          <span style={{ color: "#8BA8C8", fontSize: 12 }}>{row.score ?? "—"}</span>
        </div>
      ))}
    </div>
  )
}
