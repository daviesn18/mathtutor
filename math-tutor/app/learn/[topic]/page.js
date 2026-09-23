'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Lesson from '@/components/Lesson';
import Practice from '@/components/Practice';
import SkillList from '@/components/SkillList';
import { getTopic } from '@/lib/topics';
import { useAccount, loadAttempts, saveAttempt } from '@/lib/useAccount';

export default function TopicPage() {
  return (
    <Suspense fallback={null}>
      <TopicInner />
    </Suspense>
  );
}

function TopicInner() {
  const { topic: topicId } = useParams();
  const search = useSearchParams();
  const topic = getTopic(topicId);
  const { loading, user, profile } = useAccount();
  const [attempts, setAttempts] = useState([]);
  const [tab, setTab] = useState(search.get('tab') === 'practice' ? 'practice' : 'lesson');
  const [skillMode, setSkillMode] = useState('auto');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (user && topic) loadAttempts([user.id], { topic: topic.id }).then(setAttempts).catch(() => setAttempts([]));
  }, [user, topic]);

  if (!topic) {
    return (
      <main className="page">
        <h1 className="page-title">That topic doesn&rsquo;t exist.</h1>
        <Link href="/learn" className="btn btn-primary">
          Back to topics
        </Link>
      </main>
    );
  }
  if (loading) return null;

  const record = async (row) => {
    const optimistic = { ...row, id: `tmp-${Date.now()}`, created_at: new Date().toISOString() };
    setAttempts((a) => [optimistic, ...a]);
    try {
      await saveAttempt(user.id, row);
      setSaveError('');
    } catch (e) {
      setSaveError(`Progress didn't save (${e.message}). Check your connection; practice still works.`);
    }
  };

  const practiceSkill = (skillId) => {
    setSkillMode(skillId);
    setTab('practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Header profile={profile} />
      <main className="page page-topic">
        <Link href="/learn" className="back">
          All topics
        </Link>
        <h1 className="page-title">{topic.title}</h1>
        <p className="page-lede">{topic.summary}</p>

        <div className="tabs" role="tablist" aria-label="Lesson or practice">
          <button role="tab" aria-selected={tab === 'lesson'} className={tab === 'lesson' ? 'tab tab-on' : 'tab'} onClick={() => setTab('lesson')}>
            Lesson
          </button>
          <button role="tab" aria-selected={tab === 'practice'} className={tab === 'practice' ? 'tab tab-on' : 'tab'} onClick={() => setTab('practice')}>
            Practice
          </button>
        </div>

        {saveError && <p className="note note-info">{saveError}</p>}

        <div className="topic-layout">
          <div className="topic-content">
            {tab === 'lesson' ? (
              <Lesson topic={topic} onPractice={practiceSkill} />
            ) : (
              <Practice topic={topic} attempts={attempts} skillMode={skillMode} onSkillModeChange={setSkillMode} onAttempt={record} />
            )}
          </div>
          <aside className="topic-aside" aria-label="Skills in this topic">
            <h2>Skills</h2>
            <p className="aside-note">A skill is mastered after 80% first-try accuracy on your last 10 problems.</p>
            <SkillList topic={topic} attempts={attempts} active={tab === 'practice' ? skillMode : null} onPick={practiceSkill} />
          </aside>
        </div>
      </main>
    </>
  );
}
