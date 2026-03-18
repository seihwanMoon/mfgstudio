import { useMemo, useState } from "react"

import { reportAPI } from "../../api"
import { formatDateTimeKST } from "../../utils/formatters"

function SummaryCard({ label, value, description }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--bg-surface-soft)",
        padding: 14,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20 }}>{value}</div>
      {description ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{description}</div> : null}
    </div>
  )
}

function ActionButton({ children, onClick, disabled = false, tone = "default", as = "button", href }) {
  const style = {
    borderRadius: 8,
    border: `1px solid ${
      tone === "danger"
        ? "rgba(248, 113, 113, 0.35)"
        : tone === "primary"
          ? "rgba(56, 189, 248, 0.35)"
          : tone === "warning"
            ? "rgba(245, 158, 11, 0.35)"
            : "var(--border)"
    }`,
    background:
      tone === "danger"
        ? "rgba(248, 113, 113, 0.1)"
        : tone === "primary"
          ? "rgba(56, 189, 248, 0.12)"
          : tone === "warning"
            ? "rgba(245, 158, 11, 0.12)"
            : "var(--bg-surface)",
    color:
      tone === "danger"
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
    pointerEvents: disabled ? "none" : "auto",
  }

  if (as === "a") {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={style} aria-disabled={disabled}>
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
    <div
      style={{
        color: tone === "warning" ? "var(--warning)" : "var(--text-muted)",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}

function FilterBar({ title, description, search, onSearch, filter, onFilter, filterOptions, resultCount }) {
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
      <div>
        <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>{title}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>{description}</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) 220px auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="모델명, 실험명, 데이터셋, 타깃으로 검색"
          style={{
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-surface-soft)",
            color: "var(--text-primary)",
            padding: "10px 12px",
          }}
        />
        <select
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          style={{
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-surface-soft)",
            color: "var(--text-primary)",
            padding: "10px 12px",
          }}
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "right" }}>표시 {resultCount}건</div>
      </div>
    </div>
  )
}

function formatMaybeDate(value) {
  return value ? formatDateTimeKST(value) : "-"
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!bytes) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function matchesExperimentFilter(item, filter) {
  if (filter === "all") return true
  if (filter === "archived") return item.status === "archived"
  if (filter === "active") return item.status !== "archived"
  if (filter === "deletable") return item.can_delete
  if (filter === "blocked") return !item.can_delete
  if (filter === "production") return (item.production_count || 0) > 0
  return true
}

function matchesReportFilter(item, filter) {
  if (filter === "all") return true
  if (filter === "existing") return item.report_exists
  if (filter === "missing") return !item.report_exists
  if (filter === "retirable") return item.can_cleanup_artifacts
  if (filter === "registry") return item.has_registry_version
  if (filter === "production") return item.stage === "Production"
  if (filter === "fallback") return item.mlflow_synced === false
  return true
}

function CacheCard({ title, description, stats, retentionDays }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--bg-surface-soft)",
        padding: 14,
        display: "grid",
        gap: 8,
      }}
    >
      <div>
        <div style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>{description}</div>
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
        <div>보존 정책: {retentionDays > 0 ? `${retentionDays}일` : "자동 만료 없음"}</div>
        <div>캐시 쌍: {stats?.pair_count ?? 0}</div>
        <div>파일 수: {stats?.file_count ?? 0}</div>
        <div>폴더 수: {stats?.directory_count ?? 0}</div>
        <div>용량: {formatBytes(stats?.size_bytes)}</div>
        <div>최근 갱신: {formatMaybeDate(stats?.latest_updated_at)}</div>
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 11, wordBreak: "break-all" }}>{stats?.path || "-"}</div>
    </div>
  )
}

function CacheStatusSection({ cacheStatus, onRefreshCacheStatus, onCleanupCache }) {
  const policy = cacheStatus?.policy || {}
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>아티팩트 캐시</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
            보고서용 차트 캐시와 XAI 스냅샷 캐시의 현재 보존 정책과 저장량입니다.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton onClick={onCleanupCache} tone="warning">
            정리 실행
          </ActionButton>
          <ActionButton onClick={onRefreshCacheStatus}>새로고침</ActionButton>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <CacheCard
          title="보고서 차트 캐시"
          description="모델별 report-safe 차트를 재생성하지 않고 재사용합니다."
          stats={cacheStatus?.report_chart_cache}
          retentionDays={policy.report_chart_cache_retention_days ?? 0}
        />
        <CacheCard
          title="XAI 스냅샷 캐시"
          description="동일 모델/행/모드의 XAI summary, dependence, PFI 스냅샷을 재사용합니다."
          stats={cacheStatus?.xai_snapshot_cache}
          retentionDays={policy.xai_snapshot_cache_retention_days ?? 0}
        />
      </div>
    </div>
  )
}

export default function OperationsPanel({
  experiments = [],
  reports = [],
  mlflowOrphans = { experiments: [], registered_models: [], counts: {} },
  cacheStatus = null,
  message = "",
  onArchiveExperiment,
  onArchiveExperiments,
  onDeleteExperiment,
  onCleanupDeleteExperiment,
  onRetireModel,
  onRegenerateReport,
  onRegenerateReports,
  onDeleteReport,
  onRefreshCacheStatus,
  onCleanupCache,
  onDeleteMlflowExperiment,
  onDeleteMlflowModel,
}) {
  const [experimentSearch, setExperimentSearch] = useState("")
  const [experimentFilter, setExperimentFilter] = useState("all")
  const [reportSearch, setReportSearch] = useState("")
  const [reportFilter, setReportFilter] = useState("all")

  const normalizedExperimentSearch = experimentSearch.trim().toLowerCase()
  const normalizedReportSearch = reportSearch.trim().toLowerCase()

  const filteredExperiments = useMemo(() => {
    return experiments.filter((item) => {
      const haystack = [
        item.name,
        item.dataset_name,
        item.target_col,
        item.module_type,
        item.status,
        String(item.experiment_id),
      ]
        .join(" ")
        .toLowerCase()
      const matchesSearch = !normalizedExperimentSearch || haystack.includes(normalizedExperimentSearch)
      return matchesSearch && matchesExperimentFilter(item, experimentFilter)
    })
  }, [experiments, normalizedExperimentSearch, experimentFilter])

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const haystack = [
        item.model_name,
        item.algorithm,
        item.experiment_name,
        item.dataset_name,
        item.stage,
        String(item.model_id),
      ]
        .join(" ")
        .toLowerCase()
      const matchesSearch = !normalizedReportSearch || haystack.includes(normalizedReportSearch)
      return matchesSearch && matchesReportFilter(item, reportFilter)
    })
  }, [reports, normalizedReportSearch, reportFilter])

  const archivedCount = experiments.filter((item) => item.status === "archived").length
  const deletableCount = experiments.filter((item) => item.can_delete).length
  const existingReports = reports.filter((item) => item.report_exists).length
  const fallbackCount = reports.filter((item) => item.mlflow_synced === false).length
  const cachedArtifacts = (cacheStatus?.report_chart_cache?.pair_count || 0) + (cacheStatus?.xai_snapshot_cache?.pair_count || 0)
  const orphanMlflowAssets = (mlflowOrphans?.counts?.experiments || 0) + (mlflowOrphans?.counts?.registered_models || 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 12 }}>
        <SummaryCard label="관리 대상 실험" value={experiments.length} />
        <SummaryCard label="즉시 삭제 가능" value={deletableCount} />
        <SummaryCard label="보관된 실험" value={archivedCount} />
        <SummaryCard label="생성된 보고서" value={existingReports} />
        <SummaryCard label="MLflow fallback" value={fallbackCount} description="앱 메타데이터 기준 운영 중" />
        <SummaryCard label="캐시 아티팩트" value={cachedArtifacts} description="보고서/XAI 재사용 스냅샷" />
        <SummaryCard label="MLflow 고아 자산" value={orphanMlflowAssets} description="앱과 연결되지 않은 실험/모델" />
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

      <CacheStatusSection
        cacheStatus={cacheStatus}
        onRefreshCacheStatus={onRefreshCacheStatus}
        onCleanupCache={onCleanupCache}
      />

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-panel)",
          padding: 16,
        }}
      >
        <FilterBar
          title="실험 정리"
          description="운영 자산과 연결되지 않은 실험만 즉시 삭제할 수 있습니다. 등록, 배포, 예측 이력이 있는 실험은 먼저 보관하거나 아래 모델/보고서 관리에서 연결된 자산을 정리해야 합니다."
          search={experimentSearch}
          onSearch={setExperimentSearch}
          filter={experimentFilter}
          onFilter={setExperimentFilter}
          filterOptions={[
            { value: "all", label: "전체 실험" },
            { value: "active", label: "활성 실험" },
            { value: "archived", label: "보관 실험" },
            { value: "deletable", label: "삭제 가능" },
            { value: "blocked", label: "삭제 제한" },
            { value: "production", label: "프로덕션 포함" },
          ]}
          resultCount={filteredExperiments.length}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <ActionButton onClick={() => onArchiveExperiments?.(filteredExperiments)}>필터 결과 일괄 보관</ActionButton>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!filteredExperiments.length ? <div style={{ color: "var(--text-secondary)" }}>조건에 맞는 실험이 없습니다.</div> : null}
          {filteredExperiments.map((item) => (
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
                  생성 {formatMaybeDate(item.created_at)} / 상태 {item.status}
                </div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
                <div>모델 {item.model_count}</div>
                <div>Finalize {item.finalized_count}</div>
                <div>등록 {item.registered_count}</div>
                <div>프로덕션 {item.production_count}</div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
                <div>예측 이력 {item.prediction_count}</div>
                <div>보고서 {item.report_count}</div>
                <div>컨텍스트 {item.context_exists ? "있음" : "없음"}</div>
                {!item.can_delete && item.delete_blockers?.length ? (
                  <div style={{ color: "var(--warning)", marginTop: 4 }}>제한: {item.delete_blockers.join(", ")}</div>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ActionButton onClick={() => onArchiveExperiment?.(item)} disabled={item.status === "archived"}>
                  보관
                </ActionButton>
                {!item.can_delete ? (
                  <ActionButton onClick={() => onCleanupDeleteExperiment?.(item)} tone="warning">
                    정리 후 삭제
                  </ActionButton>
                ) : null}
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
        <FilterBar
          title="보고서 / 운영 모델 관리"
          description="보고서를 다시 만들고, 재열고, PDF만 삭제할 수 있습니다. 은퇴 정리는 미리보기 후 실행되며 스테이지를 먼저 내리고 예측 이력이 없으면 모델 파일과 등록 버전까지 함께 정리합니다."
          search={reportSearch}
          onSearch={setReportSearch}
          filter={reportFilter}
          onFilter={setReportFilter}
          filterOptions={[
            { value: "all", label: "전체 보고서" },
            { value: "existing", label: "PDF 있음" },
            { value: "missing", label: "PDF 없음" },
            { value: "retirable", label: "은퇴 정리 가능" },
            { value: "registry", label: "레지스트리 연결" },
            { value: "fallback", label: "MLflow fallback" },
            { value: "production", label: "프로덕션 모델" },
          ]}
          resultCount={filteredReports.length}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <ActionButton onClick={() => onRegenerateReports?.(filteredReports)} tone="primary">
            누락 PDF 일괄 생성
          </ActionButton>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!filteredReports.length ? <div style={{ color: "var(--text-secondary)" }}>조건에 맞는 보고서가 없습니다.</div> : null}
          {filteredReports.map((item) => (
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
                  스테이지 {item.stage} / 버전 {item.version ?? "-"} / 수정 {formatMaybeDate(item.report_updated_at)}
                </div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
                <div>예측 이력 {item.prediction_count}</div>
                <div>보고서 {item.report_exists ? "있음" : "없음"}</div>
                <div>레지스트리 {item.has_registry_version ? "연결됨" : "없음"}</div>
                <div>모델 파일 {item.has_model_artifact ? "있음" : "없음"}</div>
                <div>MLflow {item.mlflow_synced === false ? "fallback" : "synced"}</div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, wordBreak: "break-all" }}>
                  {item.report_path}
                </div>
                {item.mlflow_synced === false ? (
                  <Note tone="warning">MLflow 서버 동기화 없이 앱 기준 메타데이터로 운영 중입니다.</Note>
                ) : null}
                {item.can_cleanup_artifacts ? (
                  <Note>예측 이력이 없어 은퇴 정리 시 버전과 모델 파일까지 함께 정리할 수 있습니다.</Note>
                ) : (
                  <Note tone="warning">예측 이력이 있어 은퇴 정리는 스테이지와 보고서만 정리하고 버전/모델 파일은 유지합니다.</Note>
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

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-panel)",
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>MLflow 고아 자산 정리</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
            앱 DB와 연결이 끊긴 MLflow 실험과 등록 모델을 정리합니다. 앱 실험/모델 삭제는 계속 이 화면에서 시작하고,
            여기서는 남은 MLflow 자산만 정리하는 용도로 사용합니다.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              MLflow 실험
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                {mlflowOrphans?.counts?.experiments || 0}개
              </span>
            </div>
            {!mlflowOrphans?.experiments?.length ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>정리할 고아 실험이 없습니다.</div>
            ) : (
              mlflowOrphans.experiments.map((item) => (
                <div
                  key={`mlflow-exp-${item.experiment_id}`}
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                      {item.name}
                      <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>#{item.experiment_id}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      상태 {item.lifecycle_stage || "-"} / run {item.run_count || 0}
                    </div>
                  </div>
                  <ActionButton onClick={() => onDeleteMlflowExperiment?.(item)} tone="danger">
                    MLflow 삭제
                  </ActionButton>
                </div>
              ))
            )}
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              MLflow 등록 모델
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                {mlflowOrphans?.counts?.registered_models || 0}개
              </span>
            </div>
            {!mlflowOrphans?.registered_models?.length ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>정리할 고아 등록 모델이 없습니다.</div>
            ) : (
              mlflowOrphans.registered_models.map((item) => (
                <div
                  key={`mlflow-model-${item.name}`}
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      최신 버전 {item.latest_versions?.[0] ?? "-"} / 운영 버전 {item.production_version ?? "-"}
                    </div>
                  </div>
                  <ActionButton onClick={() => onDeleteMlflowModel?.(item)} tone="danger">
                    MLflow 삭제
                  </ActionButton>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
