export default function CodeBlock({ code }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 14,
        borderRadius: 10,
        border: "1px solid #1A3352",
        background: "#050E1A",
        overflow: "auto",
        color: "#7AA8D0",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {code}
    </pre>
  )
}
