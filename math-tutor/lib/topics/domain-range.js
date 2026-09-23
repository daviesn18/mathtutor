import { randInt, randNonZero, pick, sample, range as irange } from '../math/random.js';
import { n, p, pp, poly, signed, frac, fracText, point, pointList, intervals, openIv } from '../math/format.js';
import { intervalsSameEnds, pointsEqual } from '../math/parse.js';
import { randomSegmentGraph, segmentGraphVisual, randomSmoothGraph, smoothGraphVisual } from '../math/curves.js';
import { intervalAnswer, pointsAnswer, fracAnswer, intervalBracketFeedback, matches } from './shared.js';

const INTERVAL_HELP = 'Use interval notation, like [−3, 5). Type "inf" for ∞ and "U" for ∪.';

const bracketWord = (closed) => (closed ? 'a filled dot, so it is included: use a bracket' : 'an open dot, so it is NOT included: use a parenthesis');

// ---------- domain & range from graphs ----------

function genDomainGraph() {
  if (Math.random() < 0.25) {
    const g = randomSmoothGraph();
    return {
      skill: 'domain-graph',
      prompt: 'What is the domain of the function?',
      visual: smoothGraphVisual(g),
      answer: intervalAnswer(g.domain),
      inputKind: 'interval',
      inputHelp: INTERVAL_HELP,
      hints: ['Domain = all the x-values the graph uses. Look left to right.', 'The arrows mean the graph keeps going forever in that direction.'],
      solution: [
        'Domain is about x-values: how far left and right does the graph go?',
        'Both ends have arrows, so the graph keeps going left and right forever. Every x-value gets used.',
        'Domain: (−∞, ∞), which is all real numbers.',
      ],
      reteach: RETEACH_DOMAIN,
    };
  }
  const g = randomSegmentGraph();
  const d = g.domain[0];
  return {
    skill: 'domain-graph',
    prompt: 'What is the domain of the function?',
    visual: segmentGraphVisual(g),
    answer: intervalAnswer(g.domain),
    inputKind: 'interval',
    inputHelp: INTERVAL_HELP,
    hints: ['Domain = all the x-values the graph uses. Read left to right.', 'Check each endpoint: is the dot filled in (included) or open (not included)?'],
    solution: [
      'Domain is about x-values: how far left and right does the graph go?',
      `Leftmost point: x = ${n(d.lo)}. It's ${bracketWord(d.loClosed)}.`,
      `Rightmost point: x = ${n(d.hi)}. It's ${bracketWord(d.hiClosed)}.`,
      `Domain: ${intervals(g.domain)}`,
    ],
    reteach: { ...RETEACH_DOMAIN, visual: segmentGraphVisual(g, { highlights: [{ lo: d.lo, hi: d.hi, tone: 'good' }] }) },
    diagnose: (raw, v) => {
      if (!v) return null;
      if (intervalsSameEnds(v, g.range)) return 'That looks like the range (the y-values). Domain uses x-values: read left to right.';
      return intervalBracketFeedback(v, g.domain, 'Filled dot = included = [ ]. Open dot = not included = ( ).');
    },
  };
}

const RETEACH_DOMAIN = {
  title: 'Domain: read left to right',
  text: [
    'The domain is every x-value the graph uses. Squash the graph flat onto the x-axis and see what it covers.',
    'Start at the leftmost point and end at the rightmost point.',
    'Filled dot: that x is included, use [ ]. Open dot: not included, use ( ). Arrow: it goes on forever, use ∞ with ( ).',
  ],
};

const RETEACH_RANGE = {
  title: 'Range: read bottom to top',
  text: [
    'The range is every y-value the graph reaches. Squash the graph sideways onto the y-axis and see what it covers.',
    'Find the lowest point and the highest point. They are often NOT the endpoints.',
    'A value is included if the graph actually touches it at a filled dot or anywhere in the middle. If the only place it reaches that height is an open dot, use ( ).',
    'If an arrow heads up or down forever, use ∞ or −∞.',
  ],
};

function genRangeGraph() {
  if (Math.random() < 0.35) {
    const g = randomSmoothGraph();
    const r = g.range[0];
    let reason;
    if (r.lo === -Infinity && r.hi === Infinity) reason = 'One end heads down forever and the other heads up forever, so every y-value gets used.';
    else if (r.lo === -Infinity) reason = `Both ends head down forever. The highest the graph ever gets is its tallest peak, y = ${n(r.hi)}, which it touches.`;
    else reason = `Both ends head up forever. The lowest the graph ever gets is its deepest valley, y = ${n(r.lo)}, which it touches.`;
    return {
      skill: 'range-graph',
      prompt: 'What is the range of the function?',
      visual: smoothGraphVisual(g),
      answer: intervalAnswer(g.range),
      inputKind: 'interval',
      inputHelp: INTERVAL_HELP,
      hints: ['Range = all the y-values the graph reaches. Read bottom to top.', 'Follow the arrows. Do they go up forever, down forever, or one of each?'],
      solution: ['Range is about y-values: how low and how high does the graph go?', reason, `Range: ${intervals(g.range)}`],
      reteach: RETEACH_RANGE,
      diagnose: (raw, v) => (v ? intervalBracketFeedback(v, g.range, 'The graph actually touches its highest peak (or lowest valley), so that value gets a bracket.') : null),
    };
  }
  const g = randomSegmentGraph();
  const r = g.range[0];
  return {
    skill: 'range-graph',
    prompt: 'What is the range of the function?',
    visual: segmentGraphVisual(g),
    answer: intervalAnswer(g.range),
    inputKind: 'interval',
    inputHelp: INTERVAL_HELP,
    hints: ['Range = all the y-values the graph reaches. Read bottom to top.', 'Find the lowest point and the highest point anywhere on the graph, not just the ends.'],
    solution: [
      'Range is about y-values: how low and how high does the graph go?',
      `Lowest y-value: ${n(r.lo)}. ${r.loClosed ? 'The graph touches it, so use [.' : 'It only reaches that height at an open dot, so use (.'}`,
      `Highest y-value: ${n(r.hi)}. ${r.hiClosed ? 'The graph touches it, so use ].' : 'It only reaches that height at an open dot, so use ).'}`,
      `Range: ${intervals(g.range)}`,
    ],
    reteach: {
      ...RETEACH_RANGE,
      visual: segmentGraphVisual(g, { hLines: [{ y: r.lo, tone: 'good' }, { y: r.hi, tone: 'good' }] }),
      caption: 'The two dashed lines mark the lowest and highest y-values.',
    },
    diagnose: (raw, v) => {
      if (!v) return null;
      if (intervalsSameEnds(v, g.domain)) return 'That looks like the domain (the x-values). Range uses y-values: read bottom to top.';
      const ends = [g.vertices[0][1], g.vertices[g.vertices.length - 1][1]].sort((a, b) => a - b);
      if (v.length === 1 && v[0].lo === ends[0] && v[0].hi === ends[1] && (ends[0] !== r.lo || ends[1] !== r.hi))
        return 'You used the y-values of the endpoints. The lowest and highest points can be in the middle of the graph.';
      return intervalBracketFeedback(v, g.range, 'A value is included [ ] if the graph touches it anywhere. Use ( ) only if it is reached just at an open dot.');
    },
  };
}

// ---------- domain from equations ----------

function genDomainEquation() {
  const kind = pick(['sqrt', 'sqrtNeg', 'sqrtScaled', 'recip', 'twoHoles', 'poly']);
  let rule;
  let dom;
  let steps;
  if (kind === 'sqrt') {
    const a = randNonZero(-8, 8);
    rule = `f(x) = √(${poly([[1, 1], [-a, 0]])})`;
    dom = [{ lo: a, hi: Infinity, loClosed: true, hiClosed: false }];
    steps = [`You can't take the square root of a negative, so the inside must be ≥ 0.`, `${poly([[1, 1], [-a, 0]])} ≥ 0`, `x ≥ ${n(a)}`];
  } else if (kind === 'sqrtNeg') {
    const a = randNonZero(-8, 8);
    rule = `f(x) = √(${n(a)} − x)`;
    dom = [{ lo: -Infinity, hi: a, loClosed: false, hiClosed: true }];
    steps = [`The inside must be ≥ 0.`, `${n(a)} − x ≥ 0`, `${n(a)} ≥ x, so x ≤ ${n(a)}`];
  } else if (kind === 'sqrtScaled') {
    const k = pick([2, 3, 4]);
    const a = randNonZero(-5, 5);
    rule = `f(x) = √(${poly([[k, 1], [-k * a, 0]])})`;
    dom = [{ lo: a, hi: Infinity, loClosed: true, hiClosed: false }];
    steps = [`The inside must be ≥ 0.`, `${poly([[k, 1], [-k * a, 0]])} ≥ 0`, `${k}x ≥ ${n(k * a)}`, `x ≥ ${n(a)}`];
  } else if (kind === 'recip') {
    const a = randNonZero(-8, 8);
    const top = randNonZero(1, 9);
    rule = `f(x) = ${top} / (${poly([[1, 1], [-a, 0]])})`;
    dom = [openIv(-Infinity, a), openIv(a, Infinity)];
    steps = [`You can't divide by zero, so the bottom can't be 0.`, `${poly([[1, 1], [-a, 0]])} = 0 when x = ${n(a)}.`, `Every x except ${n(a)} works.`];
  } else if (kind === 'twoHoles') {
    const r = randInt(1, 6);
    const shift = randInt(-5, 5);
    rule = `f(x) = (${poly([[1, 1], [shift, 0]])}) / (x² − ${r * r})`;
    dom = [openIv(-Infinity, -r), openIv(-r, r), openIv(r, Infinity)];
    steps = [
      `The bottom can't be 0.`,
      `x² − ${r * r} = 0 → x² = ${r * r} → x = ${r} or x = −${r}.`,
      `Every x except −${r} and ${r} works, which splits the number line into three pieces.`,
    ];
  } else {
    const a = randNonZero(-4, 4);
    const b = randInt(-6, 6);
    const c = randInt(-6, 6);
    rule = `f(x) = ${poly([[a, 2], [b, 1], [c, 0]])}`;
    dom = [openIv(-Infinity, Infinity)];
    steps = ['There is no square root and no division by x, so nothing can go wrong.', 'You can plug in any real number.'];
  }
  return {
    skill: 'domain-equation',
    prompt: 'What is the domain of the function? Write it in interval notation.',
    math: rule,
    answer: intervalAnswer(dom),
    inputKind: 'interval',
    inputHelp: INTERVAL_HELP,
    hints: ['Ask: which x-values would break this? Look for a square root (can\'t be negative inside) or a fraction (bottom can\'t be 0).', 'Find the x-values that cause trouble, then write every x except those.'],
    solution: [...steps, `Domain: ${intervals(dom)}`],
    reteach: {
      title: 'Domain from an equation: what would break it?',
      text: [
        'Start by assuming every real number works: (−∞, ∞). Then look for things that break.',
        'Square root: the inside must be ≥ 0. Solve that inequality. The boundary number IS allowed, so use [ ].',
        'Fraction: the bottom can\'t be 0. Solve bottom = 0 and throw those x-values out with ( ). Use ∪ to join the pieces.',
        'Polynomials (no roots, no fractions) have domain (−∞, ∞).',
      ],
    },
    diagnose: (raw, v) =>
      v ? intervalBracketFeedback(v, dom, kind.startsWith('sqrt') ? '√0 = 0 is fine, so the boundary is included: use a bracket there.' : 'Dividing by 0 is not allowed, so those x-values are excluded: use parentheses.') : null,
  };
}

// ---------- intercepts ----------

function genInterceptsGraph() {
  const g = randomSegmentGraph();
  const wantX = Math.random() < 0.55;
  const ans = wantX ? g.xIntercepts : g.yIntercept;
  return {
    skill: 'intercepts',
    prompt: wantX
      ? 'List all x-intercepts of the function as points. Type "none" if there are none.'
      : 'What is the y-intercept of the function? Write it as a point, or type "none".',
    visual: segmentGraphVisual(g),
    answer: pointsAnswer(ans),
    inputKind: 'points',
    hints: wantX
      ? ['x-intercepts are where the graph crosses or touches the x-axis.', 'At every x-intercept, y = 0, so each point looks like (x, 0).']
      : ['The y-intercept is where the graph crosses the y-axis.', 'At the y-intercept, x = 0, so the point looks like (0, y).'],
    solution: wantX
      ? ans.length
        ? ['Look for every place the graph meets the x-axis (the horizontal axis).', `It meets it at ${pointList(ans)}.`, 'Each x-intercept has y = 0.']
        : ['Look for places the graph meets the x-axis.', 'It never does (open dots don\'t count, since those points aren\'t on the graph). So: none.']
      : ans.length
        ? ['Look for where the graph crosses the y-axis (the vertical axis).', `It crosses at ${point(ans[0][0], ans[0][1])}.`, 'The y-intercept always has x = 0.']
        : ['Look for where the graph crosses the y-axis.', 'The graph doesn\'t reach x = 0 (or only reaches it at an open dot), so there is no y-intercept.'],
    reteach: {
      title: 'Intercepts',
      text: [
        'An x-intercept is where the graph hits the x-axis. There, y = 0: points look like (5, 0).',
        'The y-intercept is where the graph hits the y-axis. There, x = 0: the point looks like (0, 3).',
        'A function can have many x-intercepts but at most one y-intercept.',
        'An open dot is a point the graph does NOT include, so it can\'t be an intercept.',
      ],
      visual: segmentGraphVisual(g, { dots: ans.map(([x, y]) => ({ x, y, label: point(x, y), tone: 'accent' })) }),
    },
    diagnose: (raw, v) => {
      if (!v || !v.length) return null;
      if (pointsEqual(v.map(([x, y]) => [y, x]), ans)) return 'Flip your coordinates: points are (x, y). An x-intercept has 0 in the second spot; the y-intercept has 0 in the first spot.';
      if (wantX && g.yIntercept.length && pointsEqual(v, g.yIntercept)) return 'That point is on the y-axis. x-intercepts are on the horizontal x-axis.';
      if (!wantX && g.xIntercepts.length && pointsEqual(v, g.xIntercepts)) return 'Those are on the x-axis. The y-intercept is on the vertical y-axis.';
      return null;
    },
  };
}

function genInterceptsEquation() {
  const kind = pick(['quadX', 'quadY', 'linX', 'linY']);
  if (kind === 'quadX' || kind === 'quadY') {
    let r1;
    let r2;
    do {
      r1 = randInt(-7, 7);
      r2 = randInt(-7, 7);
    } while (r1 === r2 || r1 === 0 || r2 === 0);
    const rule = `f(x) = (${poly([[1, 1], [-r1, 0]])})(${poly([[1, 1], [-r2, 0]])})`;
    if (kind === 'quadX') {
      const ans = [[r1, 0], [r2, 0]];
      return {
        skill: 'intercepts-equation',
        prompt: 'Find all x-intercepts. Write them as points.',
        math: rule,
        answer: pointsAnswer(ans),
        inputKind: 'points',
        hints: ['At an x-intercept, f(x) = 0. Set the rule equal to 0.', 'A product is 0 when either factor is 0. Solve each factor = 0.'],
        solution: [
          'x-intercepts happen where y = f(x) = 0.',
          `${rule.replace('f(x) = ', '')} = 0`,
          `${poly([[1, 1], [-r1, 0]])} = 0 → x = ${n(r1)}     or     ${poly([[1, 1], [-r2, 0]])} = 0 → x = ${n(r2)}`,
          `x-intercepts: ${pointList(ans)}`,
        ],
        reteach: RETEACH_INT_EQ,
        diagnose: (raw, v) => (v && pointsEqual(v, [[-r1, 0], [-r2, 0]]) ? 'Check the signs. (x − 3) = 0 when x = +3, not −3.' : null),
      };
    }
    const ans = [[0, r1 * r2]];
    return {
      skill: 'intercepts-equation',
      prompt: 'Find the y-intercept. Write it as a point.',
      math: rule,
      answer: pointsAnswer(ans),
      inputKind: 'points',
      hints: ['At the y-intercept, x = 0. Find f(0).', 'Replace each x with 0 and multiply.'],
      solution: [
        'The y-intercept is where x = 0, so find f(0).',
        `f(0) = (0 ${signed(-r1)})(0 ${signed(-r2)}) = ${p(-r1)}${pp(-r2)} = ${n(r1 * r2)}`,
        `y-intercept: ${point(0, r1 * r2)}`,
      ],
      reteach: RETEACH_INT_EQ,
    };
  }
  const m = randNonZero(-5, 5);
  const r = randInt(-6, 6);
  const b = -m * r;
  const rule = `f(x) = ${poly([[m, 1], [b, 0]])}`;
  if (kind === 'linX') {
    return {
      skill: 'intercepts-equation',
      prompt: 'Find the x-intercept. Write it as a point.',
      math: rule,
      answer: pointsAnswer([[r, 0]]),
      inputKind: 'points',
      hints: ['At the x-intercept, f(x) = 0. Set the rule equal to 0.', 'Solve for x.'],
      solution: [
        'Set f(x) = 0.',
        `${poly([[m, 1], [b, 0]])} = 0`,
        b ? `${poly([[m, 1]])} = ${n(-b)}` : `${poly([[m, 1]])} = 0`,
        `x = ${n(r)}`,
        `x-intercept: ${point(r, 0)}`,
      ],
      reteach: RETEACH_INT_EQ,
      diagnose: (raw, v) => (v && b && pointsEqual(v, [[0, b]]) ? 'That\'s the y-intercept. For the x-intercept, set y = 0 and solve for x.' : null),
    };
  }
  return {
    skill: 'intercepts-equation',
    prompt: 'Find the y-intercept. Write it as a point.',
    math: rule,
    answer: pointsAnswer([[0, b]]),
    inputKind: 'points',
    hints: ['At the y-intercept, x = 0.', 'Find f(0).'],
    solution: ['Find f(0).', `f(0) = ${lead(m)}(0)${b ? ' ' + signed(b) : ''} = ${n(b)}`, `y-intercept: ${point(0, b)}`],
    reteach: RETEACH_INT_EQ,
  };
}

const lead = (a) => (a === 1 ? '' : a === -1 ? '−' : n(a));

const RETEACH_INT_EQ = {
  title: 'Intercepts from an equation',
  text: [
    'y-intercept: plug in x = 0 and find f(0). Answer as (0, f(0)).',
    'x-intercepts: set f(x) = 0 and solve for x. Answer as (x, 0).',
    'For a factored rule like (x − 2)(x + 5) = 0, each factor can be 0: x = 2 or x = −5. The sign flips!',
  ],
};

// ---------- average rate of change ----------

const RETEACH_ARC = {
  title: 'Average rate of change = slope between two points',
  text: [
    'Average rate of change from x = a to x = b is the slope of the straight line connecting those two points on the graph.',
    'Formula: (f(b) − f(a)) / (b − a). Change in y on top, change in x on the bottom.',
    'Steps: find f(a) and f(b), subtract outputs, subtract inputs in the same order, divide, simplify.',
    'A positive answer means the function went up overall; negative means it went down.',
  ],
};

function arcDiagnose(fa, fb, a, b) {
  return (raw, v) => {
    const dy = fb - fa;
    const dx = b - a;
    if (dy !== 0 && matches(v, dx / dy) && dx / dy !== dy / dx) return 'Your fraction is upside down. Change in y (outputs) goes on top: (f(b) − f(a)) / (b − a).';
    if (dx !== 1 && matches(v, dy)) return `That's the change in y. You still need to divide by the change in x, which is ${n(dx)}.`;
    if (dy !== 0 && matches(v, -dy / dx)) return 'The sign is flipped. Subtract in the same order on top and bottom: f(b) − f(a) over b − a.';
    return null;
  };
}

function arcSteps(fa, fb, a, b, name = 'f') {
  const f = frac(fb - fa, b - a);
  return [
    `${name}(${n(a)}) = ${n(fa)} and ${name}(${n(b)}) = ${n(fb)}.`,
    `Average rate of change = (${name}(${n(b)}) − ${name}(${n(a)})) / (${n(b)} − ${p(a)})`,
    `= (${n(fb)} − ${p(fa)}) / (${n(b)} − ${p(a)}) = ${n(fb - fa)} / ${n(b - a)}`,
    `= ${fracText(f)}`,
  ];
}

function genArcEquation() {
  const A = pick([1, 1, 2, -1]);
  const B = randInt(-5, 5);
  const C = randInt(-6, 6);
  const f = (x) => A * x * x + B * x + C;
  let a;
  let b;
  do {
    a = randInt(-4, 3);
    b = randInt(a + 1, 5);
  } while (b - a < 2 && Math.random() < 0.6);
  const fa = f(a);
  const fb = f(b);
  const rule = poly([[A, 2], [B, 1], [C, 0]]);
  return {
    skill: 'arc-equation',
    prompt: `Find the average rate of change of f over the interval [${n(a)}, ${n(b)}].`,
    math: `f(x) = ${rule}`,
    answer: fracAnswer(fb - fa, b - a),
    inputKind: 'number',
    hints: [`First find f(${n(a)}) and f(${n(b)}) by substitution.`, 'Then use (f(b) − f(a)) / (b − a): change in y over change in x.'],
    solution: [`Substitute: f(${n(a)}) = ${n(fa)}, f(${n(b)}) = ${n(fb)}.`, ...arcSteps(fa, fb, a, b).slice(1)],
    reteach: RETEACH_ARC,
    diagnose: arcDiagnose(fa, fb, a, b),
  };
}

function genArcGraph() {
  const g = randomSegmentGraph();
  const xs = g.vertices.map((v) => v[0]).filter((x) => g.inDomain(x));
  if (xs.length < 2) return genArcTable();
  const [a, b] = sample(xs, 2).sort((u, v) => u - v);
  const fa = g.valueAt(a);
  const fb = g.valueAt(b);
  return {
    skill: 'arc-graph',
    prompt: `Use the graph to find the average rate of change of f from x = ${n(a)} to x = ${n(b)}.`,
    visual: segmentGraphVisual(g),
    answer: fracAnswer(fb - fa, b - a),
    inputKind: 'number',
    hints: [`Read the two points off the graph: (${n(a)}, f(${n(a)})) and (${n(b)}, f(${n(b)})).`, 'Then find the slope between them: change in y over change in x.'],
    solution: [`From the graph: ${point(a, fa)} and ${point(b, fb)}.`, ...arcSteps(fa, fb, a, b).slice(1)],
    reteach: {
      ...RETEACH_ARC,
      visual: segmentGraphVisual(g, {
        extraPaths: [{ points: [[a, fa], [b, fb]], tone: 'accent', dashed: true }],
        dots: [{ x: a, y: fa, label: point(a, fa), tone: 'accent' }, { x: b, y: fb, label: point(b, fb), tone: 'accent' }],
      }),
      caption: 'The dashed line connects the two points. Its slope is the average rate of change.',
    },
    diagnose: arcDiagnose(fa, fb, a, b),
  };
}

function genArcTable() {
  const kind = pick(['exp', 'quad']);
  const xs = kind === 'exp' ? [0, 1, 2, 3, 4] : sample(irange(-3, 5), 5).sort((u, v) => u - v);
  const k = pick([1, 2, 3]);
  const c = randInt(-4, 4);
  const f = kind === 'exp' ? (x) => k * 2 ** x : (x) => x * x + c;
  const rows = xs.map((x) => [x, f(x)]);
  const [a, b] = sample(xs, 2).sort((u, v) => u - v);
  const fa = f(a);
  const fb = f(b);
  return {
    skill: 'arc-table',
    prompt: `Use the table to find the average rate of change from x = ${n(a)} to x = ${n(b)}.`,
    visual: { type: 'table', headers: ['x', 'f(x)'], rows },
    answer: fracAnswer(fb - fa, b - a),
    inputKind: 'number',
    hints: ['Find the rows for both x-values in the table.', 'Change in f(x) over change in x.'],
    solution: [`From the table: f(${n(a)}) = ${n(fa)} and f(${n(b)}) = ${n(fb)}.`, ...arcSteps(fa, fb, a, b).slice(1)],
    reteach: RETEACH_ARC,
    diagnose: arcDiagnose(fa, fb, a, b),
  };
}

// ---------- topic ----------

export default {
  id: 'domain-range',
  title: 'Domain, range, intercepts, rate of change',
  summary: 'Find domain and range from graphs and equations, locate intercepts, and calculate average rate of change over an interval.',
  skills: [
    { id: 'domain-graph', name: 'Domain from a graph', generate: genDomainGraph },
    { id: 'range-graph', name: 'Range from a graph', generate: genRangeGraph },
    { id: 'domain-equation', name: 'Domain from an equation', generate: genDomainEquation },
    { id: 'intercepts', name: 'Intercepts from a graph', generate: genInterceptsGraph },
    { id: 'intercepts-equation', name: 'Intercepts from an equation', generate: genInterceptsEquation },
    { id: 'arc-equation', name: 'Rate of change from an equation', generate: genArcEquation },
    { id: 'arc-graph', name: 'Rate of change from a graph', generate: genArcGraph },
    { id: 'arc-table', name: 'Rate of change from a table', generate: genArcTable },
  ],
  lesson: [
    {
      title: 'Domain: the x-values',
      body: [
        'The **domain** is every input (x-value) the function uses. On a graph, read it **left to right**.',
        'Filled dot → included → [ ]. Open dot → not included → ( ). Arrow → keeps going → ∞ with ( ).',
      ],
      example: {
        prompt: 'This graph starts at a filled dot at x = −4 and ends at an open dot at x = 5.',
        visual: {
          type: 'graph',
          win: 7,
          paths: [{ points: [[-4, -2], [-1, 4], [2, 1], [5, 3]] }],
          dots: [{ x: -4, y: -2 }, { x: 5, y: 3, open: true }],
          highlights: [{ lo: -4, hi: 5, tone: 'good' }],
        },
        steps: ['Left end: x = −4, filled, so [−4', 'Right end: x = 5, open, so 5)', 'Domain: [−4, 5)'],
      },
      practice: 'domain-graph',
    },
    {
      title: 'Range: the y-values',
      body: [
        'The **range** is every output (y-value). Read it **bottom to top**.',
        'The lowest and highest points are often in the middle of the graph, not at the ends.',
      ],
      example: {
        prompt: 'Same graph:',
        visual: {
          type: 'graph',
          win: 7,
          paths: [{ points: [[-4, -2], [-1, 4], [2, 1], [5, 3]] }],
          dots: [{ x: -4, y: -2 }, { x: 5, y: 3, open: true }],
          hLines: [{ y: -2, tone: 'good' }, { y: 4, tone: 'good' }],
        },
        steps: ['Lowest: y = −2 at the filled dot, so [−2', 'Highest: y = 4 at the peak (in the middle!), so 4]', 'Range: [−2, 4]'],
      },
      practice: 'range-graph',
    },
    {
      title: 'Domain from an equation',
      body: [
        'Assume every real number works, then look for trouble:',
        '**Square roots**: the inside must be ≥ 0. **Fractions**: the bottom can\'t be 0.',
      ],
      example: {
        prompt: 'f(x) = √(x − 3) and g(x) = 5 / (x + 2)',
        steps: ['f: x − 3 ≥ 0, so x ≥ 3. Domain: [3, ∞)', 'g: x + 2 ≠ 0, so x ≠ −2. Domain: (−∞, −2) ∪ (−2, ∞)'],
      },
      practice: 'domain-equation',
    },
    {
      title: 'Intercepts',
      body: [
        '**x-intercepts**: where the graph hits the x-axis. y = 0 there. Find them by solving f(x) = 0.',
        '**y-intercept**: where the graph hits the y-axis. x = 0 there. Find it by calculating f(0).',
        'Write intercepts as points: (4, 0) and (0, −3).',
      ],
      example: {
        prompt: 'f(x) = (x − 4)(x + 1)',
        steps: ['x-intercepts: x − 4 = 0 or x + 1 = 0 → (4, 0) and (−1, 0)', 'y-intercept: f(0) = (−4)(1) = −4 → (0, −4)'],
      },
      practice: 'intercepts',
    },
    {
      title: 'Average rate of change',
      body: [
        'The **average rate of change** from x = a to x = b is the slope of the line connecting those two points.',
        'Formula: **(f(b) − f(a)) / (b − a)**, change in output over change in input.',
      ],
      example: {
        prompt: 'f(x) = x² + 1 over [1, 3]',
        steps: ['f(1) = 2 and f(3) = 10', '(10 − 2) / (3 − 1) = 8 / 2', '= 4. On average, f goes up 4 for every 1 step right.'],
      },
      practice: 'arc-equation',
    },
  ],
};
