import { clamp } from "../lib/format";

function toPath(points) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
  return d;
}

export default function SparkLine({ series, min = 0, max = 1 }) {
  const w = 600;   // viewBox (se vuelve responsivo por CSS)
  const h = 180;
  const pad = 14;

  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin + 1;
  const span = safeMax - safeMin || 1;

  const n = Array.isArray(series) ? series.length : 0;
  const pts = [];

  for (let i = 0; i < n; i++) {
    const v = series[i]?.v;
    if (!Number.isFinite(v)) continue;

    const tX = n <= 1 ? 0 : i / (n - 1);
    const x = pad + tX * (w - pad * 2);

    const tY = (v - safeMin) / span;
    const y = pad + (1 - clamp(tY, 0, 1)) * (h - pad * 2);

    pts.push({ x: +x.toFixed(2), y: +y.toFixed(2), v });
  }

  const d = toPath(pts);

  // rejilla simple
  const gridY = [0.25, 0.5, 0.75].map((p) => pad + p * (h - pad * 2));
  const gridX = [0.25, 0.5, 0.75].map((p) => pad + p * (w - pad * 2));

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="sparkline">
      <defs>
        <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.15" />
        </linearGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={w} height={h} className="sparkBg" />

      {gridY.map((y, i) => (
        <line key={"gy" + i} x1={pad} y1={y} x2={w - pad} y2={y} className="sparkGrid" />
      ))}
      {gridX.map((x, i) => (
        <line key={"gx" + i} x1={x} y1={pad} x2={x} y2={h - pad} className="sparkGrid" />
      ))}

      <path d={d} className="sparkArea" />
      <path d={d} className="sparkLine glow" filter="url(#softGlow)" />
      <path d={d} className="sparkLine" />

      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.2" className="sparkDot" />
      ))}

      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} className="sparkFrame" />
    </svg>
  );
}
