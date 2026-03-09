export default function PlotRenderArea({ image }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 14, minHeight: 420, display: "grid", placeItems: "center" }}>
      {image ? (
        <img alt="analysis plot" src={`data:image/png;base64,${image}`} style={{ width: "100%", borderRadius: 10 }} />
      ) : (
        <div style={{ color: "#8BA8C8" }}>플롯 생성 후 이미지가 여기에 표시됩니다.</div>
      )}
    </div>
  )
}
