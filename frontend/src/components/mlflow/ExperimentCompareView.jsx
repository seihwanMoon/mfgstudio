export default function ExperimentCompareView({ rows = [] }) {
  const sample = rows.slice(0, 2)

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 10 }}>운영 모델 비교</div>
      {sample.length < 2 ? (
        <div style={{ color: "var(--text-secondary)" }}>비교할 등록 모델이 아직 충분하지 않습니다.</div>
      ) : (
        sample.map((row) => (
          <div key={row.name} style={{ borderTop: "1px solid var(--border)", paddingTop: 8, color: "var(--text-secondary)" }}>
            {row.name} · latest {row.latest_versions?.[0] ?? "-"}
          </div>
        ))
      )}
    </div>
  )
}
