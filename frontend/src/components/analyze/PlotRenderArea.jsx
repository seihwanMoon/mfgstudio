export default function PlotRenderArea({ image, isLoading, plotLabel, plotFamily, moduleType }) {
  const modeLabel = moduleType === "regression" ? "회귀" : moduleType === "classification" ? "분류" : moduleType
  const familyLabel = plotFamily === "xai" ? "XAI" : "모델 진단"

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 16,
        minHeight: 420,
        display: "grid",
        placeItems: "center",
      }}
    >
      {isLoading ? (
        <div style={{ color: "var(--text-secondary)" }}>플롯을 생성하는 중입니다...</div>
      ) : image ? (
        <img alt="analysis plot" src={`data:image/png;base64,${image}`} style={{ width: "100%", borderRadius: 10 }} />
      ) : (
        <div style={{ color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.7 }}>
          아직 생성된 플롯이 없습니다.
          <br />
          현재 실험 유형은 {modeLabel}이고, 선택한 항목은 {plotLabel || "없음"} ({familyLabel}) 입니다.
        </div>
      )}
    </div>
  )
}
