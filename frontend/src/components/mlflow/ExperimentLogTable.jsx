export default function ExperimentLogTable({ rows = [] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: "12px 14px", background: "var(--bg-surface-soft)", color: "var(--text-muted)", fontSize: 11 }}>
        <span>모델</span>
        <span>최신 버전</span>
        <span>Production</span>
        <span>설명</span>
      </div>
      {rows.map((row) => (
        <div key={row.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <span style={{ color: "var(--text-primary)" }}>{row.name}</span>
          <span style={{ color: "var(--text-secondary)" }}>{row.latest_versions?.[0] ?? row.latest_version ?? "-"}</span>
          <span style={{ color: "var(--success)" }}>{row.production_version ?? "-"}</span>
          <span style={{ color: "var(--text-secondary)" }}>{row.description || "-"}</span>
        </div>
      ))}
    </div>
  )
}
