export default function ConfusionMatrix({ values = [[0, 0], [0, 0]] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {values.flat().map((value, index) => (
        <div
          key={index}
          style={{
            minHeight: 72,
            borderRadius: 10,
            border: "1px solid #1A3352",
            background: index % 2 === 0 ? "#11263A" : "#0D1926",
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {value}
        </div>
      ))}
    </div>
  )
}
