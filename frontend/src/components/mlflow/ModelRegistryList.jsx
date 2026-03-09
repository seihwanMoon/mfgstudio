export default function ModelRegistryList({ rows = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>모델 레지스트리</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div key={row.name} style={{ borderTop: "1px solid #1A3352", paddingTop: 8, color: "#8BA8C8" }}>
            {row.name} · latest {row.latest_versions?.[0] ?? row.latest_version ?? "—"}
          </div>
        ))}
      </div>
    </div>
  )
}
