// Builds random graphs whose important features (turning points, zeros,
// endpoints) all land on whole numbers, so they can be read off the grid.

import { randInt, pick, sample, range } from './random.js';
import { openIv } from './format.js';

// ---------- Smooth curves (monotone cubic Hermite through key points) ----------

export function hermite(knots, x) {
  let i = 0;
  if (x <= knots[0].x) i = 0;
  else if (x >= knots[knots.length - 1].x) i = knots.length - 2;
  else while (i < knots.length - 2 && x > knots[i + 1].x) i++;
  const k0 = knots[i];
  const k1 = knots[i + 1];
  const h = k1.x - k0.x;
  const t = (x - k0.x) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * k0.y +
    (t3 - 2 * t2 + t) * h * k0.m +
    (-2 * t3 + 3 * t2) * k1.y +
    (t3 - t2) * h * k1.m
  );
}

/**
 * A smooth, continuous function defined for all real numbers, drawn in a
 * [-win, win] window. Turning points and x-intercepts are integers.
 */
export function randomSmoothGraph({ win = 8, turns } = {}) {
  const nTurns = turns ?? pick([1, 2, 2, 3]);
  for (let attempt = 0; attempt < 500; attempt++) {
    const xs = sample(range(-win + 2, win - 3), nTurns).sort((a, b) => a - b);
    if (xs.some((x, i) => i > 0 && x - xs[i - 1] < 3)) continue;

    const firstIsMax = Math.random() < 0.5;
    const ext = xs.map((x, i) => ({ x, type: (i % 2 === 0) === firstIsMax ? 'max' : 'min' }));
    ext.forEach((e) => (e.y = randInt(-win + 2, win - 2)));
    if (ext.some((e) => e.y === 0)) continue;
    let ok = true;
    for (let i = 1; i < ext.length; i++) {
      const [a, b] = [ext[i - 1], ext[i]];
      const hi = a.type === 'max' ? a : b;
      const lo = a.type === 'max' ? b : a;
      if (hi.y - lo.y < 3) ok = false;
    }
    if (!ok) continue;

    const far = win + 5;
    const leftY = ext[0].type === 'max' ? -far : far;
    const rightY = ext[ext.length - 1].type === 'max' ? -far : far;
    let pts = [{ x: -win - 6, y: leftY, kind: 'tail' }, ...ext.map((e) => ({ ...e, kind: 'ext' })), { x: win + 6, y: rightY, kind: 'tail' }];

    // Insert an integer zero wherever the sign flips between key points.
    const withZeros = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a.y * b.y < 0) {
        const lo = Math.max(a.x + 1, -win + 1);
        const hi = Math.min(b.x - 1, win - 1);
        if (lo > hi) {
          ok = false;
          break;
        }
        withZeros.push({ x: randInt(lo, hi), y: 0, kind: 'zero' });
      }
      withZeros.push(b);
    }
    if (!ok) continue;
    pts = withZeros;

    // Slopes: 0 at turning points; gentle, monotone-safe slopes elsewhere.
    const sec = (a, b) => (b.y - a.y) / (b.x - a.x);
    pts.forEach((pt, i) => {
      if (pt.kind === 'ext') pt.m = 0;
      else if (pt.kind === 'tail') pt.m = i === 0 ? sec(pt, pts[1]) : sec(pts[i - 1], pt);
      else {
        const dl = sec(pts[i - 1], pt);
        const dr = sec(pt, pts[i + 1]);
        // Average of the neighboring secants, capped so the curve stays monotone.
        const avg = (Math.abs(dl) + Math.abs(dr)) / 2;
        pt.m = Math.sign(dl) * Math.min(avg, 2.5 * Math.min(Math.abs(dl), Math.abs(dr)));
      }
    });

    const fn = (x) => hermite(pts, x);
    const zeros = pts.filter((q) => q.kind === 'zero').map((q) => q.x);
    const maxima = ext.filter((e) => e.type === 'max').map((e) => [e.x, e.y]);
    const minima = ext.filter((e) => e.type === 'min').map((e) => [e.x, e.y]);

    // Increasing / decreasing between turning points (open intervals).
    const bounds = [-Infinity, ...xs, Infinity];
    const increasing = [];
    const decreasing = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      // Region i ends at turning point i (or +∞). Rising into a max = increasing.
      const rising = i < ext.length ? ext[i].type === 'max' : ext[ext.length - 1].type === 'min';
      (rising ? increasing : decreasing).push(openIv(bounds[i], bounds[i + 1]));
    }

    // Positive / negative between zeros.
    const zb = [-Infinity, ...zeros, Infinity];
    const positive = [];
    const negative = [];
    for (let i = 0; i < zb.length - 1; i++) {
      const lo = zb[i];
      const hi = zb[i + 1];
      const probe = lo === -Infinity ? hi - 0.5 : hi === Infinity ? lo + 0.5 : (lo + hi) / 2;
      const safeProbe = Number.isFinite(probe) ? probe : 0;
      (fn(safeProbe) > 0 ? positive : negative).push(openIv(lo, hi));
    }

    // Range: odd number of turns → both ends go the same way.
    let rangeIv;
    if (nTurns % 2 === 0) rangeIv = [openIv(-Infinity, Infinity)];
    else if (ext[0].type === 'max') {
      const top = Math.max(...maxima.map((m) => m[1]));
      rangeIv = [{ lo: -Infinity, hi: top, loClosed: false, hiClosed: true }];
    } else {
      const bottom = Math.min(...minima.map((m) => m[1]));
      rangeIv = [{ lo: bottom, hi: Infinity, loClosed: true, hiClosed: false }];
    }

    return {
      kind: 'smooth',
      win,
      fn,
      knots: pts,
      turningXs: xs,
      extrema: ext,
      maxima,
      minima,
      zeros,
      increasing,
      decreasing,
      positive,
      negative,
      domain: [openIv(-Infinity, Infinity)],
      range: rangeIv,
    };
  }
  throw new Error('Could not build a smooth graph');
}

/** Graph props for the <Graph> component. */
export function smoothGraphVisual(g, extra = {}) {
  const pts = [];
  for (let x = -g.win - 1; x <= g.win + 1; x += 0.05) pts.push([x, g.fn(x)]);
  return {
    type: 'graph',
    win: g.win,
    paths: [{ points: pts, arrows: true }],
    ...extra,
  };
}

// ---------- Piecewise-linear graphs with endpoints ----------

/**
 * Connected line segments between integer points, with open or closed
 * endpoints. Any x-axis crossing happens at an integer vertex, and if x = 0 is
 * in the domain it's a vertex too, so the y-intercept can be read exactly.
 */
export function randomSegmentGraph({ win = 7 } = {}) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const count = randInt(3, 5);
    let xs = sample(range(-win + 1, win - 1), count).sort((a, b) => a - b);
    if (xs[xs.length - 1] - xs[0] < 5) continue;
    if (xs[0] < 0 && xs[xs.length - 1] > 0 && !xs.includes(0)) xs = [...xs, 0].sort((a, b) => a - b);
    if (xs.some((x, i) => i > 0 && x - xs[i - 1] < 2)) continue;

    const verts = xs.map((x) => [x, randInt(-win + 1, win - 1)]);
    if (verts.some((v, i) => i > 0 && v[1] === verts[i - 1][1])) continue; // no flat pieces

    // Put a vertex on the x-axis wherever a segment crosses it.
    const full = [verts[0]];
    let ok = true;
    for (let i = 1; i < verts.length; i++) {
      const [a, b] = [verts[i - 1], verts[i]];
      if (a[1] * b[1] < 0) {
        const exact = a[0] + ((0 - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
        const zx = Math.round(exact);
        if (zx <= a[0] || zx >= b[0]) {
          ok = false;
          break;
        }
        full.push([zx, 0]);
      }
      full.push(b);
    }
    if (!ok) continue;
    if (full.some((v, i) => i > 0 && v[1] === 0 && full[i - 1][1] === 0)) continue;

    const leftClosed = Math.random() < 0.65;
    const rightClosed = Math.random() < 0.65;
    const first = full[0];
    const last = full[full.length - 1];

    const valueAt = (x) => {
      for (let i = 1; i < full.length; i++) {
        const [a, b] = [full[i - 1], full[i]];
        if (x >= a[0] && x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
      }
      return null;
    };
    const inDomain = (x) =>
      (x > first[0] || (x === first[0] && leftClosed)) && (x < last[0] || (x === last[0] && rightClosed));

    // Range: [min, max] unless the extreme value only happens at an open endpoint.
    const ys = full.map((v) => v[1]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const reached = (yv) =>
      full.some((v, i) => {
        if (v[1] !== yv) return false;
        if (i === 0) return leftClosed;
        if (i === full.length - 1) return rightClosed;
        return true;
      });

    const xInts = full.filter((v) => v[1] === 0 && inDomain(v[0])).map((v) => [v[0], 0]);
    const yInt = inDomain(0) ? [[0, valueAt(0)]] : [];

    return {
      kind: 'segments',
      win,
      vertices: full,
      leftClosed,
      rightClosed,
      valueAt,
      inDomain,
      domain: [{ lo: first[0], hi: last[0], loClosed: leftClosed, hiClosed: rightClosed }],
      range: [{ lo: minY, hi: maxY, loClosed: reached(minY), hiClosed: reached(maxY) }],
      xIntercepts: xInts,
      yIntercept: yInt,
    };
  }
  throw new Error('Could not build a segment graph');
}

export function segmentGraphVisual(g, extra = {}) {
  const { dots = [], ...rest } = extra;
  const first = g.vertices[0];
  const last = g.vertices[g.vertices.length - 1];
  return {
    type: 'graph',
    win: g.win,
    paths: [{ points: g.vertices, arrows: false }],
    dots: [
      { x: first[0], y: first[1], open: !g.leftClosed },
      { x: last[0], y: last[1], open: !g.rightClosed },
      ...dots,
    ],
    ...rest,
  };
}
