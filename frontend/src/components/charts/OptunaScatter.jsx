export default function OptunaScatter({ points = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 12, padding: 14, background: "#0D1926" }}>
      <div style={{ fontSize: 11, color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>Optuna Scatter</div>
      <div style={{ height: 180, display: "grid", placeItems: "center", color: "#8BA8C8", fontSize: 12 }}>
        {points.length ? `${points.length}개 trial` : "trial 데이터 없음"}
      </div>
    </div>
  )
}
