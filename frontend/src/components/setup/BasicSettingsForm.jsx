export default function BasicSettingsForm({ params, columns = [], onChange }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <h3 style={{ marginTop: 0, color: "#E2EEFF" }}>기본 설정</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="타겟 컬럼">
          <select value={params.target_col} onChange={(event) => onChange("target_col", event.target.value)} style={selectStyle}>
            <option value="">선택</option>
            {columns.map((column) => (
              <option key={column.name ?? column} value={column.name ?? column}>
                {column.name ?? column}
              </option>
            ))}
          </select>
        </Field>
        <Field label="실험 이름">
          <input value={params.experiment_name} onChange={(event) => onChange("experiment_name", event.target.value)} style={inputStyle} />
        </Field>
        <Field label="학습 비율">
          <input type="number" step="0.1" min="0.1" max="0.9" value={params.train_size} onChange={(event) => onChange("train_size", Number(event.target.value))} style={inputStyle} />
        </Field>
        <Field label="Fold">
          <input type="number" min="2" max="20" value={params.fold} onChange={(event) => onChange("fold", Number(event.target.value))} style={inputStyle} />
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#8BA8C8", fontSize: 12 }}>
      {label}
      {children}
    </label>
  )
}

const inputStyle = {
  borderRadius: 8,
  border: "1px solid #1A3352",
  background: "#111E2E",
  color: "#E2EEFF",
  padding: "10px 12px",
}

const selectStyle = inputStyle
