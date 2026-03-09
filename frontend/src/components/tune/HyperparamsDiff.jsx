export default function HyperparamsDiff({ result }) {
  const entries = Object.entries(result?.changed_params || {})

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>하이퍼파라미터 변경</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.length ? (
          entries.map(([key, value]) => (
            <div key={key} style={{ borderTop: "1px solid #1A3352", paddingTop: 8 }}>
              <div style={{ color: "#8BA8C8", fontSize: 11, marginBottom: 4 }}>{key}</div>
              <div style={{ color: "#E2EEFF", fontSize: 12 }}>
                {String(value.before)} → <span style={{ color: "#FBBF24", fontWeight: 700 }}>{String(value.after)}</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: "#8BA8C8", fontSize: 12 }}>변경된 파라미터가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
