import { reportAPI } from "../../api"
import { formatDateTimeKST } from "../../utils/formatters"

function SummaryCard({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--bg-surface-soft)",
        padding: 14,
      }}
    >
      <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20 }}>{value}</div>
    </div>
  )
}

function ActionButton({ children, onClick, disabled = false, tone = "default", as = "button", href }) {
  const style = {
    borderRadius: 8,
    border: `1px solid ${tone === "danger" ? "rgba(248, 113, 113, 0.35)" : tone === "primary" ? "rgba(56, 189, 248, 0.35)" : tone === "warning" ? "rgba(245, 158, 11, 0.35)" : "var(--border)"}`,
    background: tone === "danger"
      ? "rgba(248, 113, 113, 0.1)"
      : tone === "primary"
        ? "rgba(56, 189, 248, 0.12)"
        : tone === "warning"
          ? "rgba(245, 158, 11, 0.12)"
          : "var(--bg-surface)",
    color: tone === "danger"
      ? "var(--danger)"
      : tone === "primary"
        ? "var(--accent-blue)"
        : tone === "warning"
          ? "var(--warning)"
          : "var(--text-primary)",
    padding: "8px 10px",
    fontSize: 12,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }

  if (as === "a") {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={style}>
        {children}
      </a>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  )
}

function Note({ children, tone = "default" }) {
  return (
    <div style={{ color: tone === "warning" ? "var(--warning)" : "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>
      {children}
    </div>
  )
}

export default function OperationsPanel({
  experiments = [],
  reports = [],
  message = "",
  onArchiveExperiment,
  onDeleteExperiment,
  onRetireModel,
  onRegenerateReport,
  onDeleteReport,
}) {
  const archivedCount = experiments.filter((item) => item.status === "archived").length
  const deletableCount = experiments.filter((item) => item.can_delete).length
  const existingReports = reports.filter((item) => item.report_exists).length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <SummaryCard label="관리 대상 실험" value={experiments.length} />
        <SummaryCard label="즉시 삭제 가능" value={deletableCount} />
        <SummaryCard label="보관된 실험" value={archivedCount} />
        <SummaryCard label="생성된 리포트" value={existingReports} />
      </div>

      {message ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--bg-surface)",
            boxShadow: "var(--shadow-panel)",
            padding: 14,
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-panel)",
          padding: 16,
        }}
      >
        <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>실험 정리</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          운영 자산과 연결되지 않은 실험만 즉시 삭제할 수 있습니다. 등록/배포/예측 이력이 있는 실험은 먼저 보관하거나, 아래 보고서 관리에서 해당 모델을 은퇴 정리해야 합니다.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!experiments.length ? <div style={{ color: "var(--text-secondary)" }}>관리할 실험이 없습니다.</div> : null}
          {experiments.map((item) => (
            <div
              key={item.experiment_id}
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 10,
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr auto",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {item.name}
                  <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 8 }}>#{item.experiment_id}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {item.module_type} / 타깃 {item.target_col || "-"} / 데이터셋 {item.dataset_name || "-"}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  생성 {formatDateTimeKST(item.created_at)} / 상태 {item.status}
                </div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
                <div>모델 {item.model_count}</div>
                <div>finalize {item.finalized_count}</div>
                <div>등록 {item.registered_count}</div>
                <div>프로덕션 {item.production_count}</div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
                <div>예측 이력 {item.prediction_count}</div>
                <div>리포트 {item.report_count}</div>
                <div>컨텍스트 {item.context_exists ? "있음" : "없음"}</div>
                {!item.can_delete && item.delete_blockers?.length ? (
                  <div style={{ color: "var(--warning)", marginTop: 4 }}>
                    제한: {item.delete_blockers.join(", ")}
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ActionButton onClick={() => onArchiveExperiment?.(item)} disabled={item.status === "archived"}>
                  보관
                </ActionButton>
                <ActionButton onClick={() => onDeleteExperiment?.(item)} disabled={!item.can_delete} tone="danger">
                  삭제
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-panel)",
          padding: 16,
        }}
      >
        <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>보고서 / 운영 모델 관리</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          저장된 리포트를 다시 열고, 재생성하거나, PDF 파일만 삭제할 수 있습니다. `은퇴 정리`는 스테이지를 `Archived`로 내리고, 예측 이력이 없으면 MLflow 버전과 최종 모델 파일까지 함께 정리합니다.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!reports.length ? <div style={{ color: "var(--text-secondary)" }}>관리할 리포트가 없습니다.</div> : null}
          {reports.map((item) => (
            <div
              key={item.model_id}
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 10,
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr auto",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {item.model_name}
                  <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 8 }}>#{item.model_id}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {item.algorithm} / 실험 {item.experiment_name} / 데이터셋 {item.dataset_name}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  스테이지 {item.stage} / 버전 {item.version ?? "-"} / 수정 {formatDateTimeKST(item.report_updated_at)}
                </div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
                <div>예측 이력 {item.prediction_count}</div>
                <div>리포트 {item.report_exists ? "있음" : "없음"}</div>
                <div>레지스트리 {item.has_registry_version ? "연결됨" : "없음"}</div>
                <div>모델 파일 {item.has_model_artifact ? "있음" : "없음"}</div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, wordBreak: "break-all" }}>
                  {item.report_path}
                </div>
                {item.can_cleanup_artifacts ? (
                  <Note>예측 이력이 없어 은퇴 정리 시 버전/모델 파일까지 함께 정리할 수 있습니다.</Note>
                ) : (
                  <Note tone="warning">예측 이력이 있어 은퇴 정리 시 스테이지와 리포트만 정리하고 버전/모델 파일은 유지합니다.</Note>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ActionButton as="a" href={reportAPI.downloadUrl(item.model_id)} disabled={!item.report_exists} tone="primary">
                  열기
                </ActionButton>
                <ActionButton onClick={() => onRegenerateReport?.(item)} tone="primary">
                  재생성
                </ActionButton>
                <ActionButton onClick={() => onDeleteReport?.(item)} tone="danger">
                  PDF 삭제
                </ActionButton>
                <ActionButton onClick={() => onRetireModel?.(item)} tone="warning">
                  은퇴 정리
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
