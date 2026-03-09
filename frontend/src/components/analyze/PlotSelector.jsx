export default function PlotSelector({ plots = [], value, onChange, onRefresh }) {
  return (
    <div style={{ width: 220, borderRight: "1px solid #1A3352", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <h3 style={{ margin: 0, color: "#E2EEFF" }}>플롯 선택</h3>
      {plots.map((plot) => (
        <button
          key={plot}
          onClick={() => onChange(plot)}
          style={{
            borderRadius: 10,
            cursor: "pointer",
            padding: "10px 12px",
            textAlign: "left",
            border: `1px solid ${value === plot ? "#A78BFA" : "#1A3352"}`,
            background: value === plot ? "rgba(167, 139, 250, 0.12)" : "#0D1926",
            color: value === plot ? "#A78BFA" : "#8BA8C8",
          }}
        >
          {plot}
        </button>
      ))}
      <button
        onClick={onRefresh}
        style={{ marginTop: "auto", border: "none", borderRadius: 10, background: "#A78BFA", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        플롯 생성
      </button>
    </div>
  )
}
