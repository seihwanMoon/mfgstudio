export default function TuneBeforeAfter({ result }) {
  if (!result) {
    return (
      <div style={{ border: "1px dashed #234466", borderRadius: 14, minHeight: 180, display: "grid", placeItems: "center", color: "#8BA8C8" }}>
        튜닝 완료 후 전후 비교가 표시됩니다.
      </div>
    )
  }

  const keys = Object.keys(result.before_metrics || {})
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, padding: "10px 14px", background: "#111E2E", color: "#5A7A9A", fontSize: 10 }}>
        <span>지표</span>
        <span>Before</span>
        <span>After</span>
      </div>
      {keys.map((key) => (
        <div key={key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, padding: "12px 14px", borderTop: "1px solid #1A3352", background: "#0D1926" }}>
          <span style={{ color: "#E2EEFF", fontWeight: 700 }}>{key}</span>
          <span style={{ color: "#8BA8C8" }}>{result.before_metrics[key]}</span>
          <span style={{ color: "#34D399" }}>{result.after_metrics[key]}</span>
        </div>
      ))}
    </div>
  )
}
