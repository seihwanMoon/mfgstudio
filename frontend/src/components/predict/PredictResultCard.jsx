export default function PredictResultCard({ result, moduleType }) {
  if (!result) {
    return (
      <div style={{ border: "1px dashed var(--border-strong)", borderRadius: 18, minHeight: 160, display: "grid", placeItems: "center", color: "var(--text-secondary)" }}>
        예측을 실행하면 결과가 여기에 표시됩니다.
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 10 }}>예측 결과</div>
      <div style={{ color: "var(--accent-blue-strong)", fontSize: 28, fontWeight: 800, marginBottom: 10 }}>{result.label}</div>
      {moduleType === "classification" ? (
        <>
          <div style={{ color: "var(--text-secondary)" }}>확률값: {result.score ?? "-"}</div>
          <div style={{ color: "var(--text-secondary)" }}>임계값: {result.threshold}</div>
        </>
      ) : (
        <div style={{ color: "var(--text-secondary)" }}>회귀 예측값입니다.</div>
      )}
    </div>
  )
}
