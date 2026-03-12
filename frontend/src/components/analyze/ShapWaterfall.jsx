export default function ShapWaterfall({ result, moduleType }) {
  if (!result) {
    return (
      <div
        style={{
          border: "1px dashed var(--border-strong)",
          borderRadius: 18,
          minHeight: 220,
          display: "grid",
          placeItems: "center",
          color: "var(--text-secondary)",
          background: "rgba(255, 255, 255, 0.04)",
          padding: 18,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        아직 SHAP 결과가 없습니다.
        <br />
        오른쪽 아래에서 행 번호를 입력하고 분석을 실행하세요.
      </div>
    )
  }

  const scoreLabel = moduleType === "regression" ? "예측값" : "예측 확률"

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
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>예측 결과: {result.prediction}</div>
      <div style={{ color: "var(--accent-blue-strong)", fontWeight: 700, marginBottom: 14 }}>
        {scoreLabel}: {result.score}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(result.shap_values || []).map((item) => (
          <div
            key={item.feature}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              borderTop: "1px solid var(--border)",
              paddingTop: 8,
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{item.feature}</span>
            <span style={{ color: item.direction === "positive" ? "var(--danger)" : "var(--accent-blue)", fontWeight: 700 }}>
              {item.shap_value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
