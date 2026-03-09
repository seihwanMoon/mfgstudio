export default function CompareOptionsPanel({ options, onChange, onStart, isRunning, modelOptions = [] }) {
  return (
    <div style={{ width: 260, borderRight: "1px solid #1A3352", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, color: "#E2EEFF" }}>비교 옵션</h3>
      <Select label="정렬 기준" value={options.sort} onChange={(value) => onChange("sort", value)} options={["Accuracy", "AUC", "F1", "Recall", "Precision"]} />
      <Select label="선택 개수" value={String(options.n_select)} onChange={(value) => onChange("n_select", Number(value))} options={["3", "5", "10"]} />
      <Select label="알고리즘 목록" value="" onChange={() => {}} options={["선택 안 함", ...modelOptions]} />
      <button
        onClick={onStart}
        disabled={isRunning}
        style={{ marginTop: "auto", border: "none", borderRadius: 10, background: "#FBBF24", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        {isRunning ? "비교 진행 중..." : "▶ 비교 시작"}
      </button>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#8BA8C8", fontSize: 12 }}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ borderRadius: 8, border: "1px solid #1A3352", background: "#0D1926", color: "#E2EEFF", padding: "10px 12px" }}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
