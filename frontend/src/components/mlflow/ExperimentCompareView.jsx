export default function ExperimentCompareView({ rows = [] }) {
  const sample = rows.slice(0, 2)
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>실험 비교</div>
      {sample.length < 2 ? (
        <div style={{ color: "#8BA8C8" }}>비교할 모델이 충분하지 않습니다.</div>
      ) : (
        sample.map((row) => (
          <div key={row.name} style={{ borderTop: "1px solid #1A3352", paddingTop: 8, color: "#8BA8C8" }}>
            {row.name} · latest {row.latest_versions?.[0] ?? "—"}
          </div>
        ))
      )}
    </div>
  )
}
