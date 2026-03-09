export default function PipelineSummary({ steps = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>파이프라인 구성</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.length ? steps.map((step) => <div key={step} style={{ color: "#8BA8C8" }}>{step}</div>) : <div style={{ color: "#8BA8C8" }}>기록된 단계가 없습니다.</div>}
      </div>
    </div>
  )
}
