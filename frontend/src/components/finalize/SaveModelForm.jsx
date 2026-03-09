export default function SaveModelForm({ modelPath }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>저장 결과</div>
      <code style={{ color: "#38BDF8", fontSize: 12 }}>{modelPath || "아직 저장되지 않음"}</code>
    </div>
  )
}
