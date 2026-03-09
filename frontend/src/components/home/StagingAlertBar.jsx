import Button from "../ui/Button"

export default function StagingAlertBar({ count = 0 }) {
  if (!count) {
    return null
  }

  return (
    <div
      style={{
        border: "1px solid #29552F",
        background: "rgba(52, 211, 153, 0.1)",
        color: "#34D399",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13 }}>
        Staging 대기 모델 {count}개가 있습니다. 현재 구현에서는 Production 데이터만 조회합니다.
      </div>
      <Button variant="outline" color="#34D399">
        레지스트리 보기
      </Button>
    </div>
  )
}
