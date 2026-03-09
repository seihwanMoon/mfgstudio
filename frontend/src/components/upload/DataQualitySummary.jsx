export default function DataQualitySummary({ quality }) {
  if (!quality) return null

  const cards = [
    ["총 행", quality.row_count, "#E2EEFF"],
    ["총 열", quality.col_count, "#E2EEFF"],
    ["결측 컬럼", quality.missing_cols, quality.missing_cols ? "#FBBF24" : "#34D399"],
    ["수치형", quality.numeric_cols, "#38BDF8"],
    ["범주형", quality.categorical_cols, "#FBBF24"],
    ["날짜형", quality.date_cols, "#A78BFA"],
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
      {cards.map(([label, value, color]) => (
        <div key={label} style={{ border: "1px solid #1A3352", borderRadius: 12, background: "#0D1926", padding: 14 }}>
          <div style={{ color: "#5A7A9A", fontSize: 10, marginBottom: 8 }}>{label}</div>
          <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}
