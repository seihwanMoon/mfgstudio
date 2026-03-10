import Button from "../ui/Button"

export default function StagingAlertBar({ count = 0 }) {
  if (!count) {
    return null
  }

  return (
    <div
      style={{
        border: "1px solid rgba(21, 181, 123, 0.28)",
        background: "rgba(21, 181, 123, 0.1)",
        color: "var(--success)",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13 }}>Staging 대기 모델이 {count}개 있습니다. 현재 구현에서는 Production 상태만 운영 카드에 표시됩니다.</div>
      <Button variant="outline" color="#34D399">
        레지스트리 보기
      </Button>
    </div>
  )
}
