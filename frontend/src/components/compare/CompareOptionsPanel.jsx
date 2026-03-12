const SCOPE_OPTIONS = [
  { value: "all", label: "전체 모델" },
  { value: "turbo", label: "빠른 모델만" },
  { value: "full", label: "정밀 비교 모델" },
]

const FAMILY_LABELS = {
  all: "전체 계열",
  anomaly: "이상 탐지",
  boosting: "부스팅",
  clustering: "클러스터링",
  ensemble: "앙상블",
  forecasting: "시계열",
  linear: "선형",
  neighbors: "최근접 이웃",
  other: "기타",
  probabilistic: "확률 기반",
  svm: "서포트 벡터",
  tree: "트리",
}

export default function CompareOptionsPanel({
  options,
  onChange,
  onStart,
  isRunning,
  metricOptions = [],
  familyOptions = [],
  totalModelCount = 0,
  filteredModelCount = 0,
}) {
  const familySelectOptions = [
    { value: "all", label: FAMILY_LABELS.all },
    ...familyOptions.map((family) => ({
      value: family,
      label: FAMILY_LABELS[family] || family,
    })),
  ]

  return (
    <div style={{ width: 260, borderRight: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>비교 옵션</h3>
      <Select label="정렬 기준" value={options.sort} onChange={(value) => onChange("sort", value)} options={metricOptions.map((option) => ({ value: option, label: option }))} />
      <Select label="선택 개수" value={String(options.n_select)} onChange={(value) => onChange("n_select", Number(value))} options={["3", "5", "10"].map((option) => ({ value: option, label: option }))} />
      <Select label="모델 범위" value={options.catalog_scope || "all"} onChange={(value) => onChange("catalog_scope", value)} options={SCOPE_OPTIONS} />
      <Select label="모델 계열" value={options.family || "all"} onChange={(value) => onChange("family", value)} options={familySelectOptions} />
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--bg-surface-soft)",
          padding: "10px 12px",
          color: "var(--text-secondary)",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        비교 대상: <strong style={{ color: "var(--text-primary)" }}>{filteredModelCount}</strong> / {totalModelCount}
        <br />
        현재 필터에 맞는 PyCaret 모델만 `compare_models()`에 포함됩니다.
      </div>
      <button
        onClick={onStart}
        disabled={isRunning || filteredModelCount === 0}
        style={{
          marginTop: "auto",
          border: "none",
          borderRadius: 10,
          background: "var(--accent-blue)",
          color: "var(--accent-contrast)",
          padding: "12px 14px",
          fontWeight: 800,
          cursor: isRunning || filteredModelCount === 0 ? "not-allowed" : "pointer",
          opacity: isRunning || filteredModelCount === 0 ? 0.6 : 1,
        }}
      >
        {isRunning ? "모델 비교 진행 중..." : "모델 비교 시작"}
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
