export default function Spinner({ size = 18, color = "#38BDF8" }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: "inline-block",
        borderRadius: "50%",
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: "spin 1s linear infinite",
      }}
    />
  )
}
