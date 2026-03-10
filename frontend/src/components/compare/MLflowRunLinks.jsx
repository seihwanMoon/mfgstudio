export default function MLflowRunLinks({ results = [] }) {
  const logged = results.filter((row) => row.mlflow_run_id)

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14 }}>
      <div style={{ color: "#E2EEFF", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>MLflow Run IDs</div>
      {!logged.length ? <div style={{ color: "#8BA8C8", fontSize: 12 }}>아직 실제 MLflow run 이 연결된 모델이 없습니다.</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {logged.map((row) => (
          <div key={`${row.algorithm}-${row.mlflow_run_id}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#8BA8C8", fontSize: 11 }}>{row.algorithm}</span>
            <code style={{ color: "#38BDF8", fontSize: 11 }}>{row.mlflow_run_id}</code>
          </div>
        ))}
      </div>
    </div>
  )
}
