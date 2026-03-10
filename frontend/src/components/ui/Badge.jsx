export default function Badge({ children, color = "var(--accent-blue)" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}15`,
        color,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  )
}
