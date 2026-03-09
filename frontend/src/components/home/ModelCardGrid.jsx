import ModelCard from "./ModelCard"

export default function ModelCardGrid({ models, selectedModel, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
      {models.map((model) => (
        <ModelCard
          key={model.id ?? model.mlflow_model_name ?? model.algorithm}
          model={model}
          selected={selectedModel?.id === model.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
