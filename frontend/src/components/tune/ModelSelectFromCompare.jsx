export default function ModelSelectFromCompare({ algorithms = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>비교 결과 선택 모델</div>
      <div style={{ color: "#8BA8C8", fontSize: 12 }}>{algorithms.length ? algorithms.join(", ") : "선택된 모델이 없습니다."}</div>
    </div>
  )
}
