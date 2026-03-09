import useStore from "../../store/useStore"

export default function LeaderboardTable({ results = [] }) {
  const { selectedModelsForTune, toggleSelectModel } = useStore()

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 2fr repeat(5, 1fr) 90px", gap: 10, padding: "10px 14px", background: "#111E2E", color: "#5A7A9A", fontSize: 10 }}>
        <span />
        <span>알고리즘</span>
        <span>Accuracy</span>
        <span>AUC</span>
        <span>F1</span>
        <span>Recall</span>
        <span>Precision</span>
        <span>TT(s)</span>
      </div>
      {results.map((row, index) => {
        const selected = selectedModelsForTune.includes(row.algorithm)
        return (
          <div
            key={row.algorithm}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 2fr repeat(5, 1fr) 90px",
              gap: 10,
              padding: "12px 14px",
              borderTop: "1px solid #1A3352",
              background: index === 0 ? "rgba(251, 191, 36, 0.08)" : "#0D1926",
              alignItems: "center",
            }}
          >
            <input type="checkbox" checked={selected} onChange={() => toggleSelectModel(row.algorithm)} />
            <div style={{ color: index === 0 ? "#FBBF24" : "#E2EEFF", fontWeight: 700 }}>{row.algorithm}</div>
            <Metric value={row.metrics?.Accuracy} />
            <Metric value={row.metrics?.AUC} />
            <Metric value={row.metrics?.F1} />
            <Metric value={row.metrics?.Recall} />
            <Metric value={row.metrics?.Precision} />
            <Metric value={row.tt_sec} />
          </div>
        )
      })}
    </div>
  )
}

function Metric({ value }) {
  return <span style={{ color: "#8BA8C8", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{value ?? "—"}</span>
}
