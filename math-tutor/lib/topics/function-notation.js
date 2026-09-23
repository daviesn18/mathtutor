import { randInt, randNonZero, pick, sample, range } from '../math/random.js';
import { n, p, pp, poly, signed, frac, fracText, point } from '../math/format.js';
import { randomSegmentGraph, segmentGraphVisual } from '../math/curves.js';
import { numberAnswer, fracAnswer, matches } from './shared.js';

// ---------- helpers ----------

/** "2", "−", "" for a leading coefficient in front of a parenthesis. */
const lead = (a) => (a === 1 ? '' : a === -1 ? '−' : n(a));

/** Worked steps for f(k) where f(x) = ax² + bx + c. */
function quadSteps(name, a, b, c, k) {
  const A = a * k * k;
  const B = b * k;
  const total = A + B + c;
  const line1Parts = [`${lead(a)}${pp(k)}²`];
  if (b) line1Parts.push(`${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}${pp(k)}`);
  if (c) line1Parts.push(signed(c));
  const line2Parts = [`${lead(a)}(${k * k})`];
  if (b) line2Parts.push(signed(B));
  if (c) line2Parts.push(signed(c));
  const line3 = [n(A), ...(b ? [signed(B)] : []), ...(c ? [signed(c)] : [])].join(' ');
  return {
    total,
    A,
    B,
    steps: [
      `Replace every x with (${n(k)}). Keep the parentheses!`,
      `${name}(${n(k)}) = ${line1Parts.join(' ')}`,
      `Square first: (${n(k)})² = ${k * k}.   So ${name}(${n(k)}) = ${line2Parts.join(' ')}`,
      `Multiply: ${name}(${n(k)}) = ${line3}`,
      `Add: ${name}(${n(k)}) = ${n(total)}`,
    ],
  };
}

const RETEACH_SUB = {
  title: 'Direct substitution',
  text: [
    'f(x) is a machine named f. Whatever is inside the parentheses is the input that replaces x.',
    'f(−3) means: erase every x in the rule and write (−3) in its place. Use parentheses every time.',
    'Then simplify using order of operations: exponents first, then multiply, then add and subtract.',
    'Watch the negatives: (−3)² = (−3)(−3) = +9, and −5(−3) = +15.',
  ],
};

// ---------- generators ----------

function genEvalQuadratic() {
  const a = pick([1, 2, 3, -1, -2]);
  const b = randInt(-6, 6);
  const c = randInt(-9, 9);
  const k = Math.random() < 0.65 ? randInt(-4, -1) : randInt(2, 4);
  const rule = poly([[a, 2], [b, 1], [c, 0]]);
  const { total, A, B, steps } = quadSteps('f', a, b, c, k);
  return {
    skill: 'eval-quadratic',
    prompt: `Evaluate f(${n(k)}).`,
    math: `f(x) = ${rule}`,
    answer: numberAnswer(total),
    inputKind: 'number',
    hints: [`Replace every x with (${n(k)}), in parentheses.`, `Do the exponent first: (${n(k)})² = ${k * k}.`],
    solution: steps,
    reteach: RETEACH_SUB,
    diagnose: (raw, v) => {
      if (k < 0 && matches(v, -A + B + c) && A !== 0)
        return `It looks like (${n(k)})² turned into ${n(-k * k)}. A negative times a negative is positive: (${n(k)})² = +${k * k}.`;
      if (b && matches(v, A - B + c)) return `Check the middle term: ${n(b)} times ${n(k)} is ${n(B)}.`;
      return null;
    },
  };
}

function genEvalOther() {
  const kind = pick(['abs', 'sqrt', 'rational']);
  if (kind === 'abs') {
    const m = randNonZero(-4, 4);
    const b = randInt(-9, 9);
    const c = randInt(-5, 5);
    const k = randInt(-5, 5);
    const inside = m * k + b;
    const total = Math.abs(inside) + c;
    const rule = `|${poly([[m, 1], [b, 0]])}|${c ? ' ' + signed(c) : ''}`;
    return {
      skill: 'eval-other',
      prompt: `Evaluate g(${n(k)}).`,
      math: `g(x) = ${rule}`,
      answer: numberAnswer(total),
      inputKind: 'number',
      hints: ['Substitute, then work inside the absolute value bars first.', 'Absolute value turns the inside into its distance from 0 (never negative).'],
      solution: [
        `g(${n(k)}) = |${lead(m)}${pp(k)}${b ? ' ' + signed(b) : ''}|${c ? ' ' + signed(c) : ''}`,
        `Inside the bars: ${n(m * k)}${b ? ' ' + signed(b) : ''} = ${n(inside)}`,
        `|${n(inside)}| = ${Math.abs(inside)}`,
        c ? `${Math.abs(inside)} ${signed(c)} = ${n(total)}` : `So g(${n(k)}) = ${n(total)}`,
      ],
      reteach: RETEACH_SUB,
      diagnose: (raw, v) =>
        inside < 0 && matches(v, inside + c) ? 'The absolute value bars make the inside positive before you add anything outside.' : null,
    };
  }
  if (kind === 'sqrt') {
    const h = randInt(-6, 6);
    const c = randInt(-5, 5);
    const root = randInt(1, 6);
    const k = root * root - h;
    const total = root + c;
    const inner = poly([[1, 1], [h, 0]]);
    return {
      skill: 'eval-other',
      prompt: `Evaluate h(${n(k)}).`,
      math: `h(x) = √(${inner})${c ? ' ' + signed(c) : ''}`,
      answer: numberAnswer(total),
      inputKind: 'number',
      hints: ['Substitute, then simplify under the square root first.', 'Then take the square root and finish the arithmetic.'],
      solution: [
        `h(${n(k)}) = √(${n(k)}${h ? ' ' + signed(h) : ''})${c ? ' ' + signed(c) : ''}`,
        `Under the root: ${n(k)}${h ? ' ' + signed(h) : ''} = ${root * root}`,
        `√${root * root} = ${root}`,
        c ? `${root} ${signed(c)} = ${n(total)}` : `So h(${n(k)}) = ${n(total)}`,
      ],
      reteach: RETEACH_SUB,
    };
  }
  // rational: (x + a) / (x + b)
  let a;
  let b;
  let k;
  do {
    a = randInt(-6, 6);
    b = randInt(-6, 6);
    k = randInt(-5, 5);
  } while (a === b || k + b === 0);
  const f = frac(k + a, k + b);
  return {
    skill: 'eval-other',
    prompt: `Evaluate r(${n(k)}). Give an exact answer (a fraction is fine, like 3/4).`,
    math: `r(x) = (${poly([[1, 1], [a, 0]])}) / (${poly([[1, 1], [b, 0]])})`,
    answer: fracAnswer(k + a, k + b),
    inputKind: 'number',
    hints: ['Substitute into the top and the bottom separately.', 'Simplify each, then reduce the fraction.'],
    solution: [
      `Top: ${n(k)}${a ? ' ' + signed(a) : ''} = ${n(k + a)}`,
      `Bottom: ${n(k)}${b ? ' ' + signed(b) : ''} = ${n(k + b)}`,
      `r(${n(k)}) = ${n(k + a)}/${n(k + b)} = ${fracText(f)}`,
    ],
    reteach: RETEACH_SUB,
    diagnose: (raw, v) => (k + a !== 0 && matches(v, (k + b) / (k + a)) && !matches(v, (k + a) / (k + b)) ? 'Your fraction is upside down. The top of r(x) stays on top.' : null),
  };
}

function genCombine() {
  // f linear, g quadratic
  const m = randNonZero(-4, 4);
  const b = randInt(-6, 6);
  const c = randInt(-6, 6);
  const f = (x) => m * x + b;
  const g = (x) => x * x + c;
  const fRule = poly([[m, 1], [b, 0]]);
  const gRule = poly([[1, 2], [c, 0]]);
  const kind = pick(['sum', 'scaled', 'fog', 'gof']);
  const r = randInt(-3, 3);
  const s = randInt(-3, 3);
  let expr;
  let value;
  let steps;
  if (kind === 'sum') {
    expr = `f(${n(r)}) + g(${n(s)})`;
    value = f(r) + g(s);
    steps = [
      `Find each piece on its own first.`,
      `f(${n(r)}) = ${lead(m)}${pp(r)}${b ? ' ' + signed(b) : ''} = ${n(f(r))}`,
      `g(${n(s)}) = ${pp(s)}²${c ? ' ' + signed(c) : ''} = ${n(g(s))}`,
      `Add: ${n(f(r))} + ${p(g(s))} = ${n(value)}`,
    ];
  } else if (kind === 'scaled') {
    const kf = pick([2, 3, -2]);
    expr = `${n(kf)}·f(${n(r)}) − g(${n(s)})`;
    value = kf * f(r) - g(s);
    steps = [
      `Find each piece on its own first.`,
      `f(${n(r)}) = ${n(f(r))}, so ${n(kf)}·f(${n(r)}) = ${n(kf)}·${p(f(r))} = ${n(kf * f(r))}`,
      `g(${n(s)}) = ${pp(s)}²${c ? ' ' + signed(c) : ''} = ${n(g(s))}`,
      `Subtract: ${n(kf * f(r))} − ${p(g(s))} = ${n(value)}`,
    ];
  } else if (kind === 'fog') {
    expr = `f(g(${n(r)}))`;
    const inner = g(r);
    value = f(inner);
    steps = [
      'Work from the inside out. Find g first, then feed that answer into f.',
      `g(${n(r)}) = ${pp(r)}²${c ? ' ' + signed(c) : ''} = ${n(inner)}`,
      `f(${n(inner)}) = ${lead(m)}${pp(inner)}${b ? ' ' + signed(b) : ''} = ${n(value)}`,
    ];
  } else {
    expr = `g(f(${n(r)}))`;
    const inner = f(r);
    value = g(inner);
    steps = [
      'Work from the inside out. Find f first, then feed that answer into g.',
      `f(${n(r)}) = ${lead(m)}${pp(r)}${b ? ' ' + signed(b) : ''} = ${n(inner)}`,
      `g(${n(inner)}) = ${pp(inner)}²${c ? ' ' + signed(c) : ''} = ${n(value)}`,
    ];
  }
  const composite = kind === 'fog' || kind === 'gof';
  return {
    skill: 'combine',
    prompt: `Find ${expr}.`,
    math: `f(x) = ${fRule}     g(x) = ${gRule}`,
    answer: numberAnswer(value),
    inputKind: 'number',
    hints: composite
      ? ['Start with the function on the inside.', 'Its output becomes the input of the outside function.']
      : ['Evaluate each function separately.', 'Then combine the two numbers.'],
    solution: steps,
    reteach: {
      title: composite ? 'Composition: inside out' : 'Combining function values',
      text: composite
        ? [
            'f(g(2)) means "do g to 2, then do f to that result."',
            'Always start in the innermost parentheses. The output of the inside function is the input of the outside one.',
            'f(g(2)) and g(f(2)) are usually different, so read the order carefully.',
          ]
        : [
            'Each function value is just a number. f(2) is one number and g(−1) is another.',
            'Find each one by substitution, then add, subtract, or multiply the numbers like normal.',
            '3·f(2) means three times the output f(2), not f(6).',
          ],
    },
    diagnose: (raw, v) => {
      if (kind === 'fog' && matches(v, g(f(r))) && g(f(r)) !== value) return 'You did f first. In f(g(x)), g is on the inside, so g goes first.';
      if (kind === 'gof' && matches(v, f(g(r))) && f(g(r)) !== value) return 'You did g first. In g(f(x)), f is on the inside, so f goes first.';
      return null;
    },
  };
}

function genSolveInput() {
  const m = randNonZero(-5, 5);
  const b = randInt(-9, 9);
  const x0 = randInt(-6, 6);
  const v = m * x0 + b;
  const rule = poly([[m, 1], [b, 0]]);
  return {
    skill: 'solve-input',
    prompt: `Find the value of x that makes f(x) = ${n(v)}.`,
    math: `f(x) = ${rule}`,
    answer: numberAnswer(x0),
    inputKind: 'number',
    hints: [`Here ${n(v)} is the OUTPUT. Set the rule equal to it: ${rule} = ${n(v)}.`, 'Solve for x: undo the adding, then undo the multiplying.'],
    solution: [
      `f(x) = ${n(v)} means the output is ${n(v)}. So set the rule equal to ${n(v)}:`,
      `${rule} = ${n(v)}`,
      b ? `${b > 0 ? 'Subtract' : 'Add'} ${Math.abs(b)} on both sides: ${poly([[m, 1]])} = ${n(v - b)}` : `${poly([[m, 1]])} = ${n(v)}`,
      ...(m !== 1 ? [`Divide both sides by ${n(m)}: x = ${n(x0)}`] : []),
      `Check: f(${n(x0)}) = ${lead(m)}${pp(x0)}${b ? ' ' + signed(b) : ''} = ${n(v)} ✓`,
    ],
    reteach: {
      title: 'f(x) = 7 is not the same as f(7)',
      text: [
        'f(7) means the INPUT is 7. You substitute 7 for x and calculate.',
        'f(x) = 7 means the OUTPUT is 7. You set the rule equal to 7 and solve for x.',
        'Ask yourself: is the number inside the parentheses (input), or after the equals sign (output)?',
      ],
    },
    diagnose: (raw, val) =>
      matches(val, m * v + b) && m * v + b !== x0
        ? `You found f(${n(v)}), which treats ${n(v)} as the input. Here ${n(v)} is the output, so set ${rule} = ${n(v)} and solve.`
        : null,
  };
}

function genFromGraph() {
  const g = randomSegmentGraph();
  const candidates = g.vertices.filter(([x]) => g.inDomain(x));
  const [k, y] = pick(candidates);
  const flipped = g.vertices.find(([x, yy]) => yy === k && x !== y && g.inDomain(x));
  return {
    skill: 'from-graph',
    prompt: `Use the graph of y = f(x) to find f(${n(k)}).`,
    visual: segmentGraphVisual(g),
    answer: numberAnswer(y),
    inputKind: 'number',
    hints: [`f(${n(k)}) means x = ${n(k)}. Find ${n(k)} on the x-axis.`, 'Move straight up or down to the graph. How high is it there?'],
    solution: [
      `f(${n(k)}) asks: when x = ${n(k)}, what is y?`,
      y === 0
        ? `Go to x = ${n(k)} on the x-axis. The graph is right there on the axis, at the point ${point(k, y)}.`
        : `Go to x = ${n(k)} on the x-axis and move ${y > 0 ? 'up' : 'down'} to the graph. It's at the point ${point(k, y)}.`,
      `So f(${n(k)}) = ${n(y)}.`,
    ],
    reteach: {
      title: 'Evaluating from a graph',
      text: [
        'Every point on the graph of f is (x, f(x)). The input is across, the output is up or down.',
        'To find f(3): start at 3 on the x-axis, move vertically until you hit the graph, then read the y-value.',
      ],
      visual: segmentGraphVisual(g, { dots: [{ x: k, y, label: point(k, y), tone: 'accent' }], vLines: [{ x: k, tone: 'good' }] }),
    },
    diagnose: (raw, v) =>
      flipped && matches(v, flipped[0])
        ? `You found where y = ${n(k)}. f(${n(k)}) means x = ${n(k)}, so start on the x-axis.`
        : null,
  };
}

function genFromTable() {
  const m = randNonZero(-3, 3);
  const c = randInt(-4, 4);
  const xs = sample(range(-3, 4), 5).sort((a, b) => a - b);
  const quad = Math.random() < 0.5;
  const rule = quad ? (x) => x * x + m * x + c : (x) => m * x + c;
  const rows = xs.map((x) => [x, rule(x)]);
  const [a, b] = sample(xs, 2);
  const kind = pick(['diff', 'scaled', 'compose']);
  let expr;
  let value;
  let steps;
  const fa = rule(a);
  const fb = rule(b);
  const composable = xs.includes(fa);
  if (kind === 'compose' && composable) {
    expr = `f(f(${n(a)}))`;
    value = rule(fa);
    steps = [`From the table, f(${n(a)}) = ${n(fa)}.`, `Now find f(${n(fa)}) in the table: ${n(value)}.`, `So f(f(${n(a)})) = ${n(value)}.`];
  } else if (kind === 'scaled') {
    expr = `3·f(${n(a)})`;
    value = 3 * fa;
    steps = [`From the table, f(${n(a)}) = ${n(fa)}.`, `3·f(${n(a)}) = 3·${p(fa)} = ${n(value)}.`];
  } else {
    expr = `f(${n(a)}) − f(${n(b)})`;
    value = fa - fb;
    steps = [`From the table, f(${n(a)}) = ${n(fa)} and f(${n(b)}) = ${n(fb)}.`, `${n(fa)} − ${p(fb)} = ${n(value)}.`];
  }
  return {
    skill: 'from-table',
    prompt: `Use the table to find ${expr}.`,
    visual: { type: 'table', headers: ['x', 'f(x)'], rows },
    answer: numberAnswer(value),
    inputKind: 'number',
    hints: ['Find the input in the x column. The number next to it is the output.', 'Get each function value first, then do the arithmetic.'],
    solution: steps,
    reteach: {
      title: 'Evaluating from a table',
      text: [
        'Each row of the table is one input and its output: f(x) is in the same row as x.',
        'To find f(2), look for 2 in the x column and read across.',
        'For f(f(2)), use the output you just found as the next input.',
      ],
    },
  };
}

// ---------- topic ----------

export default {
  id: 'function-notation',
  title: 'Evaluating functions',
  summary: 'Use function notation and direct substitution to evaluate functions from rules, graphs, and tables.',
  skills: [
    { id: 'eval-quadratic', name: 'Substitution (polynomials)', generate: genEvalQuadratic },
    { id: 'eval-other', name: 'Substitution (other functions)', generate: genEvalOther },
    { id: 'from-graph', name: 'Reading f(x) from a graph', generate: genFromGraph },
    { id: 'from-table', name: 'Reading f(x) from a table', generate: genFromTable },
    { id: 'solve-input', name: 'Solving f(x) = a number', generate: genSolveInput },
    { id: 'combine', name: 'Combining and composing', generate: genCombine },
  ],
  lesson: [
    {
      title: 'What f(x) means',
      body: [
        '**f(x)** is read "f of x." f is the name of the function and x is the input. It does **not** mean f times x.',
        'f(x) is also the output. On a graph, f(x) is just y.',
        'So f(3) = 10 says: "when the input is 3, the output is 10," which is the point (3, 10).',
      ],
      practice: 'from-table',
    },
    {
      title: 'Direct substitution',
      body: [
        'To evaluate, replace **every** x with the input, **wrapped in parentheses**, and simplify with order of operations.',
        'The parentheses matter most with negatives: (−3)² = 9, but −3² = −9.',
      ],
      example: {
        prompt: 'f(x) = 2x² − 5x + 1. Find f(−3).',
        steps: ['f(−3) = 2(−3)² − 5(−3) + 1', '= 2(9) + 15 + 1', '= 18 + 15 + 1', '= 34'],
      },
      practice: 'eval-quadratic',
    },
    {
      title: 'Reading function values from a graph',
      body: [
        'To find f(4) on a graph: start at 4 on the x-axis, go straight up or down to the graph, and read the y-value.',
        'Don\'t mix it up: f(4) uses 4 as the **x**, not the y.',
      ],
      practice: 'from-graph',
    },
    {
      title: 'f(x) = 7 versus f(7)',
      body: [
        '**f(7)**: the input is 7. Substitute and calculate.',
        '**f(x) = 7**: the output is 7. Set the rule equal to 7 and solve for x.',
      ],
      example: {
        prompt: 'f(x) = 3x − 2. Find x when f(x) = 7.',
        steps: ['3x − 2 = 7', '3x = 9', 'x = 3', 'Check: f(3) = 3(3) − 2 = 7 ✓'],
      },
      practice: 'solve-input',
    },
    {
      title: 'Combining and composing',
      body: [
        'f(2) + g(1): find each value separately, then add the numbers.',
        '**f(g(2))**: work inside out. Find g(2) first, then plug that result into f.',
      ],
      example: {
        prompt: 'f(x) = x + 4 and g(x) = x². Find f(g(3)).',
        steps: ['Inside first: g(3) = 3² = 9', 'Then f(9) = 9 + 4 = 13', 'f(g(3)) = 13'],
      },
      practice: 'combine',
    },
  ],
};
