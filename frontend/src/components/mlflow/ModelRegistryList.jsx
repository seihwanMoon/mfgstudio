export default function ModelRegistryList({ rows = [] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 8 }}>모델 레지스트리</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        실제로 버전이 등록된 운영 모델만 표시합니다.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div key={row.name} style={{ borderTop: "1px solid var(--border)", paddingTop: 8, color: "var(--text-secondary)" }}>
            {row.name} · latest {row.latest_versions?.[0] ?? row.latest_version ?? "-"}
          </div>
        ))}
      </div>
    </div>
  )
}
