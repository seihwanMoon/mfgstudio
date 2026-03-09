export default function DataPreviewTable({ preview }) {
  if (!preview?.rows?.length) {
    return (
      <div style={{ border: "1px dashed #234466", borderRadius: 14, minHeight: 280, display: "grid", placeItems: "center", color: "#8BA8C8" }}>
        업로드 후 상위 50행 미리보기가 여기에 표시됩니다.
      </div>
    )
  }

  const columns = preview.columns?.map((column) => column.name) || Object.keys(preview.rows[0])

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ overflow: "auto", maxHeight: 480 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "#111E2E" }}>
            <tr>
              {columns.map((column) => (
                <th key={column} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, color: "#5A7A9A" }}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, index) => (
              <tr key={index} style={{ borderTop: "1px solid #1A3352", background: index % 2 === 0 ? "#0D1926" : "#101B2B" }}>
                {columns.map((column) => {
                  const value = row[column]
                  const missing = value === "" || value === null || value === undefined
                  return (
                    <td
                      key={column}
                      style={{
                        padding: "10px 12px",
                        fontSize: 12,
                        color: missing ? "#FBBF24" : "#E2EEFF",
                        background: missing ? "rgba(251, 191, 36, 0.08)" : "transparent",
                      }}
                    >
                      {missing ? "—" : String(value)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
