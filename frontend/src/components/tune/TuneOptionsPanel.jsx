export default function TuneOptionsPanel({ options, onChange, onStart, selectedCount, isRunning }) {
  return (
    <div style={{ width: 260, borderRight: "1px solid #1A3352", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, color: "#E2EEFF" }}>튜닝 옵션</h3>
      <Select label="최적화 지표" value={options.optimize} onChange={(value) => onChange("optimize", value)} options={["Accuracy", "AUC", "F1", "Recall"]} />
      <Select label="튜너" value={options.search_library} onChange={(value) => onChange("search_library", value)} options={["optuna"]} />
      <Select label="반복 횟수" value={String(options.n_iter)} onChange={(value) => onChange("n_iter", Number(value))} options={["10", "20", "30"]} />
      <div style={{ color: "#8BA8C8", fontSize: 12 }}>선택 모델: {selectedCount}개</div>
      <button
        onClick={onStart}
        disabled={!selectedCount || isRunning}
        style={{ marginTop: "auto", border: "none", borderRadius: 10, background: "#FBBF24", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        {isRunning ? "튜닝 진행 중..." : "◎ 튜닝 시작"}
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
