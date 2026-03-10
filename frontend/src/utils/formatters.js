const KST_LOCALE = "ko-KR"
const KST_TIMEZONE = "Asia/Seoul"

export function formatDateTimeKST(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(KST_LOCALE, {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") return "-"
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  if (Math.abs(number) >= 1000) return number.toLocaleString(KST_LOCALE, { maximumFractionDigits: 1 })
  if (Math.abs(number) >= 1) return number.toLocaleString(KST_LOCALE, { maximumFractionDigits: 4 })
  return number.toLocaleString(KST_LOCALE, { maximumFractionDigits: 6 })
}

export function formatMetricPreview(metrics = {}) {
  const entries = Object.entries(metrics).slice(0, 3)
  if (!entries.length) return "-"
  return entries.map(([key, value]) => `${key}: ${formatMetricValue(value)}`).join(" / ")
}

export function formatRunStatus(status) {
  const normalized = String(status || "").toUpperCase()
  if (normalized === "FINISHED") return "완료"
  if (normalized === "FAILED") return "실패"
  if (normalized === "RUNNING") return "실행 중"
  if (normalized === "SCHEDULED") return "예약됨"
  return status || "-"
}
