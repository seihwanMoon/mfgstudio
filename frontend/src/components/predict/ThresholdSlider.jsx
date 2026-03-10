export default function ThresholdSlider({ value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--text-secondary)", fontSize: 12 }}>
      분류 임계값
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{Math.round(value * 100)}%</span>
    </label>
  )
}
