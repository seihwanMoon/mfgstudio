export default function TrainTestToggle({ value, onChange, moduleType = "classification" }) {
  const label =
    moduleType === "timeseries"
      ? value
        ? "기본 시계열 보기"
        : "미래 예측 강조"
      : value
        ? "학습 데이터 기준"
        : "테스트 데이터 기준"

  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        borderRadius: 12,
        border: `1px solid ${value ? "var(--accent-blue)" : "var(--border)"}`,
        background: value ? "var(--accent-blue-soft)" : "var(--bg-surface-soft)",
        color: value ? "var(--accent-blue-strong)" : "var(--text-secondary)",
        padding: "12px 14px",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  )
}
