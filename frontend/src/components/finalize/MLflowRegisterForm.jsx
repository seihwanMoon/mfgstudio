export default function MLflowRegisterForm({ value, onChange, onRegister }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>레지스트리 등록</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: "100%", borderRadius: 8, border: "1px solid #1A3352", background: "#111E2E", color: "#E2EEFF", padding: "10px 12px", marginBottom: 10 }}
      />
      <button
        onClick={onRegister}
        style={{ width: "100%", border: "none", borderRadius: 10, background: "#34D399", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        레지스트리 등록
      </button>
    </div>
  )
}
