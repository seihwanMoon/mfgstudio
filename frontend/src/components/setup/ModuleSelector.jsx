const MODULES = [
  ["classification", "분류", "#38BDF8"],
  ["regression", "회귀", "#FBBF24"],
  ["clustering", "클러스터링", "#34D399"],
  ["anomaly", "이상탐지", "#A78BFA"],
  ["timeseries", "시계열", "#34D399"],
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
              border: `1px solid ${active ? color : "#1A3352"}`,
              background: active ? `${color}15` : "#0D1926",
              color: active ? color : "#8BA8C8",
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
