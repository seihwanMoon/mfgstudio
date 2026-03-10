export default function SetupResultToast({ result, error }) {
  if (!result && !error) return null

  if (error) {
    return (
      <div style={{ border: "1px solid rgba(210, 82, 82, 0.35)", borderLeft: "4px solid var(--danger)", borderRadius: 12, background: "rgba(210, 82, 82, 0.08)", padding: 14 }}>
        <div style={{ color: "var(--danger)", fontWeight: 800, marginBottom: 6 }}>setup() 실행 실패</div>
        <div style={{ color: "var(--text-primary)", fontSize: 13 }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid rgba(21, 181, 123, 0.28)", borderLeft: "4px solid var(--success)", borderRadius: 12, background: "rgba(21, 181, 123, 0.08)", padding: 14 }}>
      <div style={{ color: "var(--success)", fontWeight: 800, marginBottom: 6 }}>setup() 완료</div>
      <div style={{ color: "var(--text-primary)", fontSize: 13, marginBottom: 4 }}>
        transformed shape: {result.transformed_shape?.join(" x ") || "-"}
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        pipeline: {(result.pipeline_steps || []).join(" > ") || "-"}
      </div>
    </div>
  )
}
