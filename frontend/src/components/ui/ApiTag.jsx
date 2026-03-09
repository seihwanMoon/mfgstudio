export default function ApiTag({ method = "GET", path }) {
  const colorMap = {
    GET: "#38BDF8",
    POST: "#FBBF24",
    PUT: "#34D399",
    PATCH: "#A78BFA",
    WS: "#A78BFA",
  }
  const color = colorMap[method] || "#8BA8C8"

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          padding: "2px 6px",
          borderRadius: 4,
          border: `1px solid ${color}55`,
          background: `${color}15`,
          color,
          fontSize: 9,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {method}
      </span>
      <code style={{ color: "#8BA8C8", fontSize: 10 }}>{path}</code>
    </div>
  )
}
