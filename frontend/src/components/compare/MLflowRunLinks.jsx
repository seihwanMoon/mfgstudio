export default function MLflowRunLinks({ results = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14 }}>
      <div style={{ color: "#E2EEFF", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>MLflow Run IDs</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map((row) => (
          <code key={row.mlflow_run_id} style={{ color: "#38BDF8", fontSize: 11 }}>
            {row.mlflow_run_id}
          </code>
        ))}
      </div>
    </div>
  )
}
