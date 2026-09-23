'use client';

import { useRef } from 'react';

const KEYS = {
  interval: ['(', ')', '[', ']', '−', '∞', '∪', ',', 'none'],
  points: ['(', ')', ',', '−', 'none'],
  number: ['−', '/'],
};

const HELP = {
  points: 'Write points like (2, −3). Separate several with commas.',
  number: 'Whole numbers, decimals, or fractions like 3/4.',
};

export default function AnswerInput({ problem, value, onChange, onSubmit, disabled }) {
  const ref = useRef(null);
  const { answer } = problem;

  if (answer.type === 'choice') {
    return (
      <div className="choices" role="radiogroup" aria-label="Answer choices">
        {answer.choices.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === i}
            className={value === i ? 'choice choice-on' : 'choice'}
            onClick={() => onChange(i)}
            disabled={disabled}
          >
            {c}
          </button>
        ))}
      </div>
    );
  }

  const kind = problem.inputKind || answer.type;
  const keys = KEYS[kind] || [];
  const help = problem.inputHelp || HELP[kind];

  const insert = (k) => {
    const el = ref.current;
    const text = k === 'none' ? 'none' : k;
    if (k === 'none') {
      onChange('none');
      el?.focus();
      return;
    }
    const cur = typeof value === 'string' ? value : '';
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + text + cur.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div className="answer-input">
      <label htmlFor={`ans-${problem.id}`} className="answer-label">
        Your answer
      </label>
      <input
        id={`ans-${problem.id}`}
        ref={ref}
        className="answer-box"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        disabled={disabled}
      />
      {keys.length > 0 && (
        <div className="keys" aria-label="Symbol buttons">
          {keys.map((k) => (
            <button key={k} type="button" className="key" onClick={() => insert(k)} disabled={disabled}>
              {k}
            </button>
          ))}
        </div>
      )}
      {help && <p className="answer-help">{help}</p>}
    </div>
  );
}
