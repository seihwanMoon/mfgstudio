export default function TrainTestToggle({ value, onChange }) {
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
      {value ? "학습 데이터 기준" : "테스트 데이터 기준"}
    </button>
  )
}
