export default function Button({
  children,
  variant = "primary",
  color = "var(--accent-blue)",
  fullWidth = false,
  ...props
}) {
  const isOutline = variant === "outline"
  const isGhost = variant === "ghost"

  return (
    <button
      {...props}
      style={{
        width: fullWidth ? "100%" : "auto",
        borderRadius: 10,
        cursor: "pointer",
        padding: "11px 15px",
        fontSize: 13,
        fontWeight: 700,
        border: isGhost ? "none" : `1px solid ${color}`,
        background: isOutline ? "transparent" : isGhost ? `${color}18` : color,
        color: isOutline || isGhost ? color : "var(--accent-contrast)",
      }}
    >
      {children}
    </button>
  )
}
