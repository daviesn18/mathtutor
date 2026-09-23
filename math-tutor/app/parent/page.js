'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { TOPICS, getTopic } from '@/lib/topics';
import { topicStats } from '@/lib/progress';
import { getSupabase } from '@/lib/supabase/client';
import { useAccount, loadAttempts } from '@/lib/useAccount';

const WEEK = 7 * 24 * 60 * 60 * 1000;

const dateText = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ParentPage() {
  const router = useRouter();
  const { loading, user, profile } = useAccount();
  const [students, setStudents] = useState(null);
  const [attempts, setAttempts] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await getSupabase()
      .from('profiles')
      .select('id, display_name, username, created_at')
      .eq('parent_id', user.id)
      .order('created_at');
    setStudents(data || []);
    if (data?.length) setAttempts(await loadAttempts(data.map((s) => s.id), { limit: 3000 }).catch(() => []));
  }, [user]);

  useEffect(() => {
    if (!loading && profile && profile.role !== 'parent') router.replace('/learn');
    else refresh();
  }, [loading, profile, refresh, router]);

  if (loading || students === null) return null;

  return (
    <>
      <Header profile={profile} />
      <main className="page">
        <h1 className="page-title">Progress</h1>
        {students.length === 0 && (
          <p className="page-lede">Start by creating a login for your student. They&rsquo;ll sign in with the username and password you choose here.</p>
        )}
        {students.map((s) => (
          <StudentReport key={s.id} student={s} attempts={attempts.filter((a) => a.user_id === s.id)} />
        ))}
        <AddStudent onAdded={refresh} first={students.length === 0} />
      </main>
    </>
  );
}

function StudentReport({ student, attempts }) {
  const now = Date.now();
  const week = attempts.filter((a) => now - new Date(a.created_at).getTime() < WEEK);
  const recent = attempts.slice(0, 50);
  const firstTry = recent.length ? Math.round((recent.filter((a) => a.first_try).length / recent.length) * 100) : null;
  const misses = attempts.filter((a) => !a.correct).slice(0, 8);
  const [showPw, setShowPw] = useState(false);

  return (
    <section className="report" aria-labelledby={`st-${student.id}`}>
      <div className="report-head">
        <h2 id={`st-${student.id}`}>{student.display_name}</h2>
        <p className="report-login">
          Signs in as <strong>{student.username}</strong>
        </p>
      </div>

      <dl className="stats">
        <div>
          <dt>Problems in the last 7 days</dt>
          <dd>{week.length}</dd>
        </div>
        <div>
          <dt>First-try accuracy, last 50</dt>
          <dd>{firstTry === null ? 'None yet' : `${firstTry}%`}</dd>
        </div>
        <div>
          <dt>Last practiced</dt>
          <dd>{attempts[0] ? dateText(attempts[0].created_at) : 'Not yet'}</dd>
        </div>
      </dl>

      <h3 className="report-sub">By topic</h3>
      <div className="topic-reports">
        {TOPICS.map((t) => {
          const st = topicStats(attempts, t);
          return (
            <details key={t.id} className="topic-report">
              <summary>
                <span className="tr-title">{t.title}</span>
                <span className="meter meter-small" aria-hidden="true">
                  {st.skills.map((sk) => (
                    <span key={sk.id} className={sk.stats.mastered ? 'meter-seg meter-seg-on' : 'meter-seg'} />
                  ))}
                </span>
                <span className="tr-status">
                  {st.mastered}/{t.skills.length} mastered
                </span>
              </summary>
              <table className="skill-table">
                <thead>
                  <tr>
                    <th scope="col">Skill</th>
                    <th scope="col">Problems</th>
                    <th scope="col">First try, last 10</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {st.skills.map((sk) => (
                    <tr key={sk.id}>
                      <td>{sk.name}</td>
                      <td>{sk.stats.total}</td>
                      <td>{sk.stats.score === null ? '–' : `${Math.round(sk.stats.score * 100)}%`}</td>
                      <td>{sk.stats.mastered ? 'Mastered' : sk.stats.total ? 'Practicing' : 'Not started'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          );
        })}
      </div>

      <h3 className="report-sub">Recent misses</h3>
      {misses.length === 0 ? (
        <p className="muted">No missed problems yet.</p>
      ) : (
        <ul className="misses">
          {misses.map((m) => (
            <li key={m.id}>
              <p className="miss-topic">
                {getTopic(m.topic)?.skills.find((s) => s.id === m.skill)?.name || m.skill}, {dateText(m.created_at)}
              </p>
              <p className="miss-prompt">{m.prompt}</p>
              <p className="miss-answers">
                Answered <span className="miss-given">{m.given_answer || '(blank)'}</span>, correct answer{' '}
                <span className="miss-correct">{m.correct_answer}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="link-btn" onClick={() => setShowPw((v) => !v)} aria-expanded={showPw}>
        {showPw ? 'Cancel password change' : `Change ${student.display_name}’s password`}
      </button>
      {showPw && <ChangePassword student={student} onDone={() => setShowPw(false)} />}
    </section>
  );
}

async function callApi(method, body) {
  const res = await fetch('/api/students', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function AddStudent({ onAdded, first }) {
  const [open, setOpen] = useState(first);
  const [form, setForm] = useState({ displayName: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setOpen(first), [first]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await callApi('POST', form);
      setForm({ displayName: '', username: '', password: '' });
      setOpen(false);
      await onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)}>
        Add a student login
      </button>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Add a student login</h2>
      <div className="field-row">
        <label className="field">
          <span>First name</span>
          <input value={form.displayName} onChange={set('displayName')} required />
        </label>
        <label className="field">
          <span>Username</span>
          <input value={form.username} onChange={set('username')} autoCapitalize="off" autoComplete="off" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="text" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={6} required />
        </label>
      </div>
      <p className="muted">Usernames use letters, numbers, dots, dashes, or underscores. No email needed.</p>
      {error && <p className="note note-wrong" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create login'}
        </button>
        {!first && (
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ChangePassword({ student, onDone }) {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await callApi('PATCH', { studentId: student.id, password });
      setMsg({ kind: 'right', text: 'Password changed.' });
      setPassword('');
      setTimeout(onDone, 1200);
    } catch (err) {
      setMsg({ kind: 'wrong', text: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="inline-form" onSubmit={submit}>
      <label className="field">
        <span>New password</span>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        Change password
      </button>
      {msg && <p className={`note note-${msg.kind}`}>{msg.text}</p>}
    </form>
  );
}
