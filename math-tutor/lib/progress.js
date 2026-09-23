// Mastery math. An "attempt" row: { topic, skill, correct, first_try, created_at }.
// A skill counts as mastered when, over its last 10 problems (at least 5),
// 80% or more were solved on the first try without a hint.

const WINDOW = 10;
const MIN_FOR_MASTERY = 5;
const MASTERY = 0.8;

/** attempts must be sorted newest first. */
export function skillStats(attempts, topicId, skillId) {
  const rows = attempts.filter((a) => a.topic === topicId && a.skill === skillId);
  const recent = rows.slice(0, WINDOW);
  const firstTry = recent.filter((a) => a.first_try).length;
  const score = recent.length ? firstTry / recent.length : null;
  return {
    total: rows.length,
    recent: recent.length,
    score,
    mastered: recent.length >= MIN_FOR_MASTERY && score >= MASTERY,
  };
}

export function topicStats(attempts, topic) {
  const skills = topic.skills.map((s) => ({ ...s, stats: skillStats(attempts, topic.id, s.id) }));
  const tried = skills.filter((s) => s.stats.recent > 0);
  const mastered = skills.filter((s) => s.stats.mastered).length;
  const total = attempts.filter((a) => a.topic === topic.id).length;
  // Progress blends coverage and accuracy so untouched skills pull it down.
  const progress = skills.reduce((sum, s) => sum + (s.stats.mastered ? 1 : (s.stats.score ?? 0) * Math.min(1, s.stats.recent / MIN_FOR_MASTERY) * 0.8), 0) / skills.length;
  let status = 'Not started';
  if (mastered === skills.length) status = 'Mastered';
  else if (tried.length) status = 'In progress';
  return { skills, mastered, total, progress, status };
}

/** Pick the next skill to practice, leaning toward weak or untried skills. */
export function chooseSkill(attempts, topic, lastSkill) {
  const weights = topic.skills.map((s) => {
    const st = skillStats(attempts, topic.id, s.id);
    let w = st.recent === 0 ? 3 : 1 + 3 * (1 - st.score);
    if (st.mastered) w = 0.6;
    if (s.id === lastSkill && topic.skills.length > 1) w *= 0.35;
    return w;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return topic.skills[i].id;
  }
  return topic.skills[topic.skills.length - 1].id;
}
