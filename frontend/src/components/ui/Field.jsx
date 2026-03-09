export default function Field({ label, value, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ color: "#5A7A9A", fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{label}</label>
      <div style={{ border: "1px solid #1A3352", borderRadius: 6, background: "#0D1926", padding: "10px 12px", fontSize: 12 }}>
        {value}
      </div>
      {hint ? <div style={{ color: "#3D5A78", fontSize: 10 }}>{hint}</div> : null}
    </div>
  )
}
