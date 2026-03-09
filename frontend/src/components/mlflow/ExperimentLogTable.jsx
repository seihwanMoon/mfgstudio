export default function ExperimentLogTable({ rows = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: "10px 14px", background: "#111E2E", color: "#5A7A9A", fontSize: 10 }}>
        <span>모델</span>
        <span>최신 버전</span>
        <span>Production</span>
        <span>설명</span>
      </div>
      {rows.map((row) => (
        <div key={row.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: "12px 14px", borderTop: "1px solid #1A3352", background: "#0D1926" }}>
          <span style={{ color: "#E2EEFF" }}>{row.name}</span>
          <span style={{ color: "#8BA8C8" }}>{row.latest_versions?.[0] ?? row.latest_version ?? "—"}</span>
          <span style={{ color: "#34D399" }}>{row.production_version ?? "—"}</span>
          <span style={{ color: "#8BA8C8" }}>{row.description || "—"}</span>
        </div>
      ))}
    </div>
  )
}
