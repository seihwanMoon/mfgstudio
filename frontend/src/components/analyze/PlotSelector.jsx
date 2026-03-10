const PLOT_LABELS = {
  auc: "ROC AUC",
  confusion_matrix: "혼동 행렬",
  feature: "변수 중요도",
  learning: "학습 곡선",
  pr: "정밀도-재현율",
  calibration: "보정 곡선",
  residuals: "잔차 플롯",
  error: "예측 오차",
  cooks: "영향도",
  cluster: "클러스터 분포",
  tsne: "t-SNE",
  elbow: "엘보우",
  umap: "UMAP",
  forecast: "예측 추세",
  acf: "ACF",
  pacf: "PACF",
}

export default function PlotSelector({ plots = [], value, onChange, onRefresh }) {
  return (
    <div
      style={{
        width: 240,
        borderRight: "1px solid var(--border)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>플롯 선택</h3>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
        선택한 플롯에 맞는 모델 해석 그래프를 생성합니다.
      </div>

      {plots.map((plot) => (
        <button
          key={plot}
          onClick={() => onChange(plot)}
          style={{
            borderRadius: 12,
            cursor: "pointer",
            padding: "12px 14px",
            textAlign: "left",
            border: `1px solid ${value === plot ? "var(--accent-blue)" : "var(--border)"}`,
            background: value === plot ? "var(--accent-blue-soft)" : "var(--bg-surface-soft)",
            color: value === plot ? "var(--accent-blue-strong)" : "var(--text-secondary)",
            fontWeight: value === plot ? 700 : 500,
          }}
        >
          {PLOT_LABELS[plot] || plot}
        </button>
      ))}

      <button
        onClick={onRefresh}
        style={{
          marginTop: "auto",
          border: "none",
          borderRadius: 12,
          background: "var(--accent-blue)",
          color: "white",
          padding: "13px 14px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        플롯 다시 생성
      </button>
    </div>
  )
}
