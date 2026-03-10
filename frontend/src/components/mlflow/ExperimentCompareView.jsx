export default function ExperimentCompareView({ experiments = [] }) {
  const sample = experiments.slice(0, 3)

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
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 10 }}>실험 비교 요약</div>
      {!sample.length ? (
        <div style={{ color: "var(--text-secondary)" }}>비교할 MLflow 실험이 아직 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {sample.map((row) => (
            <div
              key={row.experiment_id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 14,
                background: "var(--bg-surface-soft)",
              }}
            >
              <div style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 8 }}>{row.name}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
                <div>Run 수: {row.run_count}</div>
                <div>최근 실행: {row.latest_run_name || "-"}</div>
                <div>최근 상태: {row.latest_run_status || "-"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
