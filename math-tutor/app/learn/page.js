'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { TOPICS } from '@/lib/topics';
import { topicStats } from '@/lib/progress';
import { useAccount, loadAttempts } from '@/lib/useAccount';

export default function LearnHome() {
  const { loading, user, profile } = useAccount();
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    if (user) loadAttempts([user.id]).then(setAttempts).catch(() => setAttempts([]));
  }, [user]);

  if (loading) return <Loading />;

  const first = profile?.display_name?.split(' ')[0];

  return (
    <>
      <Header profile={profile} />
      <main className="page">
        <h1 className="page-title">{first ? `Hi, ${first}.` : 'Welcome.'} Pick a topic.</h1>
        <p className="page-lede">Read the lesson first if a topic is new. Practice adjusts to the skills you miss most.</p>
        <ol className="topic-list">
          {TOPICS.map((t) => {
            const st = topicStats(attempts, t);
            return (
              <li key={t.id} className="topic-row">
                <div className="topic-main">
                  <h2>
                    <Link href={`/learn/${t.id}`}>{t.title}</Link>
                  </h2>
                  <p>{t.summary}</p>
                  <div className="meter" role="img" aria-label={`${st.mastered} of ${t.skills.length} skills mastered`}>
                    {t.skills.map((s, i) => (
                      <span key={s.id} className={st.skills[i].stats.mastered ? 'meter-seg meter-seg-on' : 'meter-seg'} />
                    ))}
                  </div>
                  <p className="topic-status">
                    {st.status === 'Not started'
                      ? 'Not started'
                      : `${st.mastered} of ${t.skills.length} skills mastered, ${st.total} problems done`}
                  </p>
                </div>
                <div className="topic-actions">
                  <Link className="btn btn-quiet" href={`/learn/${t.id}?tab=lesson`}>
                    Lesson
                  </Link>
                  <Link className="btn btn-primary" href={`/learn/${t.id}?tab=practice`}>
                    Practice
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    </>
  );
}

function Loading() {
  return (
    <main className="page">
      <p className="page-lede">Loading…</p>
    </main>
  );
}
