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
        아직 SHAP 결과가 생성되지 않았습니다.
        <br />
        행 번호를 선택한 뒤 설명을 실행해 주세요.
      </div>
    )
  }

  const scoreLabel = moduleType === "regression" ? "예측값" : "예측 점수"
  const maxAbs = Math.max(...(result.shap_values || []).map((item) => Math.abs(item.shap_value)), 1)

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
      <div style={{ color: "var(--accent-blue-strong)", fontWeight: 700, marginBottom: 6 }}>
        {scoreLabel}: {result.score}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>행 번호: {result.row_index}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(result.shap_values || []).map((item) => {
          const width = `${Math.max(6, (Math.abs(item.shap_value) / maxAbs) * 100)}%`
          const color = item.direction === "positive" ? "var(--danger)" : "var(--accent-blue)"
          return (
            <div key={item.feature} style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{item.feature}</span>
                <span style={{ color, fontWeight: 700 }}>{item.shap_value}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--bg-surface-soft)", overflow: "hidden" }}>
                <div style={{ width, height: "100%", background: color, borderRadius: 999 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
