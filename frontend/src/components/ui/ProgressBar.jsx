export default function ProgressBar({ label, value, color = "#38BDF8" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
        <span style={{ color: "#8BA8C8" }}>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "#1A3352" }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 999, background: color }} />
      </div>
    </div>
  )
}
