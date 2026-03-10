const MODULES = [
  ["classification", "분류", "#1677FF"],
  ["regression", "회귀", "#2E8BFF"],
  ["clustering", "클러스터링", "#4A9DFF"],
  ["anomaly", "이상탐지", "#6AABFF"],
  ["timeseries", "시계열", "#94C3FF"],
]

export default function ModuleSelector({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
      {MODULES.map(([module, label, color]) => {
        const active = value === module
        return (
          <button
            key={module}
            onClick={() => onChange(module)}
            style={{
              borderRadius: 10,
              cursor: "pointer",
              padding: "12px 10px",
              border: `1px solid ${active ? color : "var(--border)"}`,
              background: active ? `${color}18` : "var(--bg-surface)",
              color: active ? color : "var(--text-secondary)",
              boxShadow: "var(--shadow-panel)",
              fontWeight: 700,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
