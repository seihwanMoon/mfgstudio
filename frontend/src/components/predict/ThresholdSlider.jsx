export default function ThresholdSlider({ value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#8BA8C8", fontSize: 12 }}>
      확률 임계값
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span>{Math.round(value * 100)}%</span>
    </label>
  )
}
