// Display helpers. Everything shown to the student uses a real minus sign (−).

const SUP = { 2: '²', 3: '³', 4: '⁴' };

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Reduced fraction {n, d} with positive denominator. */
export function frac(num, den = 1) {
  if (den === 0) throw new Error('Division by zero');
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

export const fracValue = (f) => f.n / f.d;

export function fracText(f) {
  const sign = f.n < 0 ? '−' : '';
  const a = Math.abs(f.n);
  return f.d === 1 ? `${sign}${a}` : `${sign}${a}/${f.d}`;
}

/** Number with a real minus sign. */
export const n = (x) => (x < 0 ? `−${Math.abs(x)}` : `${x}`);

/** Parenthesized only when negative: 2 · p(−3) → 2(−3). */
export const p = (x) => (x < 0 ? `(${n(x)})` : `${x}`);

/** Always parenthesized, for showing substitution: (3), (−3). */
export const pp = (x) => `(${n(x)})`;

/** "+ 3" or "− 3", for building (x − 3). */
export const signed = (x) => (x < 0 ? `− ${Math.abs(x)}` : `+ ${x}`);

/** terms: [[coef, power], ...] in descending power order. */
export function poly(terms, v = 'x') {
  let s = '';
  terms
    .filter(([c]) => c !== 0)
    .forEach(([c, pow], i) => {
      const abs = Math.abs(c);
      const coef = abs === 1 && pow !== 0 ? '' : String(abs);
      const vr = pow === 0 ? '' : pow === 1 ? v : v + (SUP[pow] || `^${pow}`);
      if (i === 0) s += (c < 0 ? '−' : '') + coef + vr;
      else s += ` ${c < 0 ? '−' : '+'} ${coef}${vr}`;
    });
  return s || '0';
}

export const point = (x, y) => `(${n(x)}, ${n(y)})`;

export const pointList = (pts) => (pts.length ? pts.map(([x, y]) => point(x, y)).join(', ') : 'none');

const endText = (v) => (v === Infinity ? '∞' : v === -Infinity ? '−∞' : n(v));

/** intervals: [{lo, hi, loClosed, hiClosed}] → "(−∞, 2) ∪ (5, ∞)" */
export function intervals(list) {
  if (!list.length) return 'none';
  return list
    .map((iv) => `${iv.loClosed ? '[' : '('}${endText(iv.lo)}, ${endText(iv.hi)}${iv.hiClosed ? ']' : ')'}`)
    .join(' ∪ ');
}

export const openIv = (lo, hi) => ({ lo, hi, loClosed: false, hiClosed: false });
