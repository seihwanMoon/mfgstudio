export default function RadarCompare({ models = [] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 700, marginBottom: 10 }}>Radar Compare</div>
      <div style={{ height: 180, display: "grid", placeItems: "center", color: "var(--text-secondary)", fontSize: 12 }}>
        {models.length ? `${models.length}개 모델 비교` : "비교할 모델이 없습니다"}
      </div>
    </div>
  )
}
