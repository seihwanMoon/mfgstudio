export default function RadarCompare({ models = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 12, padding: 14, background: "#0D1926" }}>
      <div style={{ fontSize: 11, color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>Radar Compare</div>
      <div style={{ height: 180, display: "grid", placeItems: "center", color: "#8BA8C8", fontSize: 12 }}>
        {models.length ? `${models.length}개 모델 비교` : "비교할 모델 없음"}
      </div>
    </div>
  )
}
