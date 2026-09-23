import { randInt, randNonZero, pick, shuffle, sample, range } from '../math/random.js';
import { n, point, signed, poly } from '../math/format.js';
import { randomSmoothGraph, smoothGraphVisual } from '../math/curves.js';
import { choiceAnswer } from './shared.js';

const W = 8;
const CHOICES = ['Yes, it is a function', 'No, it is not a function'];

// ---------- helpers ----------

function fnPoints(f, lo = -W - 1, hi = W + 1, step = 0.05) {
  const pts = [];
  for (let x = lo; x <= hi + 1e-9; x += step) pts.push([x, f(x)]);
  return pts;
}

function paramPoints(fx, fy, t0, t1, steps = 360) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    pts.push([fx(t), fy(t)]);
  }
  return pts;
}

/** A small relation as ordered pairs. Non-functions reuse one x with a new y. */
function makeRelation(isFunction) {
  const size = randInt(4, 5);
  const xs = sample(range(-6, 9), size);
  const pairs = xs.map((x) => [x, randInt(-5, 9)]);
  let repeatedY = false;
  if (isFunction && Math.random() < 0.6) {
    pairs[1][1] = pairs[0][1]; // same output twice: still a function
    repeatedY = true;
  }
  let dupX = null;
  let dupYs = null;
  if (!isFunction) {
    const i = randInt(0, size - 1);
    let y2;
    do y2 = randInt(-5, 9);
    while (y2 === pairs[i][1]);
    pairs.push([pairs[i][0], y2]);
    dupX = pairs[i][0];
    dupYs = [pairs[i][1], y2];
  }
  return { pairs: shuffle(pairs), dupX, dupYs, repeatedY };
}

function relationSolution(rel, formWord) {
  const inputs = rel.pairs.map(([x]) => n(x)).join(', ');
  if (rel.dupX === null) {
    const steps = [
      `List the inputs (x-values) in the ${formWord}: ${inputs}.`,
      'No input appears more than once, so every input has exactly one output.',
    ];
    if (rel.repeatedY) steps.push('Two inputs share the same output. That is allowed: different inputs can land on the same output.');
    steps.push('It is a function.');
    return steps;
  }
  return [
    `List the inputs (x-values) in the ${formWord}: ${inputs}.`,
    `The input ${n(rel.dupX)} shows up twice, once with output ${n(rel.dupYs[0])} and once with output ${n(rel.dupYs[1])}.`,
    'One input with two different outputs breaks the rule, so it is not a function.',
  ];
}

function relationDiagnose(rel) {
  return (raw) => {
    const saidNot = raw === 1;
    if (rel.dupX === null && saidNot && rel.repeatedY)
      return 'A repeated y-value is fine. The only thing that breaks a function is a repeated x-value paired with different y-values.';
    if (rel.dupX !== null && !saidNot) return `Look more carefully at the x-values. Is any x-value listed twice?`;
    return null;
  };
}

const RETEACH_PAIRS = {
  title: 'The one rule for functions',
  text: [
    'A function gives every input exactly one output. Think of a vending machine: pressing B4 must always give you the same snack.',
    'Two different buttons giving you the same snack is fine (repeated y-values are okay).',
    'One button giving you two different snacks is broken (a repeated x-value with different y-values means NOT a function).',
    'So the check is: scan the x-values only. If an x-value repeats with a different y-value, it is not a function.',
  ],
};

// ---------- generators ----------

function genPairs() {
  const isFunction = Math.random() < 0.5;
  const rel = makeRelation(isFunction);
  return {
    skill: 'pairs',
    prompt: 'Is this relation a function?',
    math: `{ ${rel.pairs.map(([x, y]) => point(x, y)).join(', ')} }`,
    answer: choiceAnswer(CHOICES, isFunction ? 0 : 1),
    hints: [
      'Only the x-values (the first number in each pair) matter for this check.',
      'Does any x-value show up in two different pairs?',
    ],
    solution: relationSolution(rel, 'list'),
    reteach: RETEACH_PAIRS,
    diagnose: relationDiagnose(rel),
  };
}

function genMapping() {
  const isFunction = Math.random() < 0.5;
  const rel = makeRelation(isFunction);
  return {
    skill: 'mapping',
    prompt: 'The mapping diagram shows a relation. Is it a function?',
    visual: { type: 'mapping', pairs: rel.pairs },
    answer: choiceAnswer(CHOICES, isFunction ? 0 : 1),
    hints: [
      'In a mapping diagram, look at the input side (left). Count the arrows leaving each input.',
      'If any input has two arrows going out, it has two outputs.',
    ],
    solution: [
      ...relationSolution(rel, 'input column'),
      'Shortcut for mapping diagrams: a function has exactly one arrow leaving each input.',
    ],
    reteach: {
      title: 'Mapping diagrams: count arrows out',
      text: [
        'The left oval holds the inputs (x). The right oval holds the outputs (y). Each arrow is one ordered pair.',
        'For a function, every input sends out exactly one arrow.',
        'Two inputs can point at the same output. That is still a function.',
        'One input pointing at two different outputs means it is not a function.',
      ],
    },
    diagnose: relationDiagnose(rel),
  };
}

function genTable() {
  const isFunction = Math.random() < 0.5;
  const rel = makeRelation(isFunction);
  return {
    skill: 'table',
    prompt: 'Does this table represent y as a function of x?',
    visual: { type: 'table', headers: ['x', 'y'], rows: rel.pairs },
    answer: choiceAnswer(CHOICES, isFunction ? 0 : 1),
    hints: ['Look down the x column only.', 'Does any x-value appear in two rows with different y-values?'],
    solution: relationSolution(rel, 'x column'),
    reteach: RETEACH_PAIRS,
    diagnose: relationDiagnose(rel),
  };
}

function genGraph() {
  const isFunction = Math.random() < 0.5;
  let visual;
  let failX = null;
  let solution;
  let failDesc = '';

  if (isFunction) {
    const kind = pick(['line', 'parabola', 'abs', 'smooth', 'scatter']);
    if (kind === 'line') {
      const m = pick([-2, -1, -0.5, 0.5, 1, 2, 3]);
      const b = randInt(-4, 4);
      visual = { type: 'graph', win: W, paths: [{ points: fnPoints((x) => m * x + b), arrows: true }] };
    } else if (kind === 'parabola') {
      const a = pick([1, -1, 0.5, -0.5]);
      const h = randInt(-3, 3);
      const k = randInt(-3, 3);
      visual = { type: 'graph', win: W, paths: [{ points: fnPoints((x) => a * (x - h) ** 2 + k), arrows: true }] };
    } else if (kind === 'abs') {
      const a = pick([1, -1, 2, -2]);
      const h = randInt(-3, 3);
      const k = randInt(-3, 3);
      visual = { type: 'graph', win: W, paths: [{ points: fnPoints((x) => a * Math.abs(x - h) + k, -W - 1, W + 1, 0.25), arrows: true }] };
    } else if (kind === 'smooth') {
      visual = smoothGraphVisual(randomSmoothGraph({ win: W }));
    } else {
      const xs = sample(range(-7, 7), 6);
      visual = { type: 'graph', win: W, paths: [], dots: xs.map((x) => ({ x, y: randInt(-6, 6) })) };
    }
    solution = [
      'Slide an imaginary vertical line across the graph from left to right.',
      'Wherever you stop it, the line crosses the graph at most one time.',
      'Every x-value has only one y-value, so it passes the vertical line test. It is a function.',
    ];
  } else {
    const kind = pick(['circle', 'sideways', 'vertical', 'scatter']);
    if (kind === 'circle') {
      const h = randInt(-2, 2);
      const k = randInt(-2, 2);
      const r = randInt(3, 5);
      visual = {
        type: 'graph',
        win: W,
        paths: [{ points: paramPoints((t) => h + r * Math.cos(t), (t) => k + r * Math.sin(t), 0, 2 * Math.PI), arrows: false }],
      };
      failX = h;
      failDesc = `At x = ${n(h)}, the line hits both ${point(h, k + r)} and ${point(h, k - r)}.`;
    } else if (kind === 'sideways') {
      const a = pick([1, 0.5, -1, -0.5]);
      const h = randInt(-3, 3);
      const k = randInt(-3, 3);
      visual = {
        type: 'graph',
        win: W,
        paths: [{ points: paramPoints((t) => a * (t - k) ** 2 + h, (t) => t, -W - 2, W + 2), arrows: true }],
      };
      failX = h + a * 4;
      failDesc = `At x = ${n(failX)}, the line hits both ${point(failX, k + 2)} and ${point(failX, k - 2)}.`;
    } else if (kind === 'vertical') {
      const c = randNonZero(-5, 5);
      visual = { type: 'graph', win: W, paths: [{ points: [[c, -W - 1], [c, W + 1]], arrows: true }] };
      failX = c;
      failDesc = `The graph IS a vertical line at x = ${n(c)}. The input ${n(c)} is paired with every y-value.`;
    } else {
      const xs = sample(range(-7, 7), 5);
      const dots = xs.map((x) => ({ x, y: randInt(-6, 6) }));
      const d = dots[randInt(0, dots.length - 1)];
      let y2;
      do y2 = randInt(-6, 6);
      while (y2 === d.y);
      dots.push({ x: d.x, y: y2 });
      visual = { type: 'graph', win: W, paths: [], dots };
      failX = d.x;
      failDesc = `At x = ${n(d.x)}, there are two points stacked on top of each other: ${point(d.x, d.y)} and ${point(d.x, y2)}.`;
    }
    solution = [
      'Slide an imaginary vertical line across the graph from left to right.',
      failDesc,
      'One input with two (or more) outputs fails the vertical line test. It is not a function.',
    ];
  }

  const reteachVisual = {
    ...visual,
    vLines: isFunction ? [{ x: -3, tone: 'good' }, { x: 2, tone: 'good' }] : [{ x: failX, tone: 'bad' }],
  };

  return {
    skill: 'graph',
    prompt: 'Is this graph the graph of a function?',
    visual,
    answer: choiceAnswer(CHOICES, isFunction ? 0 : 1),
    hints: [
      'Use the vertical line test: picture a vertical line sweeping from left to right.',
      'Is there any spot where a vertical line would touch the graph twice?',
    ],
    solution,
    reteach: {
      title: 'The vertical line test',
      text: [
        'A vertical line is every point with the same x-value. So if a vertical line touches the graph twice, that one x-value has two y-values.',
        'If every vertical line touches the graph at most once, the graph is a function.',
        isFunction
          ? 'The green lines below each touch the graph only once, and that stays true anywhere you put one.'
          : 'The red line below touches the graph more than once, so it fails.',
      ],
      visual: reteachVisual,
    },
  };
}

function genEquation() {
  const templates = [
    () => {
      const m = randNonZero(-5, 5);
      const b = randInt(-9, 9);
      return { eq: `y = ${poly([[m, 1], [b, 0]])}`, isFunc: true, why: 'Each x gets multiplied and added to once. One input, one output.' };
    },
    () => {
      const c = randInt(-6, 6);
      return { eq: `y = ${poly([[1, 2], [c, 0]])}`, isFunc: true, why: 'Squaring a number gives one result. For example, x = 3 gives only y = ' + n(9 + c) + '.' };
    },
    () => {
      const c = randInt(-6, 6);
      return { eq: `y = |x| ${signed(c)}`.replace(' + 0', '').replace(' − 0', ''), isFunc: true, why: 'Absolute value gives exactly one result for each x.' };
    },
    () => {
      const c = randInt(-6, 6);
      const x = 4 + c;
      return {
        eq: `x = ${poly([[1, 2], [c, 0]], 'y')}`,
        isFunc: false,
        why: `Try x = ${n(x)}: then y² = 4, so y = 2 or y = −2. One input, two outputs.`,
      };
    },
    () => {
      const r = randInt(2, 7);
      return {
        eq: `x² + y² = ${r * r}`,
        isFunc: false,
        why: `Try x = 0: then y² = ${r * r}, so y = ${r} or y = −${r}. (This is a circle.)`,
      };
    },
    () => {
      const c = randNonZero(-9, 9);
      return { eq: `x = ${n(c)}`, isFunc: false, why: `This is a vertical line. The input ${n(c)} is paired with every possible y-value.` };
    },
    () => {
      const c = randInt(-5, 5);
      const x = 9 - c;
      return {
        eq: `y² = ${poly([[1, 1], [c, 0]])}`,
        isFunc: false,
        why: `Try x = ${n(x)}: then y² = 9, so y = 3 or y = −3. One input, two outputs.`,
      };
    },
    () => {
      const a = randNonZero(-3, 3);
      return { eq: `y = ${poly([[a, 3]])}`, isFunc: true, why: 'Cubing a number gives one result, so each x has one y.' };
    },
  ];
  const t = pick(templates)();
  return {
    skill: 'equation',
    prompt: 'Does this equation define y as a function of x?',
    math: t.eq,
    answer: choiceAnswer(CHOICES, t.isFunc ? 0 : 1),
    hints: [
      'Try to solve for y. Could you ever end up with "y = ± something"?',
      'Pick an easy x-value, plug it in, and see how many y-values you get.',
    ],
    solution: [
      `Test the equation ${t.eq} by choosing an x-value and solving for y.`,
      t.why,
      t.isFunc ? 'Every x gives exactly one y, so it is a function.' : 'So it is not a function.',
    ],
    reteach: {
      title: 'Functions from equations',
      text: [
        'An equation is a function if every x-value you plug in produces exactly one y-value.',
        'Warning sign: y is squared (y²) or inside an absolute value. Solving for y then gives a ± and two answers.',
        'Quick test: plug in a friendly x-value (like 0) and count how many y-values work.',
      ],
    },
  };
}

// ---------- topic ----------

export default {
  id: 'functions-relations',
  title: 'Is it a function?',
  summary: 'Decide whether a relation is a function from pairs, tables, mapping diagrams, graphs, and equations.',
  skills: [
    { id: 'pairs', name: 'Ordered pairs', generate: genPairs },
    { id: 'table', name: 'Tables', generate: genTable },
    { id: 'mapping', name: 'Mapping diagrams', generate: genMapping },
    { id: 'graph', name: 'Vertical line test', generate: genGraph },
    { id: 'equation', name: 'Equations', generate: genEquation },
  ],
  lesson: [
    {
      title: 'Relations and functions',
      body: [
        'A **relation** is any set of input–output pairs, written (x, y). The x is the input and the y is the output.',
        'A **function** is a special relation: **every input has exactly one output.**',
        'Think of a vending machine. Press B4 and you should always get the same snack. Two buttons that both give you pretzels is fine. One button that sometimes gives pretzels and sometimes gives candy is broken. That broken machine is "not a function."',
      ],
      practice: 'pairs',
    },
    {
      title: 'Pairs, tables, and mapping diagrams',
      body: [
        'For lists of pairs, tables, and mapping diagrams, the check is the same: **look only at the x-values.**',
        'If an x-value repeats with a different y-value, it is not a function. Repeated y-values never matter.',
      ],
      example: {
        prompt: 'Is { (1, 4), (2, 4), (3, 7), (1, −2) } a function?',
        steps: [
          'Inputs: 1, 2, 3, 1.',
          'The input 1 appears twice, with outputs 4 and −2.',
          'Not a function. (The two 4s are not the problem.)',
        ],
      },
      practice: 'table',
    },
    {
      title: 'The vertical line test',
      body: [
        'On a graph, a vertical line is every point with the same x-value.',
        'If any vertical line touches the graph **more than once**, that x-value has more than one y-value, so the graph is **not** a function.',
      ],
      example: {
        prompt: 'A circle fails the test:',
        visual: {
          type: 'graph',
          win: 8,
          paths: [{ points: paramPoints((t) => 4 * Math.cos(t), (t) => 4 * Math.sin(t), 0, 2 * Math.PI) }],
          vLines: [{ x: 0, tone: 'bad' }],
        },
        steps: ['The line x = 0 touches the circle at (0, 4) and (0, −4).', 'Two outputs for one input, so a circle is not a function.'],
      },
      practice: 'graph',
    },
    {
      title: 'Functions from equations',
      body: [
        'Plug in an x-value and solve for y. If you ever get two answers (usually from a y² or |y|), it is not a function.',
        'Vertical lines like x = 3 are never functions.',
      ],
      example: {
        prompt: 'Is x = y² a function?',
        steps: ['Try x = 9: then y² = 9.', 'So y = 3 or y = −3. Two outputs.', 'Not a function.'],
      },
      practice: 'equation',
    },
  ],
};
