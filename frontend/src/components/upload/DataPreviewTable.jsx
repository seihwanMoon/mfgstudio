export default function DataPreviewTable({ preview }) {
  if (!preview?.rows?.length) {
    return (
      <div style={{ border: "1px dashed var(--border-strong)", borderRadius: 14, minHeight: 280, display: "grid", placeItems: "center", color: "var(--text-secondary)", background: "var(--bg-surface)" }}>
        업로드 후 상위 50행 미리보기가 여기에 표시됩니다.
      </div>
    )
  }

  const columns = preview.columns?.map((column) => column.name) || Object.keys(preview.rows[0])

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)" }}>
      <div style={{ overflow: "auto", maxHeight: 480 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface-strong)" }}>
            <tr>
              {columns.map((column) => (
                <th key={column} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, color: "var(--text-soft)" }}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, index) => (
              <tr key={index} style={{ borderTop: "1px solid var(--border)", background: index % 2 === 0 ? "var(--bg-surface)" : "var(--bg-surface-soft)" }}>
                {columns.map((column) => {
                  const value = row[column]
                  const missing = value === "" || value === null || value === undefined
                  return (
                    <td
                      key={column}
                      style={{
                        padding: "10px 12px",
                        fontSize: 12,
                        color: missing ? "var(--warning)" : "var(--text-primary)",
                        background: missing ? "rgba(217, 154, 17, 0.08)" : "transparent",
                      }}
                    >
                      {missing ? "-" : String(value)}
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
