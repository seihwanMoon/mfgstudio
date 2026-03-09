const TYPE_COLORS = {
  numeric: "#38BDF8",
  categorical: "#FBBF24",
  date: "#A78BFA",
  ignore: "#8BA8C8",
}

export default function ColumnTypeTable({ columns = [], overrides = {}, onChange }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: "10px 14px", background: "#111E2E", color: "#5A7A9A", fontSize: 10 }}>
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
              borderTop: "1px solid #1A3352",
              background: "#0D1926",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#E2EEFF", fontSize: 12 }}>{column.name}</span>
            <span style={{ color: TYPE_COLORS[selected] || "#8BA8C8", fontSize: 11, fontWeight: 700 }}>{selected}</span>
            <span style={{ color: column.missing_pct > 5 ? "#F87171" : "#8BA8C8", fontSize: 11 }}>
              {column.missing_pct ?? 0}%
            </span>
            <select
              value={selected}
              onChange={(event) => onChange(column.name, event.target.value)}
              style={{ borderRadius: 8, border: "1px solid #1A3352", background: "#111E2E", color: "#E2EEFF", padding: "8px 10px" }}
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
