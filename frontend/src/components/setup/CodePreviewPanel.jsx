import CodeBlock from "../ui/CodeBlock"

export default function CodePreviewPanel({ code }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16, height: "100%" }}>
      <h3 style={{ marginTop: 0, color: "#E2EEFF" }}>코드 미리보기</h3>
      <CodeBlock code={code} />
    </div>
  )
}
