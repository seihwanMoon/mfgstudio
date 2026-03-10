export default function CodeBlock({ code }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg-code)",
        overflow: "auto",
        color: "var(--text-secondary)",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {code}
    </pre>
  )
}
