export default function MLflowRegisterForm({ value, onChange, onRegister }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 8 }}>레지스트리 등록</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
        `finalize`된 모델 파일을 같은 이름의 버전 체계로 묶어 운영 관리 대상으로 등록합니다.
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface-soft)", color: "var(--text-primary)", padding: "12px 14px", marginBottom: 12 }}
      />
      <button
        onClick={onRegister}
        style={{ width: "100%", border: "none", borderRadius: 12, background: "var(--success)", color: "white", padding: "13px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        레지스트리 등록
      </button>
    </div>
  )
}
