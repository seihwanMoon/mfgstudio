export default function DataQualitySummary({ quality }) {
  if (!quality) return null

  const cards = [
    ["총 행", quality.row_count, "var(--text-primary)"],
    ["총 열", quality.col_count, "var(--text-primary)"],
    ["결측 컬럼", quality.missing_cols, quality.missing_cols ? "var(--warning)" : "var(--success)"],
    ["수치형", quality.numeric_cols, "var(--accent-blue)"],
    ["범주형", quality.categorical_cols, "var(--warning)"],
    ["날짜형", quality.date_cols, "#6AABFF"],
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
      {cards.map(([label, value, color]) => (
        <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 14 }}>
          <div style={{ color: "var(--text-soft)", fontSize: 10, marginBottom: 8 }}>{label}</div>
          <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}
