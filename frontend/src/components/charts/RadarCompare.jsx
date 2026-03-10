import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"

const METRIC_PRIORITY = ["Accuracy", "AUC", "F1", "Recall", "Precision", "R2", "RMSE", "MAE", "MSE", "MAPE", "RMSLE"]
const LOWER_IS_BETTER = new Set(["RMSE", "MAE", "MSE", "MAPE", "RMSLE"])
const COLORS = ["#1677FF", "#34D399", "#D99A11"]

export default function RadarCompare({ models = [] }) {
  const metricKeys = Array.from(new Set(models.flatMap((model) => Object.keys(model.metrics || {}))))
    .sort((a, b) => {
      const aIndex = METRIC_PRIORITY.indexOf(a)
      const bIndex = METRIC_PRIORITY.indexOf(b)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
    .slice(0, 5)

  const chartData = metricKeys.map((metric) => {
    const values = models.map((model) => Number(model.metrics?.[metric] ?? 0))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = max - min || 1
    const row = { metric }

    models.forEach((model, index) => {
      const rawValue = Number(model.metrics?.[metric] ?? 0)
      const normalized = LOWER_IS_BETTER.has(metric) ? (max - rawValue) / spread : (rawValue - min) / spread
      row[`model_${index}`] = Number((normalized * 100).toFixed(1))
    })

    return row
  })

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 700, marginBottom: 10 }}>Radar Compare</div>
      <div style={{ height: 220 }}>
        {models.length && metricKeys.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {models.map((model, index) => (
                <Radar
                  key={model.algorithm}
                  name={model.algorithm}
                  dataKey={`model_${index}`}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            비교할 모델이 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
