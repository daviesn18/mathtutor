'use client';

import { topicStats } from '@/lib/progress';

export default function SkillList({ topic, attempts, active, onPick }) {
  const { skills } = topicStats(attempts, topic);
  return (
    <ul className="skill-list">
      {skills.map((s) => {
        const pct = s.stats.score === null ? null : Math.round(s.stats.score * 100);
        return (
          <li key={s.id}>
            <button
              type="button"
              className={active === s.id ? 'skill-row skill-row-on' : 'skill-row'}
              onClick={() => onPick(s.id)}
              aria-pressed={active === s.id}
            >
              <span className={s.stats.mastered ? 'skill-check skill-check-on' : 'skill-check'} aria-hidden="true">
                {s.stats.mastered ? '✓' : ''}
              </span>
              <span className="skill-name">{s.name}</span>
              <span className="skill-meta">
                {s.stats.mastered ? 'Mastered' : pct === null ? 'New' : `${pct}% first try`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
