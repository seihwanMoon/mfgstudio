function optionKey(option) {
  return `${option.family}:${option.key}`
}

export default function PlotSelector({ plots = [], value, onChange, onRefresh }) {
  const modelPlots = plots.filter((plot) => plot.family === "plot")
  const xaiPlots = plots.filter((plot) => plot.family === "xai")

  return (
    <div
      style={{
        width: 260,
        borderRight: "1px solid var(--border)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>분석 항목 선택</h3>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
        진단 플롯과 XAI 플롯을 선택해 모델 거동과 설명 가능성을 함께 확인합니다.
      </div>

      <Section title="모델 플롯" items={modelPlots} value={value} onChange={onChange} />
      {xaiPlots.length ? <Section title="XAI 플롯" items={xaiPlots} value={value} onChange={onChange} /> : null}

      <button
        onClick={onRefresh}
        style={{
          marginTop: "auto",
          border: "none",
          borderRadius: 12,
          background: "var(--accent-blue)",
          color: "white",
          padding: "13px 14px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        플롯 다시 생성
      </button>
    </div>
  )
}

function Section({ title, items, value, onChange }) {
  if (!items.length) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ color: "var(--text-soft)", fontSize: 11, fontWeight: 800 }}>{title}</div>
      {items.map((plot) => {
        const currentKey = optionKey(plot)
        const selected = value === currentKey
        return (
          <button
            key={currentKey}
            onClick={() => onChange(currentKey)}
            style={{
              borderRadius: 12,
              cursor: "pointer",
              padding: "12px 14px",
              textAlign: "left",
              border: `1px solid ${selected ? "var(--accent-blue)" : "var(--border)"}`,
              background: selected ? "var(--accent-blue-soft)" : "var(--bg-surface-soft)",
              color: selected ? "var(--accent-blue-strong)" : "var(--text-secondary)",
              fontWeight: selected ? 700 : 500,
            }}
          >
            {plot.label}
          </button>
        )
      })}
    </div>
  )
}
