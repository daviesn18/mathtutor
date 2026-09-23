import { randInt, randNonZero, pick } from '../math/random.js';
import { n, pp, signed, point, gcd } from '../math/format.js';
import { numbersEqual } from '../math/parse.js';
import { choiceAnswer, pointsAnswer } from './shared.js';

const W = 8;
const POINT_HELP = 'Write the solution as a point, like (2, −1). You can also type x = 2, y = −1.';

// ---------- formatting helpers ----------

/** Linear expression from [[coef, variable]] pairs; variable '' is a constant. */
function lin(pairs) {
  let s = '';
  pairs
    .filter(([c]) => c !== 0)
    .forEach(([c, v], i) => {
      const abs = Math.abs(c);
      const coef = abs === 1 && v ? '' : abs === 0.5 && v ? '½' : String(abs);
      const body = coef + v;
      if (i === 0) s += (c < 0 ? '−' : '') + body;
      else s += ` ${c < 0 ? '−' : '+'} ${body}`;
    });
  return s || '0';
}

/** Coefficient written in front of parentheses: 1 → '', −1 → '−', ½, 3. */
const cd = (m) => (m === 1 ? '' : m === -1 ? '−' : m === 0.5 ? '½' : m === -0.5 ? '−½' : n(m));

/** Equation objects store a·x + b·y = c so any point can be checked. */
function yEq(m, k) {
  const text = m === 0 ? `y = ${n(k)}` : `y = ${lin([[m, 'x'], [k, '']])}`;
  return { a: -m, b: 1, c: k, m, k, kind: 'y', text };
}

function stdEq(a, b, c) {
  return { a, b, c, kind: 'std', text: `${lin([[a, 'x'], [b, 'y']])} = ${n(c)}` };
}

const holds = (e, x, y) => Math.abs(e.a * x + e.b * y - e.c) < 1e-9;

/** Substitution shown for checking a point: "3(2) − (−1) = 7". */
function plugText(e, x, y) {
  if (e.kind === 'y') {
    const rhs = e.m === 0 ? n(e.k) : `${cd(e.m)}${pp(x)}${e.k ? ' ' + signed(e.k) : ''}`;
    return { text: `${n(y)} = ${rhs}`, lhs: y, rhs: e.m * x + e.k };
  }
  const parts = [];
  if (e.a) parts.push(`${cd(e.a)}${pp(x)}`);
  if (e.b) parts.push(parts.length ? `${e.b < 0 ? '−' : '+'} ${cd(Math.abs(e.b))}${pp(y)}` : `${cd(e.b)}${pp(y)}`);
  return { text: `${parts.join(' ')} = ${n(e.c)}`, lhs: e.a * x + e.b * y, rhs: e.c };
}

function checkLine(e, x, y, label) {
  const { text, lhs, rhs } = plugText(e, x, y);
  const ok = Math.abs(lhs - rhs) < 1e-9;
  const simplified = e.kind === 'y' ? `${n(lhs)} = ${n(rhs)}` : `${n(lhs)} = ${n(rhs)}`;
  return { ok, line: `${label}: ${text}  →  ${simplified} ${ok ? '✓ true' : '✗ false'}` };
}

const systemMath = (e1, e2) => `${e1.text}\n${e2.text}`;

function linePoints(m, k) {
  return [
    [-W - 1, m * (-W - 1) + k],
    [W + 1, m * (W + 1) + k],
  ];
}

/** Feedback for a wrong (x, y) answer to a system with one solution. */
function systemDiagnose(e1, e2, [x0, y0], extra) {
  return (raw, parsed) => {
    if (!parsed) return null;
    if (parsed.length === 0) return 'These lines cross, so there is exactly one solution. Find the point that works in both equations.';
    if (parsed.length > 1) return 'Two lines with different slopes cross at exactly one point. Give just one (x, y).';
    const [x, y] = parsed[0];
    if (numbersEqual(x, y0) && numbersEqual(y, x0) && x0 !== y0) return 'Right numbers, wrong order. The x-value goes first: (x, y).';
    const extraMsg = extra?.(x, y);
    if (extraMsg) return extraMsg;
    const ok1 = holds(e1, x, y);
    const ok2 = holds(e2, x, y);
    if (ok1 && ok2) return null;
    if (ok1 && !ok2) return 'Your point works in the first equation but not the second. A solution has to make BOTH equations true.';
    if (ok2 && !ok1) return 'Your point works in the second equation but not the first. A solution has to make BOTH equations true.';
    if (numbersEqual(x, x0)) return `Your x-value is right. Recheck the step where you plug x = ${n(x0)} back in to find y.`;
    if (numbersEqual(y, y0)) return `Your y-value is right. Recheck the step where you find x.`;
    return null;
  };
}

const RETEACH_SOLUTION = {
  title: 'What a solution to a system is',
  text: [
    'A system is two equations that have to be true **at the same time**.',
    'Each equation is a line. The solution is the point where the lines **cross**, because that point is on both lines.',
    'Always check your answer: plug the x and y into BOTH original equations. If both come out true, you\'re done.',
  ],
};

// ---------- skill: check a point ----------

function genCheck() {
  let m;
  let k;
  let a;
  let b;
  let x0;
  let y0;
  do {
    m = randNonZero(-3, 3);
    x0 = randInt(-4, 4);
    y0 = randInt(-5, 5);
    k = y0 - m * x0;
    a = randNonZero(-4, 4);
    b = randNonZero(-4, 4);
  } while (Math.abs(k) > 9 || a + b * m === 0);
  const e1 = yEq(m, k);
  const e2 = stdEq(a, b, a * x0 + b * y0);

  // The point to test: the real solution, a point on only one line, or neither.
  const r = Math.random();
  let pt = [x0, y0];
  if (r > 0.45) {
    const d = randNonZero(-3, 3);
    pt = [x0 + d, m * (x0 + d) + k]; // on the first line only
  }
  if (r > 0.8) pt = [x0 + randNonZero(-2, 2), y0 + randNonZero(-2, 2)];
  const [px, py] = pt;
  const c1 = checkLine(e1, px, py, 'First equation');
  const c2 = checkLine(e2, px, py, 'Second equation');
  const isSol = c1.ok && c2.ok;

  return {
    skill: 'check',
    prompt: `Is ${point(px, py)} a solution to this system?`,
    math: systemMath(e1, e2),
    answer: choiceAnswer(['Yes, it is a solution', 'No, it is not a solution'], isSol ? 0 : 1),
    hints: [
      `Plug x = ${n(px)} and y = ${n(py)} into each equation.`,
      'It only counts as a solution if BOTH equations come out true.',
    ],
    solution: [
      `Substitute x = ${n(px)} and y = ${n(py)} into each equation.`,
      c1.line,
      c2.line,
      isSol
        ? 'Both equations are true, so it is a solution.'
        : c1.ok || c2.ok
          ? 'It works in only one equation, so it is NOT a solution to the system.'
          : 'Neither equation is true, so it is not a solution.',
    ],
    reteach: RETEACH_SOLUTION,
    diagnose: (raw) =>
      raw === 0 && !isSol && (c1.ok || c2.ok)
        ? `It does work in the ${c1.ok ? 'first' : 'second'} equation. Now check the ${c1.ok ? 'second' : 'first'} one too. A solution has to make both true.`
        : null,
  };
}

// ---------- skill: graphing ----------

const GRAPH_SLOPES = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];

function genGraphing() {
  let x0;
  let y0;
  let m1;
  let m2;
  let k1;
  let k2;
  for (;;) {
    x0 = randInt(-5, 5);
    y0 = randInt(-5, 5);
    m1 = pick(GRAPH_SLOPES);
    m2 = pick(GRAPH_SLOPES);
    if (m1 === m2) continue;
    k1 = y0 - m1 * x0;
    k2 = y0 - m2 * x0;
    if (!Number.isInteger(k1) || !Number.isInteger(k2)) continue;
    if (Math.abs(k1) > 8 || Math.abs(k2) > 8) continue;
    break;
  }
  const e1 = yEq(m1, k1);
  const e2 = yEq(m2, k2);
  const paths = [
    { points: linePoints(m1, k1), arrows: true, tone: 'ink' },
    { points: linePoints(m2, k2), arrows: true, tone: 'accent' },
  ];
  const c1 = checkLine(e1, x0, y0, 'Dark line');
  const c2 = checkLine(e2, x0, y0, 'Blue line');
  return {
    skill: 'graphing',
    prompt: `Solve the system by graphing. The dark line is ${e1.text} and the blue line is ${e2.text}.`,
    math: systemMath(e1, e2),
    visual: { type: 'graph', win: W, paths },
    answer: pointsAnswer([[x0, y0]]),
    inputKind: 'points',
    inputHelp: POINT_HELP,
    hints: ['Find the one point where the two lines cross.', 'Read its x-value (across) and y-value (up or down), then check it in both equations.'],
    solution: [
      `The two lines cross at ${point(x0, y0)}.`,
      'Check it in both equations:',
      c1.line,
      c2.line,
      `Solution: ${point(x0, y0)}`,
    ],
    reteach: {
      title: 'Solving by graphing',
      text: [
        'Graph both lines. The solution is the point where they **cross**, because it is the only point on both lines.',
        'Read the crossing point: go straight down (or up) to the x-axis for x, and straight across to the y-axis for y.',
        'Graphing is quick when the answer lands on the grid, but always check it in both equations.',
      ],
      visual: {
        type: 'graph',
        win: W,
        paths,
        vLines: [{ x: x0, tone: 'muted' }],
        hLines: [{ y: y0, tone: 'muted' }],
        dots: [{ x: x0, y: y0, label: point(x0, y0), tone: 'accent' }],
      },
      caption: 'The dashed lines show how to read the crossing point.',
    },
    diagnose: systemDiagnose(e1, e2, [x0, y0], (x, y) =>
      x === 0 && (y === k1 || y === k2) && !(x0 === 0 && y === y0)
        ? 'That\'s where a line crosses the y-axis (its y-intercept). The solution is where the two lines cross EACH OTHER.'
        : null
    ),
  };
}

// ---------- skill: substitution ----------

function genSubstitution() {
  const x0 = randInt(-6, 6);
  const y0 = randInt(-6, 6);

  if (Math.random() < 0.55) {
    // y = mx + k, and ax + by = c
    let m;
    let k;
    let a;
    let b;
    do {
      m = randNonZero(-4, 4);
      k = y0 - m * x0;
      a = randNonZero(-5, 5);
      b = randNonZero(-5, 5);
    } while (a + b * m === 0 || Math.abs(k) > 12);
    const c = a * x0 + b * y0;
    const e1 = yEq(m, k);
    const e2 = stdEq(a, b, c);
    const A = a + b * m;
    const bk = b * k;
    const expr = lin([[m, 'x'], [k, '']]);
    const steps = [
      `The first equation already tells you what y equals. Replace y in the second equation with (${expr}):`,
      `${lin([[a, 'x']])} ${b < 0 ? '−' : '+'} ${cd(Math.abs(b))}(${expr}) = ${n(c)}`,
      `Distribute: ${lin([[a, 'x'], [b * m, 'x'], [bk, '']])} = ${n(c)}`,
      `Combine like terms: ${lin([[A, 'x'], [bk, '']])} = ${n(c)}`,
    ];
    if (bk) steps.push(`${bk > 0 ? 'Subtract' : 'Add'} ${Math.abs(bk)} on both sides: ${lin([[A, 'x']])} = ${n(c - bk)}`);
    if (A !== 1) steps.push(`Divide both sides by ${n(A)}: x = ${n(x0)}`);
    steps.push(`Plug x = ${n(x0)} into y = ${expr}: y = ${cd(m)}${pp(x0)}${k ? ' ' + signed(k) : ''} = ${n(y0)}`);
    steps.push(checkLine(e2, x0, y0, `Check ${point(x0, y0)} in the second equation`).line);
    steps.push(`Solution: ${point(x0, y0)}`);
    return substitutionProblem(e1, e2, [x0, y0], steps, 'y');
  }

  // x + py = q (x has coefficient 1), and ax + by = c
  let p;
  let a;
  let b;
  do {
    p = randNonZero(-4, 4);
    a = randNonZero(-5, 5);
    b = randNonZero(-5, 5);
  } while (b - a * p === 0);
  const q = x0 + p * y0;
  const c = a * x0 + b * y0;
  const e1 = stdEq(1, p, q);
  const e2 = stdEq(a, b, c);
  const B = b - a * p;
  const aq = a * q;
  const xExpr = lin([[-p, 'y'], [q, '']]);
  const steps = [
    `In the first equation x has a coefficient of 1, so solve it for x: x = ${xExpr}`,
    `Replace x in the second equation with (${xExpr}):`,
    `${cd(a)}(${xExpr}) ${b < 0 ? '−' : '+'} ${cd(Math.abs(b))}y = ${n(c)}`,
    `Distribute: ${lin([[aq, ''], [-a * p, 'y'], [b, 'y']])} = ${n(c)}`,
    `Combine like terms: ${lin([[aq, ''], [B, 'y']])} = ${n(c)}`,
  ];
  if (aq) steps.push(`${aq > 0 ? 'Subtract' : 'Add'} ${Math.abs(aq)} on both sides: ${lin([[B, 'y']])} = ${n(c - aq)}`);
  if (B !== 1) steps.push(`Divide both sides by ${n(B)}: y = ${n(y0)}`);
  steps.push(`Plug y = ${n(y0)} into x = ${xExpr}: x = ${cd(-p)}${pp(y0)}${q ? ' ' + signed(q) : ''} = ${n(x0)}`);
  steps.push(checkLine(e2, x0, y0, `Check ${point(x0, y0)} in the second equation`).line);
  steps.push(`Solution: ${point(x0, y0)}`);
  return substitutionProblem(e1, e2, [x0, y0], steps, 'x');
}

function substitutionProblem(e1, e2, sol, steps, isolated) {
  return {
    skill: 'substitution',
    prompt: 'Solve the system using substitution.',
    math: systemMath(e1, e2),
    answer: pointsAnswer([sol]),
    inputKind: 'points',
    inputHelp: POINT_HELP,
    hints:
      isolated === 'y'
        ? ['The first equation says y equals an expression. Put that whole expression, in parentheses, where y is in the second equation.', 'Now the second equation only has x in it. Solve for x, then plug x back in to find y.']
        : ['Solve the first equation for x (move the y-term to the other side).', 'Put that expression in parentheses where x is in the second equation, then solve for y.'],
    solution: steps,
    reteach: {
      title: 'Substitution: swap in what a variable equals',
      text: [
        '1. Get one variable **by itself** in one equation (pick one with a coefficient of 1 if you can).',
        '2. **Substitute** that expression, in parentheses, into the OTHER equation. Now it has only one variable.',
        '3. Solve for that variable.',
        '4. Plug that value back into the equation from step 1 to find the other variable.',
        '5. Write the answer as a point (x, y) and check it in both equations.',
        'Watch the distribution: −3(2x − 1) = −6x + 3. The negative multiplies both terms.',
      ],
    },
    diagnose: systemDiagnose(e1, e2, sol),
  };
}

// ---------- skill: elimination ----------

const scale = (e, m) => ({ a: e.a * m, b: e.b * m, c: e.c * m });
const stdText = (e) => `${lin([[e.a, 'x'], [e.b, 'y']])} = ${n(e.c)}`;

function elimSteps(e1, e2, cancel, m1, m2, sol) {
  const keep = cancel === 'y' ? 'x' : 'y';
  const kc = keep === 'x' ? 'a' : 'b';
  const cc = cancel === 'x' ? 'a' : 'b';
  const s1 = scale(e1, m1);
  const s2 = scale(e2, m2);
  const steps = [];
  if (m1 === 1 && m2 === 1) {
    steps.push(`The ${cancel}-terms (${lin([[e1[cc], cancel]])} and ${lin([[e2[cc], cancel]])}) are opposites, so adding the equations will cancel ${cancel}.`);
  } else {
    steps.push(`The ${cancel}-terms (${lin([[e1[cc], cancel]])} and ${lin([[e2[cc], cancel]])}) aren't opposites yet. Multiply to make them opposites:`);
    if (m1 !== 1) steps.push(`Multiply every term in the first equation by ${n(m1)}:   ${stdText(s1)}`);
    if (m2 !== 1) steps.push(`Multiply every term in the second equation by ${n(m2)}:   ${stdText(s2)}`);
  }
  const K = s1[kc] + s2[kc];
  const C = s1.c + s2.c;
  steps.push(`Add the equations. The ${cancel}-terms cancel: ${lin([[K, keep]])} = ${n(C)}`);
  if (K !== 1) steps.push(`Divide both sides by ${n(K)}: ${keep} = ${n(sol[keep])}`);

  const v = sol[keep];
  const sub =
    keep === 'x'
      ? `${cd(e1.a)}${pp(v)} ${e1.b < 0 ? '−' : '+'} ${cd(Math.abs(e1.b))}y = ${n(e1.c)}`
      : `${lin([[e1.a, 'x']])} ${e1.b < 0 ? '−' : '+'} ${cd(Math.abs(e1.b))}${pp(v)} = ${n(e1.c)}`;
  const rest = e1.c - e1[kc] * v;
  steps.push(`Plug ${keep} = ${n(v)} into the original first equation: ${sub}`);
  steps.push(`Simplify: ${lin([[e1[cc], cancel]])} = ${n(rest)}${e1[cc] !== 1 ? `, so ${cancel} = ${n(sol[cancel])}` : ''}`);
  steps.push(checkLine(e2, sol.x, sol.y, `Check ${point(sol.x, sol.y)} in the second equation`).line);
  steps.push(`Solution: ${point(sol.x, sol.y)}`);
  return steps;
}

/** Builds a·x + b·y = c pairs from coefficients keyed by variable. */
function eqFrom(cancel, keepCoef, cancelCoef, sol) {
  const a = cancel === 'y' ? keepCoef : cancelCoef;
  const b = cancel === 'y' ? cancelCoef : keepCoef;
  return { a, b, c: a * sol.x + b * sol.y };
}

function genElimAdd() {
  const sol = { x: randInt(-6, 6), y: randInt(-6, 6) };
  const cancel = pick(['x', 'y']);
  const u = randNonZero(-5, 5);
  let k1;
  let k2;
  do {
    k1 = randNonZero(-5, 5);
    k2 = randNonZero(-5, 5);
  } while (k1 + k2 === 0);
  const e1 = eqFrom(cancel, k1, u, sol);
  const e2 = eqFrom(cancel, k2, -u, sol);
  return elimProblem('elimination-add', e1, e2, elimSteps(e1, e2, cancel, 1, 1, sol), sol, cancel, 'add');
}

function genElimMultiply() {
  const sol = { x: randInt(-5, 5), y: randInt(-5, 5) };
  const cancel = pick(['x', 'y']);
  let u1;
  let u2;
  let m1;
  let m2;
  let k1;
  let k2;
  for (;;) {
    if (Math.random() < 0.55) {
      // Multiply just one equation.
      const small = pick([1, -1, 2, -2]);
      const factor = pick([2, 3, 4, -2, -3]);
      const big = -factor * small;
      if (Math.random() < 0.5) {
        [u1, u2, m1, m2] = [big, small, 1, factor];
      } else {
        [u1, u2, m1, m2] = [small, big, factor, 1];
      }
    } else {
      // Multiply both equations (coefficients like 3 and 2).
      u1 = pick([2, 3, 4, 5]) * pick([1, -1]);
      u2 = pick([2, 3, 4, 5]) * pick([1, -1]);
      if (gcd(u1, u2) !== 1) continue;
      m1 = Math.abs(u2);
      m2 = Math.abs(u1) * (Math.sign(u1) === Math.sign(u2) ? -1 : 1);
    }
    k1 = randNonZero(-5, 5);
    k2 = randNonZero(-5, 5);
    if (k1 * m1 + k2 * m2 === 0) continue;
    if (k1 * u2 === k2 * u1) continue; // parallel
    break;
  }
  const e1 = eqFrom(cancel, k1, u1, sol);
  const e2 = eqFrom(cancel, k2, u2, sol);
  return elimProblem('elimination-multiply', e1, e2, elimSteps(e1, e2, cancel, m1, m2, sol), sol, cancel, 'multiply');
}

function elimProblem(skill, r1, r2, steps, sol, cancel, kind) {
  const e1 = stdEq(r1.a, r1.b, r1.c);
  const e2 = stdEq(r2.a, r2.b, r2.c);
  return {
    skill,
    prompt: 'Solve the system using elimination.',
    math: systemMath(e1, e2),
    answer: pointsAnswer([[sol.x, sol.y]]),
    inputKind: 'points',
    inputHelp: POINT_HELP,
    hints:
      kind === 'add'
        ? [`Look at the ${cancel}-terms. What happens if you add the two equations together?`, `Add straight down: x-terms together, y-terms together, and the numbers on the right together. Solve what's left, then plug back in.`]
        : [
            `Pick a variable to cancel. Multiply one or both equations so its coefficients become opposites (like 6 and −6).`,
            'Multiply EVERY term, including the number on the right side. Then add the equations.',
          ],
    solution: steps,
    reteach: {
      title: kind === 'add' ? 'Elimination: add to cancel a variable' : 'Elimination: multiply first, then add',
      text:
        kind === 'add'
          ? [
              'Line the equations up: x under x, y under y, numbers on the right.',
              'If one variable has **opposite coefficients** (like 3y and −3y), adding the equations makes it disappear.',
              'Solve the one-variable equation that\'s left, then plug that value into either original equation to find the other variable.',
              'Check your point in both equations.',
            ]
          : [
              'When no coefficients are opposites yet, **multiply** an equation (or both) so one variable\'s coefficients become opposites.',
              'Example: 2y and 3y → multiply the first by 3 and the second by −2 to get 6y and −6y.',
              'Multiply **every** term, including the number on the right. Forgetting that number is the most common mistake.',
              'Then add the equations, solve for the variable that\'s left, and plug back in for the other one.',
            ],
    },
    diagnose: systemDiagnose(e1, e2, [sol.x, sol.y]),
  };
}

// ---------- skill: special cases ----------

const TYPE_CHOICES = ['Exactly one solution', 'No solution', 'Infinitely many solutions'];

function genSpecialCases() {
  const type = pick(['one', 'none', 'infinite', 'none', 'infinite']);
  const m = randInt(-3, 3);
  const k1 = randInt(-6, 6);
  const e1 = yEq(m, k1);
  let m2 = m;
  let k2 = k1;
  if (type === 'one') {
    do m2 = randInt(-3, 3);
    while (m2 === m);
    k2 = randInt(-6, 6);
  } else if (type === 'none') {
    do k2 = randInt(-6, 6);
    while (k2 === k1);
  }

  // Show the second equation in y = form or scaled standard form.
  const useStd = Math.random() < 0.6;
  let e2;
  const steps = [];
  if (useStd) {
    const s = pick([2, 3, -2, -1]);
    e2 = stdEq(-m2 * s, s, k2 * s);
    steps.push(`Solve the second equation for y so it's easy to compare: ${lin([[s, 'y']])} = ${lin([[m2 * s, 'x'], [k2 * s, '']])}${s !== 1 ? `, so y = ${yEq(m2, k2).text.slice(4)}` : ''}`);
  } else {
    e2 = yEq(m2, k2);
  }
  const slope = (v) => (v < 0 ? `−${-v}` : `${v}`);
  if (type === 'one') {
    steps.push(`The slopes are ${slope(m)} and ${slope(m2)}. Different slopes mean the lines cross at exactly one point.`);
  } else if (type === 'none') {
    steps.push(`Both lines have slope ${slope(m)}, but their y-intercepts are different (${n(k1)} and ${n(k2)}). They are parallel and never meet.`);
    steps.push(`Algebra shows the same thing: setting them equal, the x-terms cancel and you get ${n(k1)} = ${n(k2)}, which is false.`);
  } else {
    steps.push(`Both equations are really y = ${yEq(m, k1).text.slice(4)}. They are the same line, so every point on it works.`);
    steps.push(`Algebra shows the same thing: setting them equal, everything cancels and you get ${n(k1)} = ${n(k1)}, which is always true.`);
  }
  steps.push(`Answer: ${TYPE_CHOICES[['one', 'none', 'infinite'].indexOf(type)].toLowerCase()}.`);

  const showGraph = Math.random() < 0.4;
  const visual = {
    type: 'graph',
    win: W,
    paths: [
      { points: linePoints(m, k1), arrows: true, tone: 'ink' },
      { points: linePoints(m2, k2), arrows: true, tone: 'accent', dashed: type === 'infinite' },
    ],
  };
  const correct = ['one', 'none', 'infinite'].indexOf(type);

  return {
    skill: 'special-cases',
    prompt: 'How many solutions does this system have?',
    math: systemMath(e1, e2),
    visual: showGraph ? visual : undefined,
    answer: choiceAnswer(TYPE_CHOICES, correct),
    hints: [
      'Write both equations as y = mx + b, then compare the slopes (m) and the y-intercepts (b).',
      'Different slopes: they cross once. Same slope, different intercept: parallel. Same slope, same intercept: the same line.',
    ],
    solution: steps,
    reteach: {
      title: 'One, none, or infinitely many',
      text: [
        '**Different slopes** → the lines cross once → exactly one solution.',
        '**Same slope, different y-intercepts** → parallel lines never touch → no solution. Algebra ends in something false, like 3 = −1.',
        '**Same slope, same y-intercept** → it\'s the same line twice → infinitely many solutions. Algebra ends in something always true, like 4 = 4 or 0 = 0.',
        'To compare, rewrite both equations in y = mx + b form.',
      ],
      visual: { ...visual },
      caption:
        type === 'infinite'
          ? 'The two lines sit exactly on top of each other (the blue one is dashed so you can see it).'
          : type === 'none'
            ? 'Parallel lines: same steepness, never touching.'
            : 'Different slopes, so they cross exactly once.',
    },
    diagnose: (raw) => {
      if (type === 'none' && raw === 2) return 'Same slope, yes, but look at the y-intercepts. Different intercepts means two separate parallel lines.';
      if (type === 'infinite' && raw === 1) return 'The slopes match, but so do the y-intercepts once you solve for y. That makes it the same line.';
      if (type === 'one' && raw !== 0) return 'Compare the slopes again. If the slopes are different, the lines have to cross.';
      return null;
    },
  };
}

// ---------- topic ----------

const EX1 = { m: 1, k: 1 };
const EX2 = { m: -2, k: 4 };

export default {
  id: 'systems',
  title: 'Solving systems of equations',
  summary: 'Solve two-equation linear systems by graphing, substitution, and elimination, and spot systems with no solution or infinitely many.',
  skills: [
    { id: 'check', name: 'Checking a solution', generate: genCheck },
    { id: 'graphing', name: 'Solving by graphing', generate: genGraphing },
    { id: 'substitution', name: 'Solving by substitution', generate: genSubstitution },
    { id: 'elimination-add', name: 'Elimination (just add)', generate: genElimAdd },
    { id: 'elimination-multiply', name: 'Elimination (multiply first)', generate: genElimMultiply },
    { id: 'special-cases', name: 'No solution or infinitely many', generate: genSpecialCases },
  ],
  lesson: [
    {
      title: 'What is a system?',
      body: [
        'A **system of equations** is two (or more) equations that must be true **at the same time**.',
        'Each linear equation is a line. The **solution** is the point where the lines cross, because that point is on both lines.',
        'Write the solution as a point (x, y). To check it, plug it into **both** equations. Working in just one isn\'t enough.',
      ],
      example: {
        prompt: 'Is (1, 2) a solution to y = x + 1 and y = −2x + 4?',
        steps: ['First: 2 = 1 + 1 → 2 = 2 ✓', 'Second: 2 = −2(1) + 4 → 2 = 2 ✓', 'Both are true, so (1, 2) is the solution.'],
      },
      practice: 'check',
    },
    {
      title: 'Method 1: Graphing',
      body: [
        'Graph both lines (y = mx + b form makes this easy: start at b, then use the slope).',
        'The solution is where they **cross**. Read the point, then check it in both equations.',
        'Graphing is great for seeing what\'s going on, but it only gives exact answers when they land on the grid.',
      ],
      example: {
        prompt: 'y = x + 1 and y = −2x + 4',
        visual: {
          type: 'graph',
          win: 6,
          paths: [
            { points: [[-7, EX1.m * -7 + EX1.k], [7, EX1.m * 7 + EX1.k]], arrows: true, tone: 'ink' },
            { points: [[-7, EX2.m * -7 + EX2.k], [7, EX2.m * 7 + EX2.k]], arrows: true, tone: 'accent' },
          ],
          dots: [{ x: 1, y: 2, label: '(1, 2)', tone: 'accent' }],
        },
        steps: ['The dark line starts at 1 and rises 1 for each step right.', 'The blue line starts at 4 and drops 2 for each step right.', 'They cross at (1, 2).'],
      },
      practice: 'graphing',
    },
    {
      title: 'Method 2: Substitution',
      body: [
        'Best when one variable is **already by itself** (like y = 2x − 1) or has a coefficient of 1.',
        'Replace that variable in the **other** equation with what it equals, in parentheses. Now you have one equation with one variable.',
      ],
      example: {
        prompt: 'y = 2x − 1 and 3x + y = 9',
        steps: [
          'Substitute: 3x + (2x − 1) = 9',
          'Combine: 5x − 1 = 9',
          'Solve: 5x = 10, so x = 2',
          'Plug back in: y = 2(2) − 1 = 3',
          'Solution: (2, 3). Check: 3(2) + 3 = 9 ✓',
        ],
      },
      practice: 'substitution',
    },
    {
      title: 'Method 3: Elimination',
      body: [
        'Best when both equations are in **standard form** (Ax + By = C). Line them up and add them so one variable **cancels**.',
        'It cancels when its coefficients are **opposites**, like 3y and −3y.',
      ],
      example: {
        prompt: '2x + 3y = 12 and 4x − 3y = 6',
        steps: [
          '3y and −3y are opposites. Add the equations: 6x = 18',
          'x = 3',
          'Plug into the first: 2(3) + 3y = 12 → 3y = 6 → y = 2',
          'Solution: (3, 2). Check: 4(3) − 3(2) = 6 ✓',
        ],
      },
      practice: 'elimination-add',
    },
    {
      title: 'Elimination when you have to multiply first',
      body: [
        'If nothing cancels yet, **multiply** one or both equations so a variable\'s coefficients become opposites.',
        'Multiply **every** term, including the number on the right side.',
      ],
      example: {
        prompt: 'x + 2y = 5 and 3x − y = 8',
        steps: [
          'The y-terms are 2y and −y. Multiply the second equation by 2: 6x − 2y = 16',
          'Add to the first: 7x = 21, so x = 3',
          'Plug into the first: 3 + 2y = 5 → y = 1',
          'Solution: (3, 1). Check: 3(3) − 1 = 8 ✓',
        ],
      },
      practice: 'elimination-multiply',
    },
    {
      title: 'No solution or infinitely many',
      body: [
        '**Parallel lines** (same slope, different y-intercepts) never cross: **no solution**. Algebra ends with something false, like 1 = −3.',
        '**The same line** written two ways: **infinitely many solutions**. Algebra ends with something always true, like 0 = 0.',
      ],
      example: {
        prompt: 'y = 2x + 1 and y = 2x − 3',
        visual: {
          type: 'graph',
          win: 6,
          paths: [
            { points: [[-7, -13], [7, 15]], arrows: true, tone: 'ink' },
            { points: [[-7, -17], [7, 11]], arrows: true, tone: 'accent' },
          ],
        },
        steps: ['Same slope (2), different intercepts (1 and −3): parallel.', 'Substitution: 2x + 1 = 2x − 3 → 1 = −3, which is false.', 'No solution.'],
      },
      practice: 'special-cases',
    },
    {
      title: 'Which method should I use?',
      body: [
        '**Graphing**: when you want to see it, or both are in y = mx + b form with nice numbers.',
        '**Substitution**: when a variable is already alone, or has a coefficient of 1.',
        '**Elimination**: when both are in standard form, especially if a variable already has opposite (or easy-to-match) coefficients.',
        'Every method gives the same answer. Pick the one that makes the least work.',
      ],
    },
  ],
};
