export default function Sparkline({ values = [60, 72, 68, 80, 76], color = "#38BDF8" }) {
  const max = Math.max(...values, 1)
  const points = values
    .map((value, index) => `${(index / (values.length - 1 || 1)) * 100},${100 - (value / max) * 100}`)
    .join(" ")

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 40 }}>
      <polyline fill="none" stroke={color} strokeWidth="4" points={points} />
    </svg>
  )
}
