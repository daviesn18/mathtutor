import { n, point, pointList, intervals } from '../math/format.js';
import { intervalsSameEnds, pointsEqual } from '../math/parse.js';
import { randomSmoothGraph, smoothGraphVisual, hermite } from '../math/curves.js';
import { intervalAnswer, pointsAnswer, intervalBracketFeedback } from './shared.js';

const INTERVAL_HELP = 'Use interval notation. Type "inf" for ∞ and "U" for ∪. Type "none" if there are none.';

// ---------- relative extrema ----------

function genExtrema(kind) {
  return () => {
    const g = randomSmoothGraph();
    const wantMax = kind === 'max';
    const pts = wantMax ? g.maxima : g.minima;
    const other = wantMax ? g.minima : g.maxima;
    const word = wantMax ? 'maximum' : 'minimum';
    const shape = wantMax ? 'peak' : 'valley';
    const shapes = wantMax ? 'peaks' : 'valleys';

    const visual = smoothGraphVisual(g);
    const reteachVisual = smoothGraphVisual(g, {
      dots: [
        ...g.maxima.map(([x, y]) => ({ x, y, label: `max ${point(x, y)}`, tone: wantMax ? 'accent' : 'muted' })),
        ...g.minima.map(([x, y]) => ({ x, y, label: `min ${point(x, y)}`, tone: wantMax ? 'muted' : 'accent' })),
      ],
    });

    const solution = pts.length
      ? [
          `Scan the graph for ${shapes}: points that are ${wantMax ? 'higher' : 'lower'} than everything right next to them.`,
          `The ${pts.length === 1 ? shape + ' is' : shapes + ' are'} at ${pointList(pts)}.`,
          pts.length === 1
            ? `So the relative ${word} is ${n(pts[0][1])}, and it happens at x = ${n(pts[0][0])}.`
            : `Each one is a relative ${word}. The y-value is the ${word} value, and the x-value tells you where it happens.`,
        ]
      : [
          `Scan the graph for ${shapes}. This graph turns only at ${pointList(other)}, and ${other.length === 1 ? 'that is' : 'those are'} ${wantMax ? 'valleys' : 'peaks'}.`,
          `The ends shoot off the grid with arrows, so they never turn around. There is no relative ${word}: the answer is none.`,
        ];

    return {
      skill: wantMax ? 'rel-max' : 'rel-min',
      prompt: `List every relative ${word} of the function as a point (x, y). Type "none" if there aren't any.`,
      visual,
      answer: pointsAnswer(pts),
      inputKind: 'points',
      hints: [
        `A relative ${word} is a ${shape}: the graph ${wantMax ? 'rises up to it and then falls' : 'falls down to it and then rises'}.`,
        'Find each turning point, then read its x-value (across) and y-value (up or down).',
      ],
      solution,
      reteach: {
        title: `Relative ${word}s are ${shapes}`,
        text: [
          'Relative maximum: a peak. The graph goes up, turns, and comes back down.',
          'Relative minimum: a valley. The graph goes down, turns, and comes back up.',
          'Write each one as a point (x, y). The y-value is how high or low it is. The x-value is where it happens.',
          '"Relative" means it only needs to be the highest (or lowest) point in its own neighborhood, not on the whole graph.',
        ],
        visual: reteachVisual,
      },
      diagnose: (raw, parsed) => {
        if (!parsed) return null;
        if (parsed.length && pointsEqual(parsed, other))
          return `Those are the ${wantMax ? 'valleys (relative minimums)' : 'peaks (relative maximums)'}. You want the ${shapes}.`;
        const swapped = parsed.map(([x, y]) => [y, x]);
        if (parsed.length && pointsEqual(swapped, pts)) return 'Check the order inside each point: (x, y) means across first, then up or down.';
        if (parsed.length && parsed.length < pts.length && parsed.every((q) => pts.some((r) => r[0] === q[0] && r[1] === q[1])))
          return `Good start. There ${pts.length - parsed.length === 1 ? 'is another one' : 'are more'} you haven't listed.`;
        return null;
      },
    };
  };
}

// ---------- intervals ----------

const INTERVAL_KINDS = {
  increasing: {
    opposite: 'decreasing',
    prompt: 'Over what interval(s) is the function increasing?',
    hints: [
      'Read the graph left to right, like a hiker walking along it. Increasing means walking uphill.',
      'Use the x-values of the turning points as the boundaries.',
    ],
    tone: 'good',
  },
  decreasing: {
    opposite: 'increasing',
    prompt: 'Over what interval(s) is the function decreasing?',
    hints: [
      'Read the graph left to right, like a hiker walking along it. Decreasing means walking downhill.',
      'Use the x-values of the turning points as the boundaries.',
    ],
    tone: 'bad',
  },
  positive: {
    opposite: 'negative',
    prompt: 'Over what interval(s) is the function positive?',
    hints: ['Positive means the graph is above the x-axis (y > 0).', 'The boundaries are the x-intercepts, where the graph crosses the x-axis.'],
    tone: 'good',
  },
  negative: {
    opposite: 'positive',
    prompt: 'Over what interval(s) is the function negative?',
    hints: ['Negative means the graph is below the x-axis (y < 0).', 'The boundaries are the x-intercepts, where the graph crosses the x-axis.'],
    tone: 'bad',
  },
};

const listX = (xs) => {
  const parts = xs.map((x) => `x = ${n(x)}`);
  return parts.length < 3 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
};

function describeRegions(g, kind) {
  const steps = [];
  if (kind === 'increasing' || kind === 'decreasing') {
    steps.push(`The graph turns around at ${listX(g.turningXs)}. ${g.turningXs.length === 1 ? 'That x-value splits' : 'Those x-values split'} it into pieces.`);
    const all = [...g.increasing.map((iv) => ({ iv, up: true })), ...g.decreasing.map((iv) => ({ iv, up: false }))].sort(
      (a, b) => a.iv.lo - b.iv.lo
    );
    all.forEach(({ iv, up }) => steps.push(`${intervals([iv])}: the graph goes ${up ? 'up (increasing)' : 'down (decreasing)'}.`));
  } else {
    if (g.zeros.length)
      steps.push(`The graph crosses the x-axis at ${listX(g.zeros)}. ${g.zeros.length === 1 ? 'That x-value splits' : 'Those x-values split'} it into pieces.`);
    else steps.push('The graph never crosses the x-axis, so it stays on one side the whole time.');
    const all = [...g.positive.map((iv) => ({ iv, pos: true })), ...g.negative.map((iv) => ({ iv, pos: false }))].sort(
      (a, b) => a.iv.lo - b.iv.lo
    );
    all.forEach(({ iv, pos }) => steps.push(`${intervals([iv])}: the graph is ${pos ? 'above the axis (positive)' : 'below the axis (negative)'}.`));
  }
  return steps;
}

function genInterval(kind) {
  return () => {
    const g = randomSmoothGraph();
    const info = INTERVAL_KINDS[kind];
    const expected = g[kind];
    const opposite = g[info.opposite];
    const isSlope = kind === 'increasing' || kind === 'decreasing';

    const bracketWhy = isSlope
      ? 'At a turning point the graph is flat for an instant (neither rising nor falling), so turning points get parentheses ( ).'
      : 'At an x-intercept the function equals 0, which is neither positive nor negative, so x-intercepts get parentheses ( ).';

    return {
      skill: kind,
      prompt: info.prompt,
      visual: smoothGraphVisual(g),
      answer: intervalAnswer(expected),
      inputKind: 'interval',
      inputHelp: INTERVAL_HELP,
      hints: info.hints,
      solution: [...describeRegions(g, kind), `So the function is ${kind} on ${intervals(expected)}.`],
      reteach: {
        title: isSlope ? 'Increasing and decreasing: read left to right' : 'Positive and negative: above or below the x-axis',
        text: isSlope
          ? [
              'Always read a graph from left to right. Going uphill = increasing. Going downhill = decreasing.',
              'The pieces are separated by the turning points. Write each piece using x-values only.',
              'Use parentheses at turning points, and always use parentheses with ∞.',
              'If the graph does this in more than one place, join the pieces with ∪ ("union").',
            ]
          : [
              'Positive means y > 0: the part of the graph above the x-axis. Negative means y < 0: below it.',
              'The pieces are separated by the x-intercepts. Write each piece using x-values only.',
              'Use parentheses at x-intercepts (y = 0 there, which is neither positive nor negative).',
              'Join separate pieces with ∪.',
            ],
        visual: smoothGraphVisual(g, {
          highlights: expected.map((iv) => ({ lo: iv.lo, hi: iv.hi, tone: info.tone })),
          dots: isSlope ? g.extrema.map((e) => ({ x: e.x, y: e.y, tone: 'muted' })) : g.zeros.map((z) => ({ x: z, y: 0, tone: 'muted' })),
        }),
        caption: `The highlighted stretch of the x-axis shows where the function is ${kind}.`,
      },
      diagnose: (raw, parsed) => {
        if (!parsed) return null;
        const b = intervalBracketFeedback(parsed, expected, bracketWhy);
        if (b) return b;
        if (parsed.length && intervalsSameEnds(parsed, opposite))
          return `That's where the function is ${info.opposite}. Flip it: you want where it's ${kind}.`;
        const yVals = new Set((isSlope ? g.extrema.map((e) => e.y) : []).map(String));
        const ends = parsed.flatMap((iv) => [iv.lo, iv.hi]).filter(Number.isFinite);
        if (isSlope && ends.length && ends.every((v) => yVals.has(String(v))))
          return 'It looks like you used the y-values of the turning points. Intervals are always written with x-values.';
        return null;
      },
    };
  };
}

// ---------- topic ----------

// Fixed lesson example: peak at (−2, 4), valley at (3, −3), zeros at −5, 1, 6.
const EX_KNOTS = [
  { x: -10, y: -13, m: 1.8 },
  { x: -5, y: 0, m: 1.2 },
  { x: -2, y: 4, m: 0 },
  { x: 1, y: 0, m: -1.4 },
  { x: 3, y: -3, m: 0 },
  { x: 6, y: 0, m: 1.4 },
  { x: 10, y: 13, m: 3 },
];

function exampleVisual(extra = {}) {
  const pts = [];
  for (let x = -9; x <= 9; x += 0.05) pts.push([x, hermite(EX_KNOTS, x)]);
  return { type: 'graph', win: 8, paths: [{ points: pts, arrows: true }], ...extra };
}

export default {
  id: 'graph-features',
  title: 'Extrema and intervals',
  summary: 'Read relative maximums and minimums from a graph, and find where a function is increasing, decreasing, positive, or negative.',
  skills: [
    { id: 'rel-max', name: 'Relative maximums', generate: genExtrema('max') },
    { id: 'rel-min', name: 'Relative minimums', generate: genExtrema('min') },
    { id: 'increasing', name: 'Increasing intervals', generate: genInterval('increasing') },
    { id: 'decreasing', name: 'Decreasing intervals', generate: genInterval('decreasing') },
    { id: 'positive', name: 'Positive intervals', generate: genInterval('positive') },
    { id: 'negative', name: 'Negative intervals', generate: genInterval('negative') },
  ],
  lesson: [
    {
      title: 'Peaks and valleys',
      body: [
        'A **relative maximum** is a peak: the graph rises to it, then falls. A **relative minimum** is a valley: the graph falls to it, then rises.',
        'Write each one as a point (x, y). The y-value is the max or min value. The x-value is where it happens.',
        '"Relative" means it only has to beat the points right around it. A graph can have several.',
      ],
      example: {
        prompt: 'This graph has one peak and one valley.',
        visual: exampleVisual({
          dots: [
            { x: -2, y: 4, label: 'max (−2, 4)', tone: 'accent' },
            { x: 3, y: -3, label: 'min (3, −3)', tone: 'accent' },
          ],
        }),
        steps: ['Relative maximum: (−2, 4). The max value is 4 at x = −2.', 'Relative minimum: (3, −3). The min value is −3 at x = 3.'],
      },
      practice: 'rel-max',
    },
    {
      title: 'Increasing and decreasing',
      body: [
        'Read the graph **left to right**, like you are hiking along it. Uphill is **increasing**. Downhill is **decreasing**.',
        'The turning points split the graph into pieces. Describe each piece with **x-values** in interval notation.',
      ],
      example: {
        prompt: 'Same graph as above:',
        visual: exampleVisual({
          highlights: [
            { lo: -Infinity, hi: -2, tone: 'good' },
            { lo: 3, hi: Infinity, tone: 'good' },
          ],
        }),
        steps: [
          'Uphill from the far left until x = −2, then downhill until x = 3, then uphill forever.',
          'Increasing: (−∞, −2) ∪ (3, ∞)',
          'Decreasing: (−2, 3)',
        ],
      },
      practice: 'increasing',
    },
    {
      title: 'Positive and negative',
      body: [
        '**Positive** means the graph is above the x-axis (y > 0). **Negative** means below it (y < 0).',
        'This time the pieces are split by the **x-intercepts**, where the graph crosses the axis.',
      ],
      example: {
        prompt: 'Same graph, now looking at where it sits:',
        visual: exampleVisual({
          highlights: [
            { lo: -5, hi: 1, tone: 'good' },
            { lo: 6, hi: Infinity, tone: 'good' },
          ],
          dots: [
            { x: -5, y: 0, tone: 'muted' },
            { x: 1, y: 0, tone: 'muted' },
            { x: 6, y: 0, tone: 'muted' },
          ],
        }),
        steps: ['It crosses the x-axis at −5, 1, and 6.', 'Positive: (−5, 1) ∪ (6, ∞)', 'Negative: (−∞, −5) ∪ (1, 6)'],
      },
      practice: 'positive',
    },
    {
      title: 'Writing interval notation',
      body: [
        '( ) means the endpoint is **not** included. [ ] means it **is** included.',
        'For increasing/decreasing and positive/negative, endpoints are turning points or zeros, so they always get ( ).',
        '∞ and −∞ always get ( ), because you can never reach them.',
        '∪ ("union") glues separate pieces together. On the keyboard, type **inf** for ∞ and **U** for ∪, or use the buttons under the answer box.',
      ],
      practice: 'decreasing',
    },
  ],
};
