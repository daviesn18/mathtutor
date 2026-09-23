'use client';

import { useId } from 'react';
import Graph from './Graph';

const fmt = (v) => (v < 0 ? `−${Math.abs(v)}` : `${v}`);

function Mapping({ pairs }) {
  const rid = useId().replace(/:/g, '');
  const inputs = [...new Set(pairs.map(([x]) => x))].sort((a, b) => a - b);
  const outputs = [...new Set(pairs.map(([, y]) => y))].sort((a, b) => a - b);
  const rows = Math.max(inputs.length, outputs.length);
  const rowH = 44;
  const H = rows * rowH + 60;
  const W = 340;
  const L = 70;
  const R = W - 70;
  const yFor = (i, count) => 40 + ((rows - count) * rowH) / 2 + i * rowH + rowH / 2;
  return (
    <svg className="mapping" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapping diagram">
      <defs>
        <marker id={`${rid}-m`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
        </marker>
      </defs>
      <text x={L} y="22" textAnchor="middle" className="mapping-head">Input (x)</text>
      <text x={R} y="22" textAnchor="middle" className="mapping-head">Output (y)</text>
      <ellipse cx={L} cy={40 + (rows * rowH) / 2} rx="42" ry={(rows * rowH) / 2 + 8} className="mapping-oval" />
      <ellipse cx={R} cy={40 + (rows * rowH) / 2} rx="42" ry={(rows * rowH) / 2 + 8} className="mapping-oval" />
      {pairs.map(([x, y], i) => {
        const y1 = yFor(inputs.indexOf(x), inputs.length);
        const y2 = yFor(outputs.indexOf(y), outputs.length);
        return <line key={i} x1={L + 22} y1={y1} x2={R - 24} y2={y2} className="mapping-arrow" markerEnd={`url(#${rid}-m)`} />;
      })}
      {inputs.map((x, i) => (
        <text key={`i${x}`} x={L} y={yFor(i, inputs.length) + 6} textAnchor="middle" className="mapping-value">
          {fmt(x)}
        </text>
      ))}
      {outputs.map((y, i) => (
        <text key={`o${y}`} x={R} y={yFor(i, outputs.length) + 6} textAnchor="middle" className="mapping-value">
          {fmt(y)}
        </text>
      ))}
    </svg>
  );
}

function ValueTable({ headers, rows }) {
  return (
    <table className="value-table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((v, j) => (
              <td key={j}>{fmt(v)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Visual({ visual }) {
  if (!visual) return null;
  if (visual.type === 'graph') return <Graph {...visual} />;
  if (visual.type === 'mapping') return <Mapping pairs={visual.pairs} />;
  if (visual.type === 'table') return <ValueTable headers={visual.headers} rows={visual.rows} />;
  return null;
}
