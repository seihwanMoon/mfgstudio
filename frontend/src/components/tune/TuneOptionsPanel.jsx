export default function TuneOptionsPanel({
  options,
  onChange,
  onStart,
  selectedCount,
  isRunning,
  metricOptions = [],
  selectedAlgorithms = [],
  activeAlgorithm = "",
  onSelectAlgorithm,
  moduleType = "classification",
}) {
  return (
    <div
      style={{
        width: 260,
        borderRight: "1px solid var(--border)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>튜닝 옵션</h3>
      <Select label="튜닝 대상" value={activeAlgorithm} onChange={onSelectAlgorithm} options={selectedAlgorithms} />
      <Select label="최적화 지표" value={options.optimize} onChange={(value) => onChange("optimize", value)} options={metricOptions} />
      <Select
        label="튜너"
        value={options.search_library}
        onChange={(value) => onChange("search_library", value)}
        options={["scikit-learn"]}
      />
      <Select
        label="반복 횟수"
        value={String(options.n_iter)}
        onChange={(value) => onChange("n_iter", Number(value))}
        options={["10", "20", "30"]}
      />
      {moduleType === "classification" ? (
        <Select
          label="보정 방식"
          value={options.calibration_method || "sigmoid"}
          onChange={(value) => onChange("calibration_method", value)}
          options={["sigmoid", "isotonic"]}
        />
      ) : null}
      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>선택 모델: {selectedCount}개</div>
      <button
        onClick={onStart}
        disabled={!selectedCount || isRunning}
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
        {isRunning ? "튜닝 진행 중..." : "튜닝 시작"}
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
        style={{
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg-surface-strong)",
          color: "var(--text-primary)",
          padding: "10px 12px",
        }}
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
