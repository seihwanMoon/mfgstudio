export default function SinglePredictForm({ values, onChange, onSubmit }) {
  const fields = [
    ["temperature", "88.5"],
    ["pressure", "4.62"],
    ["humidity", "66.2"],
    ["vibration", "12.1"],
  ]

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>단건 예측 입력</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {fields.map(([field, placeholder]) => (
          <label key={field} style={{ display: "flex", flexDirection: "column", gap: 6, color: "#8BA8C8", fontSize: 12 }}>
            {field}
            <input value={values[field] ?? ""} placeholder={placeholder} onChange={(event) => onChange(field, event.target.value)} style={{ borderRadius: 8, border: "1px solid #1A3352", background: "#111E2E", color: "#E2EEFF", padding: "10px 12px" }} />
          </label>
        ))}
      </div>
      <button onClick={onSubmit} style={{ width: "100%", marginTop: 12, border: "none", borderRadius: 10, background: "#34D399", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}>
        예측 실행
      </button>
    </div>
  )
}
