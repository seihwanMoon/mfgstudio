import { formatDateTimeKST } from "../../utils/formatters"

function supportLabel(level) {
  if (level === "preferred") return "native 강함"
  if (level === "conditional") return "조건부 native"
  if (level === "fallback_only") return "fallback 전용"
  return "-"
}

function observationLabel(status) {
  if (status === "native_only") return "native 관찰"
  if (status === "fallback_only") return "fallback 관찰"
  if (status === "mixed") return "혼합 관찰"
  return "관찰 없음"
}

function statusColor(status) {
  if (status === "native_only") return "var(--success)"
  if (status === "fallback_only") return "var(--warning)"
  if (status === "mixed") return "var(--accent-blue)"
  return "var(--text-muted)"
}

function MetricCell({ plot }) {
  const color = statusColor(plot?.observed_status)
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 999,
            background: `${color}18`,
            border: `1px solid ${color}55`,
            color,
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {observationLabel(plot?.observed_status)}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{supportLabel(plot?.support_level)}</span>
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        native {plot?.native_count ?? 0} / fallback {plot?.fallback_count ?? 0}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
        샘플 {plot?.sample_count ?? 0} / 최근 {formatDateTimeKST(plot?.last_observed_at)}
      </div>
    </div>
  )
}

export default function XaiPolicyMatrix({ rows = [], selectedModelId = null, moduleType = "" }) {
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
      <div>
        <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 6 }}>XAI 성공 행렬</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          현재 실험의 저장 모델 기준으로 XAI 정책과 실제 관찰 결과를 함께 보여줍니다. 같은 플롯을 반복 실행할수록 관찰 수가 누적됩니다.
        </div>
      </div>

      {!rows.length ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>표시할 XAI 행렬 데이터가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const selected = Number(selectedModelId) === Number(row.model_id)
            return (
              <div
                key={row.model_id}
                style={{
                  border: `1px solid ${selected ? "var(--accent-blue)" : "var(--border)"}`,
                  borderRadius: 14,
                  background: selected ? "var(--accent-blue-soft)" : "var(--bg-surface-soft)",
                  padding: 14,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                      {row.algorithm}
                      <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 8 }}>#{row.model_id}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {moduleType} / 계열 {row.estimator_family_label || "-"} / 스테이지 {row.stage || "None"} / {row.is_tuned ? "튜닝됨" : "기본"}
                    </div>
                  </div>
                  {selected ? (
                    <span style={{ color: "var(--accent-blue)", fontSize: 12, fontWeight: 800 }}>현재 선택됨</span>
                  ) : null}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SHAP 요약</div>
                    <MetricCell plot={row.plots?.summary} />
                  </div>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SHAP 의존도</div>
                    <MetricCell plot={row.plots?.dependence} />
                  </div>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Permutation 중요도</div>
                    <MetricCell plot={row.plots?.pfi} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
