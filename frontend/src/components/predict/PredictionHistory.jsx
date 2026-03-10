export default function PredictionHistory({ rows = [] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1.4fr 1fr 1fr 1fr", gap: 10, padding: "12px 14px", background: "var(--bg-surface-soft)", color: "var(--text-muted)", fontSize: 11 }}>
        <span>시각</span>
        <span>모델</span>
        <span>방식</span>
        <span>결과</span>
        <span>점수</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.7fr 1.4fr 1fr 1fr 1fr", gap: 10, padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{row.created_at}</span>
          <span style={{ color: "var(--text-primary)", fontSize: 12 }}>{row.model_name}</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{row.source}</span>
          <span style={{ color: "var(--text-primary)", fontSize: 12 }}>{row.label}</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{row.score ?? "-"}</span>
        </div>
      ))}
    </div>
  )
}
