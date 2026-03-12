import useStore from "../../store/useStore"

const METRIC_PRIORITY = {
  classification: ["Accuracy", "AUC", "F1", "Recall", "Precision"],
  regression: ["R2", "RMSE", "MAE", "MSE", "MAPE", "RMSLE"],
  clustering: ["Silhouette", "Calinski-Harabasz", "Davies-Bouldin"],
  anomaly: ["AUC", "Recall", "Precision"],
  timeseries: ["MAE", "RMSE", "MAPE", "SMAPE"],
}

export default function LeaderboardTable({ results = [] }) {
  const { selectedModelsForTune, toggleSelectModel, setupParams } = useStore()
  const moduleType = setupParams.module_type || "classification"
  const metricsFromRows = Array.from(new Set(results.flatMap((row) => Object.keys(row.metrics || {}))))
  const metricKeys = [
    ...(METRIC_PRIORITY[moduleType] || []).filter((metric) => metricsFromRows.includes(metric)),
    ...metricsFromRows.filter((metric) => !(METRIC_PRIORITY[moduleType] || []).includes(metric)),
  ].slice(0, 5)
  const gridTemplateColumns = `40px 2fr repeat(${metricKeys.length}, 1fr) 90px`

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ display: "grid", gridTemplateColumns, gap: 10, padding: "10px 14px", background: "var(--bg-surface-strong)", color: "var(--text-soft)", fontSize: 10 }}>
        <span />
        <span>알고리즘</span>
        {metricKeys.map((metric) => (
          <span key={metric}>{metric}</span>
        ))}
        <span>TT(s)</span>
      </div>
      {results.map((row, index) => {
        const selected = selectedModelsForTune.includes(row.algorithm)
        return (
          <div
            key={row.algorithm}
            onClick={() => toggleSelectModel(row.algorithm)}
            style={{
              display: "grid",
              gridTemplateColumns,
              gap: 10,
              padding: "12px 14px",
              borderTop: "1px solid var(--border)",
              background: selected
                ? "rgba(56, 189, 248, 0.12)"
                : index === 0
                  ? "rgba(217, 154, 17, 0.08)"
                  : "var(--bg-surface)",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggleSelectModel(row.algorithm)}
              onClick={(event) => event.stopPropagation()}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: index === 0 ? "var(--warning)" : "var(--text-primary)", fontWeight: 700 }}>
                <span>{row.algorithm}</span>
                {index === 0 ? <Pill color="rgba(217, 154, 17, 0.14)" border="rgba(217, 154, 17, 0.3)" textColor="var(--warning)">최고 추천</Pill> : null}
                {row.operation ? <Pill color="rgba(56, 189, 248, 0.12)" border="rgba(56, 189, 248, 0.28)" textColor="var(--accent-blue-strong)">{row.operation}</Pill> : null}
                {row.is_tuned ? <Pill color="rgba(52, 211, 153, 0.12)" border="rgba(52, 211, 153, 0.28)" textColor="var(--success)">tuned</Pill> : null}
              </div>
              {row.resolved_model_name ? <div style={{ color: "var(--text-soft)", fontSize: 11 }}>실제 추정기: {row.resolved_model_name}</div> : null}
              {row.members?.length ? <div style={{ color: "var(--text-soft)", fontSize: 11 }}>구성 모델: {row.members.join(", ")}</div> : null}
            </div>
            {metricKeys.map((metric) => (
              <Metric key={metric} value={row.metrics?.[metric]} />
            ))}
            <Metric value={row.tt_sec} />
          </div>
        )
      })}
    </div>
  )
}

function Metric({ value }) {
  const normalized = typeof value === "number" ? Number(value.toFixed(4)) : value
  return <span style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{normalized ?? "-"}</span>
}

function Pill({ children, color, border, textColor }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        background: color,
        border: `1px solid ${border}`,
        color: textColor,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  )
}
