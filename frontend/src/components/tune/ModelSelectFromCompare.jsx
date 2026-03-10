export default function ModelSelectFromCompare({ algorithms = [] }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 14,
      }}
    >
      <div style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 10 }}>비교 결과 선택 모델</div>
      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        {algorithms.length ? algorithms.join(", ") : "선택된 모델이 없습니다."}
      </div>
    </div>
  )
}
