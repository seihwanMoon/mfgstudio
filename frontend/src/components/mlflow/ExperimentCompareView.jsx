import { formatDateTimeKST, formatMetricValue, formatRunStatus } from "../../utils/formatters"

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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `180px repeat(${sample.length}, minmax(0, 1fr))`,
                gap: 10,
                padding: "12px 14px",
                borderTop: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <span>최근 run</span>
              {sample.map((row) => (
                <span key={`${row.experiment_id}-run`}>{row.latest_run_name || "-"}</span>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `180px repeat(${sample.length}, minmax(0, 1fr))`,
                gap: 10,
                padding: "12px 14px",
                borderTop: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <span>최근 상태</span>
              {sample.map((row) => (
                <span key={`${row.experiment_id}-status`}>{formatRunStatus(row.latest_run_status)}</span>
              ))}
            </div>

            {!metricKeys.length ? (
              <div style={{ padding: 14, borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                비교할 최신 지표가 아직 없습니다.
              </div>
            ) : (
              metricKeys.map((metric) => (
                <div
                  key={metric}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `180px repeat(${sample.length}, minmax(0, 1fr))`,
                    gap: 10,
                    padding: "12px 14px",
                    borderTop: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>{metric}</span>
                  {sample.map((row) => (
                    <span key={`${row.experiment_id}-${metric}`}>
                      {formatMetricValue(row.latest_metrics?.[metric])}
                    </span>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
