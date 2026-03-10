import { formatDateTimeKST } from "../../utils/formatters"

const JOB_LABELS = {
  retrain_candidate_scan: "재학습 후보 스캔",
  weekly_drift_check: "주간 드리프트 점검",
}

function localizeSummary(summary) {
  if (!summary) return "-"
  const retrainMatch = /^flagged (\d+) retrain candidates$/.exec(summary)
  if (retrainMatch) return `재학습 후보 ${retrainMatch[1]}건 감지`
  const driftMatch = /^checked (\d+) production models$/.exec(summary)
  if (driftMatch) return `Production 모델 ${driftMatch[1]}개 점검`
  return summary
}

export default function ScheduleManager({ jobs = [], onToggle, onRunNow }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>스케줄 관리</div>
      {!jobs.length ? <div style={{ color: "#8BA8C8" }}>등록된 스케줄이 없습니다.</div> : null}
      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            borderTop: "1px solid #1A3352",
            paddingTop: 10,
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ color: "#8BA8C8" }}>
            <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 4 }}>
              {JOB_LABELS[job.id] || job.name}
            </div>
            <div>다음 실행: {formatDateTimeKST(job.next_run_time)}</div>
            <div>최근 실행: {formatDateTimeKST(job.last_run)}</div>
            <div>실행 요약: {localizeSummary(job.summary)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => onToggle?.(job)}
              style={{
                borderRadius: 8,
                border: "1px solid #1A3352",
                background: "#111E2E",
                color: "#E2EEFF",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              {job.status === "paused" ? "재개" : "일시중지"}
            </button>
            <button
              onClick={() => onRunNow?.(job.id)}
              style={{
                borderRadius: 8,
                border: "1px solid #38BDF8",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38BDF8",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              지금 실행
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
