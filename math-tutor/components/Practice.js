'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateProblem } from '@/lib/topics';
import { checkAnswer } from '@/lib/math/parse';
import { chooseSkill } from '@/lib/progress';
import Visual from './Visual';
import AnswerInput from './AnswerInput';
import RichText from './RichText';

/**
 * Flow for each problem:
 *   1st wrong answer → specific feedback + a hint, try again
 *   2nd wrong answer → worked solution + re-teach, then a similar problem
 * Unreadable input (typos in notation) never costs a try.
 */
export default function Practice({ topic, attempts, skillMode, onSkillModeChange, onAttempt }) {
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('answer'); // answer | retry | done
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [outcome, setOutcome] = useState(null); // first | helped | missed
  const [showSolution, setShowSolution] = useState(false);
  const [session, setSession] = useState({ right: 0, total: 0 });
  const lastSkill = useRef(null);
  const resultRef = useRef(null);

  const next = useCallback(
    (forceSkill) => {
      const skillId = forceSkill || (skillMode === 'auto' ? chooseSkill(attempts, topic, lastSkill.current) : skillMode);
      lastSkill.current = skillId;
      setProblem(generateProblem(topic, skillId));
      setInput('');
      setStage('answer');
      setTries(0);
      setHints(0);
      setFeedback(null);
      setOutcome(null);
      setShowSolution(false);
    },
    // attempts intentionally excluded: a new attempt shouldn't swap the current problem
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic, skillMode]
  );

  useEffect(() => {
    next();
  }, [next]);

  useEffect(() => {
    if (stage === 'done') resultRef.current?.focus();
  }, [stage]);

  if (!problem) return null;

  const hasAnswer = problem.answer.type === 'choice' ? input !== '' && input !== null : String(input).trim() !== '';

  const finish = (result) => {
    setStage('done');
    setOutcome(result);
    setSession((s) => ({ right: s.right + (result === 'missed' ? 0 : 1), total: s.total + 1 }));
    const given = problem.answer.type === 'choice' ? problem.answer.choices[input] : String(input);
    onAttempt?.({
      topic: topic.id,
      skill: problem.skill,
      correct: result !== 'missed',
      first_try: result === 'first',
      hints_used: hints,
      prompt: [problem.prompt, problem.math].filter(Boolean).join('  '),
      given_answer: given,
      correct_answer: problem.answer.display,
    });
  };

  const submit = () => {
    if (stage === 'done' || !hasAnswer) return;
    const res = checkAnswer(problem.answer, input);
    if (!res.readable) {
      setFeedback({ kind: 'info', text: res.feedback });
      return;
    }
    if (res.correct) {
      setFeedback(null);
      finish(tries === 0 && hints === 0 ? 'first' : 'helped');
      return;
    }
    const specific = problem.diagnose?.(input, res.parsed) || res.feedback || null;
    if (tries === 0) {
      setTries(1);
      setStage('retry');
      setHints((h) => Math.max(h, 1));
      setFeedback({ kind: 'wrong', text: specific || 'Not quite. Here is a hint. Give it another try.' });
    } else {
      setTries(2);
      setFeedback(specific ? { kind: 'wrong', text: specific } : null);
      finish('missed');
    }
  };

  const hintsShown = problem.hints.slice(0, hints);
  const canHint = stage !== 'done' && hints < problem.hints.length;

  return (
    <section className="practice" aria-live="polite">
      <div className="practice-bar">
        <label className="skill-picker">
          <span>Practice</span>
          <select value={skillMode} onChange={(e) => onSkillModeChange(e.target.value)}>
            <option value="auto">Mixed (focuses on what needs work)</option>
            {topic.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {session.total > 0 && (
          <p className="session-score">
            {session.right} of {session.total} right this session
          </p>
        )}
      </div>

      <article className="problem">
        <p className="problem-skill">{problem.skillName}</p>
        <div className={problem.visual ? 'problem-grid' : 'problem-grid problem-grid-single'}>
          {problem.visual && (
            <div className="problem-visual">
              <Visual visual={problem.visual} />
            </div>
          )}
          <div className="problem-work">
            <h2 className="problem-prompt">{problem.prompt}</h2>
            {problem.math && <p className="math">{problem.math}</p>}

            <AnswerInput
              problem={problem}
              value={input}
              onChange={(v) => {
                setInput(v);
                if (feedback?.kind === 'info') setFeedback(null);
              }}
              onSubmit={submit}
              disabled={stage === 'done'}
            />

            {stage !== 'done' && (
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={submit} disabled={!hasAnswer}>
                  Check answer
                </button>
                {canHint && (
                  <button type="button" className="btn btn-quiet" onClick={() => setHints((h) => h + 1)}>
                    Show a hint
                  </button>
                )}
              </div>
            )}

            {feedback && stage !== 'done' && (
              <p className={`note note-${feedback.kind}`} role={feedback.kind === 'wrong' ? 'alert' : undefined}>
                {feedback.text}
              </p>
            )}

            {hintsShown.length > 0 && stage !== 'done' && (
              <div className="hints">
                {hintsShown.map((h, i) => (
                  <p key={i} className="hint">
                    <span className="hint-tag">Hint {i + 1}</span> {h}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {stage === 'done' && (
          <div className="result" ref={resultRef} tabIndex={-1}>
            {outcome !== 'missed' ? (
              <>
                <p className="verdict verdict-right">
                  <span aria-hidden="true">✓</span>{' '}
                  {outcome === 'first' ? 'Correct.' : 'Correct. Nice work sticking with it.'}
                </p>
                <button type="button" className="link-btn" onClick={() => setShowSolution((s) => !s)} aria-expanded={showSolution}>
                  {showSolution ? 'Hide the solution' : 'See the full solution'}
                </button>
                {showSolution && <Steps steps={problem.solution} />}
                <div className="actions">
                  <button type="button" className="btn btn-primary" onClick={() => next()}>
                    Next problem
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="verdict verdict-wrong">
                  Not this time. The answer is <strong>{problem.answer.display}</strong>.
                </p>
                {feedback?.text && <p className="note note-wrong">{feedback.text}</p>}
                <h3 className="result-head">How to solve it</h3>
                <Steps steps={problem.solution} />
                <Reteach reteach={problem.reteach} />
                <div className="actions">
                  <button type="button" className="btn btn-primary" onClick={() => next(problem.skill)}>
                    Try a similar problem
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => next()}>
                    Skip to a different one
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

function Steps({ steps }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  );
}

function Reteach({ reteach }) {
  if (!reteach) return null;
  return (
    <aside className="reteach">
      <h3>{reteach.title}</h3>
      <div className={reteach.visual ? 'reteach-grid' : ''}>
        <div>
          {reteach.text.map((t, i) => (
            <RichText key={i} text={t} />
          ))}
        </div>
        {reteach.visual && (
          <figure className="reteach-visual">
            <Visual visual={reteach.visual} />
            {reteach.caption && <figcaption>{reteach.caption}</figcaption>}
          </figure>
        )}
      </div>
    </aside>
  );
}
