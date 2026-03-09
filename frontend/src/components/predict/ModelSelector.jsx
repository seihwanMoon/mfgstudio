export default function ModelSelector({ models = [], value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", borderRadius: 8, border: "1px solid #1A3352", background: "#0D1926", color: "#E2EEFF", padding: "10px 12px" }}>
      <option value="">모델 선택</option>
      {models.map((model) => (
        <option key={model.name} value={model.name}>
          {model.name}
        </option>
      ))}
    </select>
  )
}
