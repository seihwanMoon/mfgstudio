const STAGE_LABELS = {
  None: "미지정",
  Staging: "스테이징",
  Production: "프로덕션",
  Archived: "보관",
}

export default function ModelSelector({ models = [], value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>모델 선택</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-surface-soft)",
          color: "var(--text-primary)",
          padding: "12px 14px",
        }}
      >
        <option value="">예측 모델 선택</option>
        {models.map((model) => (
          <option key={model.name} value={model.name}>
            {`${STAGE_LABELS[model.stage] || model.stage} / ${model.display_name} / v${model.version ?? "-"} / ${model.algorithm}`}
          </option>
        ))}
      </select>
    </div>
  )
}
