import { formatDateTimeKST, formatMetricValue, formatRunStatus } from "../../utils/formatters"

function ComparisonRow({ label, values }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `180px repeat(${values.length}, minmax(0, 1fr))`,
        gap: 10,
        padding: "12px 14px",
        borderTop: "1px solid var(--border)",
        color: "var(--text-secondary)",
      }}
    >
      <span>{label}</span>
      {values.map((value, index) => (
        <span key={`${label}-${index}`}>{value}</span>
      ))}
    </div>
  )
}

export default function ExperimentCompareView({ experiments = [] }) {
  const sample = experiments.slice(0, 3)
  const metricKeys = [...new Set(sample.flatMap((row) => Object.keys(row.latest_metrics || {})))]

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
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 10 }}>실험 비교 요약</div>
      {!sample.length ? (
        <div style={{ color: "var(--text-secondary)" }}>비교할 MLflow 실험이 아직 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {sample.map((row) => (
              <div
                key={row.experiment_id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 14,
                  background: "var(--bg-surface-soft)",
                }}
              >
                <div style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 8 }}>{row.name}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.8 }}>
                  <div>Run 수: {row.run_count}</div>
                  <div>최근 실행: {row.latest_run_name || "-"}</div>
                  <div>최근 상태: {formatRunStatus(row.latest_run_status)}</div>
                  <div>최근 시각: {formatDateTimeKST(row.latest_start_time)}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
              background: "var(--bg-surface-soft)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `180px repeat(${sample.length}, minmax(0, 1fr))`,
                gap: 10,
                padding: "12px 14px",
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              <span>비교 항목</span>
              {sample.map((row) => (
                <span key={row.experiment_id}>{row.name}</span>
              ))}
            </div>

            <ComparisonRow label="최근 run" values={sample.map((row) => row.latest_run_name || "-")} />
            <ComparisonRow label="최근 상태" values={sample.map((row) => formatRunStatus(row.latest_run_status))} />
            <ComparisonRow label="최근 시각" values={sample.map((row) => formatDateTimeKST(row.latest_start_time))} />

            {!metricKeys.length ? (
              <div style={{ padding: 14, borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                비교할 최신 지표가 아직 없습니다.
              </div>
            ) : (
              metricKeys.map((metric) => (
                <ComparisonRow
                  key={metric}
                  label={metric}
                  values={sample.map((row) => formatMetricValue(row.latest_metrics?.[metric]))}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
