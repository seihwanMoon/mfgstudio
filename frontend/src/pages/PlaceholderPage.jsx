import Field from "../components/ui/Field"

export default function PlaceholderPage({ title, description }) {
  return (
    <div style={{ height: "100%", padding: 24 }}>
      <div
        style={{
          height: "100%",
          border: "1px solid #1A3352",
          borderRadius: 16,
          background: "linear-gradient(180deg, rgba(17,30,46,.96) 0%, rgba(13,25,38,.96) 100%)",
          padding: 24,
          display: "grid",
          gridTemplateColumns: "1.3fr .9fr",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ color: "#E2EEFF", fontSize: 28, fontWeight: 800 }}>{title}</div>
            <div style={{ color: "#8BA8C8", fontSize: 14, marginTop: 6 }}>{description}</div>
          </div>

          <div
            style={{
              flex: 1,
              border: "1px dashed #234466",
              borderRadius: 14,
              padding: 20,
              background: "rgba(8, 15, 26, 0.5)",
            }}
          >
            <div style={{ color: "#38BDF8", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 12 }}>
              WIREFRAME TARGET
            </div>
            <div style={{ color: "#5A7A9A", lineHeight: 1.7, fontSize: 13 }}>
              이 화면은 현재 초기 부트스트랩 단계입니다. 다음 단계에서 `SCREENS.md` 와
              `wireframe_all_screens.jsx` 기준으로 실제 컴포넌트와 API 연결을 채웁니다.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="상태" value="Bootstrapped" hint="SETUP 단계에서 생성된 초기 페이지" />
          <Field label="다음 작업" value="화면별 실제 컴포넌트 구현" />
          <Field label="문서 기준" value="README / PROGRESS / SCREENS / FRONTEND" />
        </div>
      </div>
    </div>
  )
}
