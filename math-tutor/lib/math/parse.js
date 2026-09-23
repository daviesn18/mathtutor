// Turns what the student types into comparable values.
// Accepts both keyboard-friendly input ("-inf", "U") and symbols ("−∞", "∪").

const NONE_WORDS = new Set(['none', 'nothing', 'no', 'empty', '∅', '{}', 'dne', 'noneofthem', 'thereisnone', 'na', 'n/a']);
const ALL_REALS = new Set(['allreals', 'allrealnumbers', 'r', 'ℝ', 'reals', 'allnumbers', 'realnumbers']);

export function normalize(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/infinity|infinite|∞/g, 'inf')
    .replace(/\s+/g, '')
    .replace(/^x=/, '')
    .replace(/^y=/, '')
    .replace(/^f\([^)]*\)=/, '');
}

/** "3", "-1.5", "3/2", "-3/2", "(−4)" → number, or null if unreadable. */
export function parseNumber(raw) {
  let s = normalize(raw);
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
  if (/^[+-]?\d+(\.\d+)?$/.test(s) || /^[+-]?\.\d+$/.test(s)) return parseFloat(s);
  const m = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
  if (m) {
    const den = parseInt(m[4], 10);
    if (den === 0) return null;
    const sign = (m[1] === '-' ? -1 : 1) * (m[3] === '-' ? -1 : 1);
    return (sign * parseInt(m[2], 10)) / den;
  }
  return null;
}

export const numbersEqual = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-6;

function parseEnd(tok) {
  if (tok === 'inf' || tok === '+inf') return Infinity;
  if (tok === '-inf') return -Infinity;
  return parseNumber(tok);
}

/**
 * "(-inf, -2) U (3, 5]" → [{lo, hi, loClosed, hiClosed}]
 * Returns [] for "none", null if it can't be read.
 */
export function parseIntervals(raw) {
  const s = normalize(raw);
  if (!s) return null;
  if (NONE_WORDS.has(s)) return [];
  if (ALL_REALS.has(s)) return [{ lo: -Infinity, hi: Infinity, loClosed: false, hiClosed: false }];
  const pieces = s.split(/u|∪|,and,|and|or/).filter(Boolean);
  const out = [];
  for (const piece of pieces) {
    const m = piece.match(/^([[(])([^,]+),([^,]+)([\])])$/);
    if (!m) return null;
    const lo = parseEnd(m[2]);
    const hi = parseEnd(m[3]);
    if (lo === null || hi === null) return null;
    out.push({ lo, hi, loClosed: m[1] === '[', hiClosed: m[4] === ']' });
  }
  return out.sort((a, b) => a.lo - b.lo);
}

export function intervalsEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.lo - y.lo);
  const sb = [...b].sort((x, y) => x.lo - y.lo);
  return sa.every((iv, i) => {
    const jv = sb[i];
    return (
      (iv.lo === jv.lo || numbersEqual(iv.lo, jv.lo)) &&
      (iv.hi === jv.hi || numbersEqual(iv.hi, jv.hi)) &&
      iv.loClosed === jv.loClosed &&
      iv.hiClosed === jv.hiClosed
    );
  });
}

/** Same numbers, ignoring bracket style. Used to spot "right idea, wrong brackets". */
export function intervalsSameEnds(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.lo - y.lo);
  const sb = [...b].sort((x, y) => x.lo - y.lo);
  return sa.every((iv, i) => iv.lo === sb[i].lo && iv.hi === sb[i].hi);
}

/** "(2, 5), (-1, 3)" → [[2,5],[-1,3]]. [] for "none", null if unreadable. */
export function parsePoints(raw) {
  // Also accept "x = 2, y = -1" (either order) for a single point.
  const flat = String(raw ?? '').toLowerCase().replace(/[−–—]/g, '-').replace(/\s+/g, '');
  const xy = flat.match(/^x=([^,;]+?)(?:,and|,|;|and)y=(.+)$/);
  const yx = flat.match(/^y=([^,;]+?)(?:,and|,|;|and)x=(.+)$/);
  if (xy || yx) {
    const x = parseNumber(xy ? xy[1] : yx[2]);
    const y = parseNumber(xy ? xy[2] : yx[1]);
    if (x !== null && y !== null) return [[x, y]];
  }
  const s = normalize(raw);
  if (!s) return null;
  if (NONE_WORDS.has(s)) return [];
  const re = /\(([^,()]+),([^,()]+)\)/g;
  const pts = [];
  let m;
  let consumed = '';
  while ((m = re.exec(s))) {
    const x = parseNumber(m[1]);
    const y = parseNumber(m[2]);
    if (x === null || y === null) return null;
    pts.push([x, y]);
    consumed += m[0];
  }
  // Everything that isn't a point should only be separators.
  const leftover = s.replace(re, '').replace(/[,;&]|and/g, '');
  if (!pts.length || leftover.length) return null;
  return pts;
}

export function pointsEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const key = ([x, y]) => `${Math.round(x * 1e6)}|${Math.round(y * 1e6)}`;
  const sa = new Set(a.map(key));
  return b.every((pt) => sa.has(key(pt))) && sa.size === new Set(b.map(key)).size;
}

/**
 * Checks a raw answer against a problem's answer spec.
 * Returns { correct, readable, feedback }.
 */
export function checkAnswer(answer, raw) {
  switch (answer.type) {
    case 'choice':
      return { correct: raw === answer.value, readable: raw !== null && raw !== undefined };
    case 'number': {
      const v = parseNumber(raw);
      if (v === null)
        return { correct: false, readable: false, feedback: 'Enter a number like 7, −2, 1.5, or 3/4.' };
      return { correct: numbersEqual(v, answer.value), readable: true, parsed: v };
    }
    case 'interval': {
      const v = parseIntervals(raw);
      if (v === null)
        return {
          correct: false,
          readable: false,
          feedback: 'Use interval notation, like (−∞, 2) ∪ (5, ∞). Type "inf" for ∞ and "U" for ∪, or "none".',
        };
      const bad = v.find((iv) => (iv.lo === -Infinity && iv.loClosed) || (iv.hi === Infinity && iv.hiClosed));
      if (bad && !intervalsEqual(v, answer.value))
        return {
          correct: false,
          readable: true,
          parsed: v,
          feedback: 'Infinity always gets a parenthesis ( ), never a bracket [ ], because you can never actually reach it.',
        };
      return { correct: intervalsEqual(v, answer.value), readable: true, parsed: v };
    }
    case 'points': {
      const v = parsePoints(raw);
      if (v === null)
        return {
          correct: false,
          readable: false,
          feedback: 'Write points like (2, 5). Separate more than one with commas, or type "none".',
        };
      return { correct: pointsEqual(v, answer.value), readable: true, parsed: v };
    }
    default:
      return { correct: false, readable: false };
  }
}
