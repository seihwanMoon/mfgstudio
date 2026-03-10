const TYPE_COLORS = {
  numeric: "#1677FF",
  categorical: "#D99A11",
  date: "#6AABFF",
  ignore: "#7C95B3",
}

export default function ColumnTypeTable({ columns = [], overrides = {}, onChange }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: "10px 14px", background: "var(--bg-surface-strong)", color: "var(--text-soft)", fontSize: 10 }}>
        <span>컬럼명</span>
        <span>타입</span>
        <span>결측률</span>
        <span>변경</span>
      </div>
      {columns.map((column) => {
        const selected = overrides[column.name] || column.type
        return (
          <div
            key={column.name}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 10,
              padding: "10px 14px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-surface)",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--text-primary)", fontSize: 12 }}>{column.name}</span>
            <span style={{ color: TYPE_COLORS[selected] || "var(--text-secondary)", fontSize: 11, fontWeight: 700 }}>{selected}</span>
            <span style={{ color: column.missing_pct > 5 ? "var(--danger)" : "var(--text-secondary)", fontSize: 11 }}>{column.missing_pct ?? 0}%</span>
            <select
              value={selected}
              onChange={(event) => onChange(column.name, event.target.value)}
              style={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface-strong)", color: "var(--text-primary)", padding: "8px 10px" }}
            >
              <option value="numeric">numeric</option>
              <option value="categorical">categorical</option>
              <option value="date">date</option>
              <option value="ignore">ignore</option>
            </select>
          </div>
        )
      })}
    </div>
  )
}
