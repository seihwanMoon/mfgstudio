export default function SetupResultToast({ result }) {
  if (!result) return null

  return (
    <div style={{ border: "1px solid #34D39955", borderLeft: "4px solid #34D399", borderRadius: 12, background: "rgba(52, 211, 153, 0.08)", padding: 14 }}>
      <div style={{ color: "#34D399", fontWeight: 800, marginBottom: 6 }}>setup() 완료</div>
      <div style={{ color: "#E2EEFF", fontSize: 13, marginBottom: 4 }}>
        transformed shape: {result.transformed_shape?.join(" × ") || "—"}
      </div>
      <div style={{ color: "#8BA8C8", fontSize: 12 }}>
        pipeline: {(result.pipeline_steps || []).join(" → ") || "—"}
      </div>
    </div>
  )
}
