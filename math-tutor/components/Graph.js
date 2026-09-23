'use client';

import { useId } from 'react';

const S = 400; // SVG units

const TONES = {
  ink: 'var(--ink)',
  accent: 'var(--pen)',
  good: 'var(--good)',
  bad: 'var(--bad)',
  muted: 'var(--muted)',
};

/** Liang–Barsky: clip segment p→q to the box. Returns [p', q', t0, t1] or null. */
function clip(p, q, b) {
  let t0 = 0;
  let t1 = 1;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const checks = [
    [-dx, p[0] - b.x0],
    [dx, b.x1 - p[0]],
    [-dy, p[1] - b.y0],
    [dy, b.y1 - p[1]],
  ];
  for (const [pp, qq] of checks) {
    if (pp === 0) {
      if (qq < 0) return null;
    } else {
      const r = qq / pp;
      if (pp < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [[p[0] + t0 * dx, p[1] + t0 * dy], [p[0] + t1 * dx, p[1] + t1 * dy], t0, t1];
}

/** Split a polyline into the runs that are visible inside the window. */
function visibleRuns(points, win) {
  const box = { x0: -win, x1: win, y0: -win, y1: win };
  const runs = [];
  let cur = null;
  for (let i = 1; i < points.length; i++) {
    const c = clip(points[i - 1], points[i], box);
    if (!c || !Number.isFinite(c[0][1]) || !Number.isFinite(c[1][1])) {
      cur = null;
      continue;
    }
    const [a, b, t0, t1] = c;
    if (!cur || t0 > 0) {
      cur = [a];
      runs.push(cur);
    }
    cur.push(b);
    if (t1 < 1) cur = null;
  }
  return runs.filter((r) => r.length > 1);
}

export default function Graph({
  win = 8,
  paths = [],
  extraPaths = [],
  dots = [],
  vLines = [],
  hLines = [],
  highlights = [],
  label = 'Graph',
}) {
  const rid = useId().replace(/:/g, '');
  const sx = (x) => ((x + win) / (2 * win)) * S;
  const sy = (y) => ((win - y) / (2 * win)) * S;
  const ticks = [];
  for (let i = -win; i <= win; i++) ticks.push(i);
  const labelStep = win > 8 ? 4 : 2;

  const line = (pts) => pts.map(([x, y]) => `${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(' ');

  return (
    <svg className="graph" viewBox={`-14 -14 ${S + 28} ${S + 28}`} role="img" aria-label={label}>
      <defs>
        {Object.entries(TONES).map(([k, c]) => (
          <marker
            key={k}
            id={`${rid}-arrow-${k}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="13"
            markerHeight="13"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>

      <rect x="0" y="0" width={S} height={S} className="graph-paper" />

      {/* Highlighted x-intervals: a highlighter stroke along the axis + a faint column */}
      {highlights.map((h, i) => {
        const lo = Math.max(h.lo, -win);
        const hi = Math.min(h.hi, win);
        if (hi <= lo) return null;
        const c = TONES[h.tone] || TONES.good;
        return (
          <g key={`h${i}`}>
            <rect x={sx(lo)} y="0" width={sx(hi) - sx(lo)} height={S} className="graph-column" />
            <rect x={sx(lo)} y={sy(0) - 9} width={sx(hi) - sx(lo)} height="18" className="graph-highlight" />
            <line x1={sx(lo)} y1={sy(0) - 13} x2={sx(lo)} y2={sy(0) + 13} stroke={c} strokeWidth="2.5" />
            <line x1={sx(hi)} y1={sy(0) - 13} x2={sx(hi)} y2={sy(0) + 13} stroke={c} strokeWidth="2.5" />
          </g>
        );
      })}

      {ticks.map((t) => (
        <g key={`g${t}`}>
          <line x1={sx(t)} y1="0" x2={sx(t)} y2={S} className={t % 5 === 0 ? 'grid grid-major' : 'grid'} />
          <line x1="0" y1={sy(t)} x2={S} y2={sy(t)} className={t % 5 === 0 ? 'grid grid-major' : 'grid'} />
        </g>
      ))}

      <line x1="0" y1={sy(0)} x2={S} y2={sy(0)} className="axis" markerEnd={`url(#${rid}-arrow-ink)`} markerStart={`url(#${rid}-arrow-ink)`} />
      <line x1={sx(0)} y1={S} x2={sx(0)} y2="0" className="axis" markerEnd={`url(#${rid}-arrow-ink)`} markerStart={`url(#${rid}-arrow-ink)`} />
      <text x={S + 6} y={sy(0) + 4} className="axis-name">x</text>
      <text x={sx(0) - 4} y={-5} className="axis-name" textAnchor="end">y</text>

      {ticks
        .filter((t) => t !== 0 && t % labelStep === 0 && Math.abs(t) < win)
        .map((t) => (
          <g key={`l${t}`} className="tick-label">
            <text x={sx(t)} y={sy(0) + 15} textAnchor="middle">
              {t < 0 ? `−${-t}` : t}
            </text>
            <text x={sx(0) - 6} y={sy(t) + 4} textAnchor="end">
              {t < 0 ? `−${-t}` : t}
            </text>
          </g>
        ))}

      {vLines.map((v, i) => (
        <line
          key={`v${i}`}
          x1={sx(v.x)}
          y1="0"
          x2={sx(v.x)}
          y2={S}
          className="guide"
          stroke={TONES[v.tone] || TONES.accent}
        />
      ))}
      {hLines.map((h, i) => (
        <line
          key={`hl${i}`}
          x1="0"
          y1={sy(h.y)}
          x2={S}
          y2={sy(h.y)}
          className="guide"
          stroke={TONES[h.tone] || TONES.accent}
        />
      ))}

      {[...paths, ...extraPaths].map((path, i) =>
        visibleRuns(path.points, win).map((run, j) => {
          const tone = path.tone || 'ink';
          const marker = path.arrows ? `url(#${rid}-arrow-${tone})` : undefined;
          return (
            <polyline
              key={`p${i}-${j}`}
              points={line(run)}
              className={path.dashed ? 'curve curve-dashed' : 'curve'}
              stroke={TONES[tone]}
              markerStart={marker}
              markerEnd={marker}
            />
          );
        })
      )}

      {dots.map((d, i) => {
        const c = TONES[d.tone] || TONES.ink;
        const x = sx(d.x);
        const y = sy(d.y);
        const right = d.x < win - 3;
        return (
          <g key={`d${i}`}>
            <circle cx={x} cy={y} r="5.5" fill={d.open ? 'var(--paper)' : c} stroke={c} strokeWidth="2.2" />
            {d.label && (
              <text x={right ? x + 9 : x - 9} y={d.y > win - 2 ? y + 18 : y - 9} textAnchor={right ? 'start' : 'end'} className="dot-label" fill={c}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
