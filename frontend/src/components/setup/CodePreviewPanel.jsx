import CodeBlock from "../ui/CodeBlock"

export default function CodePreviewPanel({ code }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16, height: "100%" }}>
      <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>코드 미리보기</h3>
      <CodeBlock code={code} />
    </div>
  )
}
