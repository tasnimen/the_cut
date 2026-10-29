// Simple horizontal bars for counts. The number is always printed, so the bar is only a visual aid.
export function BarList({ rows, label, empty = "Nothing to show for this period." }) {
  const max = Math.max(1, ...rows.map((row) => row.n));
  if (rows.every((row) => row.n === 0)) return <p className="dash-muted">{empty}</p>;
  return (
    <ul className="dash-bars" aria-label={label}>
      {rows.map((row) => (
        <li key={row.label} className="dash-bar-row">
          <span className="dash-bar-label">{row.label}</span>
          <span className="dash-bar-track" aria-hidden="true"><span className="dash-bar-fill" style={{ width: `${Math.round((row.n / max) * 100)}%` }} /></span>
          <span className="dash-bar-count">{row.n}</span>
        </li>
      ))}
    </ul>
  );
}
