function optionKey(option) {
  return `${option.family}:${option.key}`
}

function SourceBadge({ option }) {
  const isNative = option.source_preference === "native"
  const label = isNative ? "native 우선" : "fallback 우선"
  const color = isNative ? "var(--success)" : "var(--warning)"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}18`,
        color,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  )
}

function SupportBadge({ level = "" }) {
  const palette = {
    preferred: { label: "native 강함", color: "var(--success)" },
    conditional: { label: "조건부 native", color: "var(--accent-blue)" },
    fallback_only: { label: "fallback 전용", color: "var(--warning)" },
  }
  const current = palette[level]
  if (!current) return null

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${current.color}55`,
        background: `${current.color}18`,
        color: current.color,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {current.label}
    </span>
  )
}

function ObservationBadge({ status = "none", sampleCount = 0 }) {
  const palette = {
    native_only: { label: "native 관찰", color: "var(--success)" },
    mixed: { label: "혼합 관찰", color: "var(--accent-blue)" },
    fallback_only: { label: "fallback 관찰", color: "var(--warning)" },
    none: { label: "관찰 없음", color: "var(--text-muted)" },
  }
  const current = palette[status] || palette.none
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${current.color}55`,
        background: `${current.color}18`,
        color: current.color,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {current.label} {sampleCount > 0 ? `· ${sampleCount}` : ""}
    </span>
  )
}

export default function PlotSelector({
  plots = [],
  value,
  onChange,
  onRefresh,
  title = "분석 옵션",
  description = "가능하면 PyCaret native 경로를 먼저 사용하고, 실패하면 앱 fallback으로 내려갑니다. 실험별 관찰 이력이 있으면 함께 표시합니다.",
  emptyMessage = "사용 가능한 분석 항목이 없습니다.",
  buttonLabel = "그래프 새로고침",
}) {
  const modelPlots = plots.filter((plot) => plot.family === "plot")
  const xaiPlots = plots.filter((plot) => plot.family === "xai")

  return (
    <div
      style={{
        width: 280,
        borderRight: "1px solid var(--border)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{title}</h3>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>{description}</div>

      <Section title="모델 그래프" items={modelPlots} value={value} onChange={onChange} />
      {xaiPlots.length ? <Section title="XAI 그래프" items={xaiPlots} value={value} onChange={onChange} /> : null}
      {!modelPlots.length && !xaiPlots.length ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{emptyMessage}</div> : null}

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
        {buttonLabel}
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
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span>{plot.label}</span>
              <SourceBadge option={plot} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <SupportBadge level={plot.effective_support_level || plot.support_level} />
              <ObservationBadge status={plot.observed_status} sampleCount={plot.observed_sample_count} />
              {plot.estimator_family_label ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>계열: {plot.estimator_family_label}</span>
              ) : null}
            </div>
            {plot.effective_policy_note ? (
              <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.82 }}>{plot.effective_policy_note}</div>
            ) : plot.notes ? (
              <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.82 }}>{plot.notes}</div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
