export default function PredictResultCard({ result }) {
  if (!result) {
    return <div style={{ border: "1px dashed #234466", borderRadius: 14, minHeight: 160, display: "grid", placeItems: "center", color: "#8BA8C8" }}>예측 실행 후 결과가 여기에 표시됩니다.</div>
  }

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>예측 결과</div>
      <div style={{ color: result.label === "positive" ? "#F87171" : "#34D399", fontSize: 30, fontWeight: 800, marginBottom: 8 }}>{result.label}</div>
      <div style={{ color: "#8BA8C8" }}>score: {result.score}</div>
      <div style={{ color: "#8BA8C8" }}>threshold: {result.threshold}</div>
    </div>
  )
}
