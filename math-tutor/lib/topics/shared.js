import { n, intervals, pointList, fracText, frac } from '../math/format.js';
import { intervalsSameEnds, intervalsEqual, numbersEqual } from '../math/parse.js';

export const choiceAnswer = (choices, correctIndex) => ({
  type: 'choice',
  choices,
  value: correctIndex,
  display: choices[correctIndex],
});

export const numberAnswer = (value, display) => ({
  type: 'number',
  value,
  display: display ?? n(value),
});

/** Exact fraction answer. Accepts 3/2 or 1.5 when typed. */
export const fracAnswer = (num, den) => {
  const f = frac(num, den);
  return { type: 'number', value: f.n / f.d, display: fracText(f) };
};

export const intervalAnswer = (list) => ({ type: 'interval', value: list, display: intervals(list) });

export const pointsAnswer = (pts) => ({ type: 'points', value: pts, display: pointList(pts) });

/** Common interval mistakes shared by several skills. */
export function intervalBracketFeedback(given, expected, why) {
  if (given && intervalsSameEnds(given, expected) && !intervalsEqual(given, expected)) {
    return `Your numbers are right. Now check the brackets. ${why}`;
  }
  return null;
}

/** True if the student's value equals any of the listed mistake values. */
export const matches = (parsed, value) => parsed !== null && parsed !== undefined && numbersEqual(parsed, value);
