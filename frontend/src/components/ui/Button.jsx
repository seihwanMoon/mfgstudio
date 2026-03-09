export default function Button({
  children,
  variant = "primary",
  color = "#38BDF8",
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
        borderRadius: 6,
        cursor: "pointer",
        padding: "9px 14px",
        fontSize: 12,
        fontWeight: 700,
        border: isGhost ? "none" : `1px solid ${color}`,
        background: isOutline ? "transparent" : isGhost ? `${color}18` : color,
        color: isOutline || isGhost ? color : "#080F1A",
      }}
    >
      {children}
    </button>
  )
}
