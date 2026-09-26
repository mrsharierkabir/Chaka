// Small dependency-free donut chart. `segments` is [{ label, value, color }].
export default function DonutChart({ segments, centerLabel, centerValue }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 160;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((s) => {
    const fraction = total > 0 ? s.value / total : 0;
    const dash = fraction * circumference;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        {total === 0 ? null : (
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                strokeDashoffset={-a.offset}
                strokeLinecap={arcs.length > 1 ? 'butt' : 'round'}
              />
            ))}
          </g>
        )}
        <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink)">{centerValue}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="11" fill="var(--muted)">{centerLabel}</text>
      </svg>
      <div className="donut-legend">
        {segments.map((s) => (
          <div className="donut-legend-item" key={s.label}>
            <span className="donut-dot" style={{ background: s.color }} />
            <span className="donut-legend-label">{s.label}</span>
            <span className="donut-legend-value">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
