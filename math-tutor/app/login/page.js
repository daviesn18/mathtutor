'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { loginEmail, APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await getSupabase().auth.signInWithPassword({ email: loginEmail(login), password });
    setBusy(false);
    if (err) {
      setError(/invalid/i.test(err.message) ? 'That username or password doesn\'t match. Check the spelling and try again.' : err.message);
      return;
    }
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="auth">
      <div className="auth-art" aria-hidden="true">
        <AuthGraph />
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h1>{APP_NAME}</h1>
        <p className="auth-lede">Lessons, practice problems, and step-by-step help for Algebra 2.</p>
        <label className="field">
          <span>Username or email</span>
          <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="off" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="note note-wrong" role="alert">{error}</p>}
        <button className="btn btn-primary btn-wide" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-alt">
          Parent setting this up? <Link href="/signup">Create a parent account</Link>
        </p>
      </form>
    </main>
  );
}

function AuthGraph() {
  return (
    <svg viewBox="0 0 300 300" className="auth-graph">
      {Array.from({ length: 16 }, (_, i) => (
        <g key={i}>
          <line x1={i * 20} y1="0" x2={i * 20} y2="300" className="grid" />
          <line x1="0" y1={i * 20} x2="300" y2={i * 20} className="grid" />
        </g>
      ))}
      <line x1="0" y1="160" x2="300" y2="160" className="axis" />
      <line x1="140" y1="0" x2="140" y2="300" className="axis" />
      <rect x="20" y="153" width="80" height="14" className="graph-highlight" />
      <rect x="200" y="153" width="100" height="14" className="graph-highlight" />
      <path d="M10 290 C 50 90, 90 40, 100 60 S 170 250, 200 220 S 260 30, 300 10" className="curve" fill="none" stroke="var(--ink)" />
    </svg>
  );
}
