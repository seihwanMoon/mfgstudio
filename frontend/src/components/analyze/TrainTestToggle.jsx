export default function TrainTestToggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        borderRadius: 10,
        border: `1px solid ${value ? "#A78BFA" : "#1A3352"}`,
        background: value ? "rgba(167, 139, 250, 0.12)" : "#0D1926",
        color: value ? "#A78BFA" : "#8BA8C8",
        padding: "10px 12px",
        cursor: "pointer",
      }}
    >
      {value ? "Train Data" : "Test Data"}
    </button>
  )
}
