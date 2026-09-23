// Generates thousands of problems from every skill and checks that each
// problem's own answer is accepted and no text contains NaN/undefined.
// Run with: npm test
import { TOPICS, generateProblem } from '../lib/topics/index.js';
import { checkAnswer } from '../lib/math/parse.js';

const PER_SKILL = 300;
const typed = (a) => (a.type === 'choice' ? a.value : a.display);
let failures = 0;
let total = 0;

for (const topic of TOPICS) {
  for (const skill of topic.skills) {
    for (let i = 0; i < PER_SKILL; i++) {
      total++;
      let p;
      try {
        p = generateProblem(topic, skill.id);
      } catch (e) {
        failures++;
        console.log(`✗ ${topic.id}/${skill.id} threw: ${e.message}`);
        break;
      }
      const res = checkAnswer(p.answer, typed(p.answer));
      if (!res.correct) {
        failures++;
        console.log(`✗ ${topic.id}/${skill.id} rejects its own answer: ${p.answer.display}`);
      }
      const text = [p.prompt, p.math, ...p.solution, ...p.hints].join(' ');
      if (/NaN|undefined/.test(text)) {
        failures++;
        console.log(`✗ ${topic.id}/${skill.id} has broken text: ${text.slice(0, 200)}`);
      }
      if (!p.hints?.length || !p.solution?.length || !p.reteach?.text?.length) {
        failures++;
        console.log(`✗ ${topic.id}/${skill.id} is missing hints, solution, or reteach`);
      }
    }
  }
}

console.log(`${total} problems checked, ${failures} problem(s) found.`);
process.exit(failures ? 1 : 0);
