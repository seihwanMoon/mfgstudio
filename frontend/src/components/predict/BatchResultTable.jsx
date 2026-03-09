export default function BatchResultTable({ rows = [] }) {
  if (!rows.length) {
    return <div style={{ border: "1px dashed #234466", borderRadius: 14, minHeight: 180, display: "grid", placeItems: "center", color: "#8BA8C8" }}>배치 예측 결과가 없습니다.</div>
  }

  const columns = Object.keys(rows[0])
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ overflow: "auto", maxHeight: 360 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#111E2E", position: "sticky", top: 0 }}>
            <tr>
              {columns.map((column) => (
                <th key={column} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, color: "#5A7A9A" }}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} style={{ borderTop: "1px solid #1A3352", background: row.label === "positive" ? "rgba(248, 113, 113, 0.08)" : "#0D1926" }}>
                {columns.map((column) => (
                  <td key={column} style={{ padding: "10px 12px", fontSize: 12, color: "#E2EEFF" }}>
                    {String(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
