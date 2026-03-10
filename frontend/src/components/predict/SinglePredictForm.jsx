export default function SinglePredictForm({ columns = [], values, onChange, onSubmit }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 8 }}>단건 예측 입력</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
        선택한 모델의 실제 입력 컬럼 기준으로 폼이 구성됩니다.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {columns.map((column) => (
          <label key={column.name} style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
            {column.label}
            <input
              type={column.type === "numeric" ? "number" : "text"}
              step={column.type === "numeric" ? "any" : undefined}
              value={values[column.name] ?? ""}
              onChange={(event) => onChange(column.name, event.target.value, column.type)}
              style={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg-surface-soft)",
                color: "var(--text-primary)",
                padding: "12px 14px",
              }}
            />
          </label>
        ))}
      </div>
      <button
        onClick={onSubmit}
        style={{
          width: "100%",
          marginTop: 14,
          border: "none",
          borderRadius: 12,
          background: "var(--success)",
          color: "white",
          padding: "13px 14px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        예측 실행
      </button>
    </div>
  )
}
