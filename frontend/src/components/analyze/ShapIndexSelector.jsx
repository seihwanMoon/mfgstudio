export default function ShapIndexSelector({ value, onChange, onAnalyze, disabled = false, helperText = "" }) {
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
      <div style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 8 }}>SHAP 분석 행 선택</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
        {helperText || "테스트 데이터의 몇 번째 행을 설명할지 입력합니다. 예: `0`은 첫 번째 샘플입니다."}
      </div>
      <input
        type="number"
        min="0"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-surface-soft)",
          color: "var(--text-primary)",
          padding: "12px 14px",
          marginBottom: 12,
          opacity: disabled ? 0.6 : 1,
        }}
      />
      <button
        onClick={onAnalyze}
        disabled={disabled}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 12,
          background: disabled ? "var(--bg-surface-soft)" : "var(--success)",
          color: disabled ? "var(--text-muted)" : "white",
          padding: "13px 14px",
          fontWeight: 800,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        SHAP 분석 실행
      </button>
    </div>
  )
}
