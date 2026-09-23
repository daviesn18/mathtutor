// The list of topics the tutor offers, in the order they appear.
// To add a new concept: create a file in this folder that follows the same
// shape as the others (id, title, summary, skills, lesson), then add it here.

import functionsRelations from './functions-relations.js';
import graphFeatures from './graph-features.js';
import functionNotation from './function-notation.js';
import domainRange from './domain-range.js';
import systems from './systems.js';

export const TOPICS = [functionsRelations, functionNotation, domainRange, graphFeatures, systems];

export const getTopic = (id) => TOPICS.find((t) => t.id === id);

export function generateProblem(topic, skillId) {
  const skill = topic.skills.find((s) => s.id === skillId) || topic.skills[0];
  const problem = skill.generate();
  return {
    ...problem,
    id: Math.random().toString(36).slice(2),
    topic: topic.id,
    skill: skill.id,
    skillName: skill.name,
  };
}
