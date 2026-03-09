export default function ScheduleManager({ jobs = [], onToggle, onRunNow }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>Schedule Manager</div>
      {!jobs.length ? <div style={{ color: "#8BA8C8" }}>No scheduled jobs found.</div> : null}
      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            borderTop: "1px solid #1A3352",
            paddingTop: 10,
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ color: "#8BA8C8" }}>
            <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 4 }}>{job.name}</div>
            <div>Next: {job.next_run_time || "-"}</div>
            <div>Last: {job.last_run || "-"}</div>
            <div>Summary: {job.summary || "-"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => onToggle?.(job)}
              style={{
                borderRadius: 8,
                border: "1px solid #1A3352",
                background: "#111E2E",
                color: "#E2EEFF",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              {job.status === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => onRunNow?.(job.id)}
              style={{
                borderRadius: 8,
                border: "1px solid #38BDF8",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38BDF8",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Run now
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
