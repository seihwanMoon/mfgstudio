export default function ModelRegistryList({ rows = [] }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 16,
      }}
    >
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 8 }}>모델 레지스트리</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        실제로 버전이 등록되어 운영 관리 대상이 된 모델만 표시합니다.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!rows.length ? <div style={{ color: "var(--text-secondary)" }}>등록된 모델이 없습니다.</div> : null}
        {rows.map((row) => (
          <div
            key={row.name}
            style={{ borderTop: "1px solid var(--border)", paddingTop: 8, color: "var(--text-secondary)" }}
          >
            {row.name} / 최신 버전 {row.latest_versions?.[0] ?? row.latest_version ?? "-"}
            {row.production_version ? ` / 프로덕션 ${row.production_version}` : ""}
          </div>
        ))}
      </div>
    </div>
  )
}
