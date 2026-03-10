function metricPreview(metrics = {}) {
  const entries = Object.entries(metrics).slice(0, 3)
  if (!entries.length) return "-"
  return entries.map(([key, value]) => `${key}: ${value}`).join(" / ")
}

export default function ExperimentLogTable({
  experiments = [],
  selectedExperimentId,
  onSelectExperiment,
  runs = [],
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          overflow: "hidden",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-panel)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 0.7fr 1fr",
            gap: 10,
            padding: "12px 14px",
            background: "var(--bg-surface-soft)",
            color: "var(--text-muted)",
            fontSize: 11,
          }}
        >
          <span>실험명</span>
          <span>Run 수</span>
          <span>최근 상태</span>
        </div>
        {!experiments.length ? <div style={{ padding: 16, color: "var(--text-secondary)" }}>실험 목록이 없습니다.</div> : null}
        {experiments.map((row) => {
          const selected = row.experiment_id === selectedExperimentId
          return (
            <button
              key={row.experiment_id}
              onClick={() => onSelectExperiment?.(row.experiment_id)}
              style={{
                width: "100%",
                border: "none",
                borderTop: "1px solid var(--border)",
                background: selected ? "var(--accent-blue-soft)" : "var(--bg-surface)",
                color: "inherit",
                cursor: "pointer",
                padding: "14px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 0.7fr 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>{row.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                    최근 실행: {row.latest_run_name || "-"}
                  </div>
                </div>
                <span style={{ color: "var(--text-secondary)" }}>{row.run_count}</span>
                <span style={{ color: row.latest_run_status === "FINISHED" ? "var(--success)" : "var(--text-secondary)" }}>
                  {row.latest_run_status || "-"}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          overflow: "hidden",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-panel)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.8fr 1.2fr 2fr",
            gap: 10,
            padding: "12px 14px",
            background: "var(--bg-surface-soft)",
            color: "var(--text-muted)",
            fontSize: 11,
          }}
        >
          <span>Run 이름</span>
          <span>상태</span>
          <span>시작 시간</span>
          <span>주요 지표</span>
        </div>
        {!runs.length ? <div style={{ padding: 16, color: "var(--text-secondary)" }}>선택한 실험의 run 이 없습니다.</div> : null}
        {runs.map((row) => (
          <div
            key={row.run_id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.8fr 1.2fr 2fr",
              gap: 10,
              padding: "12px 14px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            <div style={{ color: "var(--text-primary)" }}>{row.run_name}</div>
            <div style={{ color: row.status === "FINISHED" ? "var(--success)" : "var(--text-secondary)" }}>{row.status}</div>
            <div style={{ color: "var(--text-secondary)" }}>{row.start_time || "-"}</div>
            <div style={{ color: "var(--text-secondary)" }}>{metricPreview(row.metrics)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
