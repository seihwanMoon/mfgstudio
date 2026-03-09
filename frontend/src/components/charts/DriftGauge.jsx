export default function DriftGauge({ value = 0, label = "DRIFT" }) {
  const color = value > 0.4 ? "#F87171" : value > 0.2 ? "#FBBF24" : "#34D399"
  const pct = Math.round(value * 100)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#8BA8C8", fontSize: 10 }}>{label}</span>
        <span style={{ color, fontSize: 10, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#1A3352", borderRadius: 999 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color }} />
      </div>
    </div>
  )
}
