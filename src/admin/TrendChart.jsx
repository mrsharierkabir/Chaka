import { formatPrice } from '../lib/helpers';

// Small dependency-free bar chart. `points` is [{ label, value }].
export default function TrendChart({ points }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const width = 640;
  const height = 200;
  const padding = 28;
  const chartH = height - padding;
  const barGap = 6;
  const barW = points.length > 0 ? (width - barGap * (points.length - 1)) / points.length : 0;

  // Thin out x-axis labels when there are many bars (e.g. 30 days) so they don't overlap.
  const labelEvery = points.length > 14 ? Math.ceil(points.length / 7) : 1;

  if (points.every((p) => p.value === 0)) {
    return <div className="trend-empty">No sales in this range yet</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={width} y1={padding + chartH * (1 - f)} y2={padding + chartH * (1 - f)} stroke="#f0f0f0" strokeWidth="1" />
      ))}
      {points.map((p, i) => {
        const h = max > 0 ? (p.value / max) * (chartH - 20) : 0;
        const x = i * (barW + barGap);
        const y = height - padding - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={3} fill="var(--teal)" opacity={p.value > 0 ? 1 : 0.15}>
              <title>{p.label}: {formatPrice(p.value)}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{p.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
