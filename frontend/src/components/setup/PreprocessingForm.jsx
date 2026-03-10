export default function PreprocessingForm({ params, onChange }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>전처리 옵션</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Toggle label="정규화" checked={params.normalize} onChange={(value) => onChange("normalize", value)} />
        <Toggle label="불균형 보정" checked={params.fix_imbalance} onChange={(value) => onChange("fix_imbalance", value)} />
        <Toggle label="이상치 제거" checked={params.remove_outliers} onChange={(value) => onChange("remove_outliers", value)} />
        <Field label="정규화 방식">
          <select value={params.normalize_method} onChange={(event) => onChange("normalize_method", event.target.value)} style={selectStyle}>
            <option value="zscore">zscore</option>
            <option value="minmax">minmax</option>
            <option value="maxabs">maxabs</option>
          </select>
        </Field>
        <Field label="결측값 처리">
          <select value={params.imputation_type} onChange={(event) => onChange("imputation_type", event.target.value)} style={selectStyle}>
            <option value="simple">simple</option>
            <option value="iterative">iterative</option>
          </select>
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
      {label}
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        borderRadius: 10,
        border: `1px solid ${checked ? "var(--accent-blue)" : "var(--border)"}`,
        background: checked ? "var(--accent-blue-soft)" : "var(--bg-surface-strong)",
        color: checked ? "var(--accent-blue)" : "var(--text-secondary)",
        padding: "12px 14px",
        textAlign: "left",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {label}: {checked ? "ON" : "OFF"}
    </button>
  )
}

const selectStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-surface-strong)",
  color: "var(--text-primary)",
  padding: "10px 12px",
}
