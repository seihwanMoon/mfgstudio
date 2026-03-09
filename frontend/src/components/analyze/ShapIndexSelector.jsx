export default function ShapIndexSelector({ value, onChange, onAnalyze }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>SHAP Index 선택</div>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", borderRadius: 8, border: "1px solid #1A3352", background: "#111E2E", color: "#E2EEFF", padding: "10px 12px", marginBottom: 10 }}
      />
      <button
        onClick={onAnalyze}
        style={{ width: "100%", border: "none", borderRadius: 10, background: "#34D399", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        SHAP 분석
      </button>
    </div>
  )
}
