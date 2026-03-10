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
            style={{
              display: "grid",
              gridTemplateColumns,
              gap: 10,
              padding: "12px 14px",
              borderTop: "1px solid var(--border)",
              background: index === 0 ? "rgba(217, 154, 17, 0.08)" : "var(--bg-surface)",
              alignItems: "center",
            }}
          >
            <input type="checkbox" checked={selected} onChange={() => toggleSelectModel(row.algorithm)} />
            <div style={{ color: index === 0 ? "var(--warning)" : "var(--text-primary)", fontWeight: 700 }}>{row.algorithm}</div>
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
