export default function CompareOptionsPanel({
  options,
  onChange,
  onStart,
  isRunning,
  modelOptions = [],
  metricOptions = [],
}) {
  return (
    <div style={{ width: 260, borderRight: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>비교 옵션</h3>
      <Select label="정렬 기준" value={options.sort} onChange={(value) => onChange("sort", value)} options={metricOptions} />
      <Select label="선택 개수" value={String(options.n_select)} onChange={(value) => onChange("n_select", Number(value))} options={["3", "5", "10"]} />
      <Select label="비교 가능 모델" value="" onChange={() => {}} options={["전체", ...modelOptions]} />
      <button
        onClick={onStart}
        disabled={isRunning}
        style={{
          marginTop: "auto",
          border: "none",
          borderRadius: 10,
          background: "var(--accent-blue)",
          color: "var(--accent-contrast)",
          padding: "12px 14px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {isRunning ? "비교 진행 중..." : "모델 비교 시작"}
      </button>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface-strong)", color: "var(--text-primary)", padding: "10px 12px" }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
