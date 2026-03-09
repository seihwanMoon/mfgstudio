export default function ShapWaterfall({ result }) {
  if (!result) {
    return (
      <div style={{ border: "1px dashed #234466", borderRadius: 14, minHeight: 220, display: "grid", placeItems: "center", color: "#8BA8C8" }}>
        SHAP 결과가 여기에 표시됩니다.
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>예측: {result.prediction}</div>
      <div style={{ color: "#A78BFA", fontWeight: 700, marginBottom: 12 }}>Score {result.score}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(result.shap_values || []).map((item) => (
          <div key={item.feature} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid #1A3352", paddingTop: 8 }}>
            <span style={{ color: "#8BA8C8", fontSize: 12 }}>{item.feature}</span>
            <span style={{ color: item.direction === "positive" ? "#F87171" : "#38BDF8", fontWeight: 700 }}>
              {item.shap_value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
