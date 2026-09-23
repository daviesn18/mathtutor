'use client';

import RichText from './RichText';
import Visual from './Visual';

export default function Lesson({ topic, onPractice }) {
  return (
    <div className="lesson">
      {topic.lesson.map((sec, i) => (
        <section key={sec.title} className="lesson-section" aria-labelledby={`sec-${i}`}>
          <h2 id={`sec-${i}`}>{sec.title}</h2>
          <div className={sec.example?.visual ? 'lesson-grid' : ''}>
            <div className="lesson-text">
              {sec.body.map((b, j) => (
                <RichText key={j} text={b} />
              ))}
              {sec.example && (
                <div className="example">
                  <p className="example-prompt">
                    <span className="example-tag">Example</span> {sec.example.prompt}
                  </p>
                  <ol className="steps">
                    {sec.example.steps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            {sec.example?.visual && (
              <div className="lesson-visual">
                <Visual visual={sec.example.visual} />
              </div>
            )}
          </div>
          {sec.practice && (
            <button type="button" className="btn btn-quiet" onClick={() => onPractice(sec.practice)}>
              Practice this
            </button>
          )}
        </section>
      ))}
    </div>
  );
}
