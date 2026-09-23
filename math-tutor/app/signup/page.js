'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: err } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      return;
    }
    router.replace('/parent');
    router.refresh();
  };

  if (sent) {
    return (
      <main className="auth auth-single">
        <div className="auth-form">
          <h1>Check your email</h1>
          <p className="auth-lede">
            We sent a confirmation link to {email}. Open it on this device, then come back and sign in.
          </p>
          <Link href="/login" className="btn btn-primary btn-wide">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth auth-single">
      <form className="auth-form" onSubmit={submit}>
        <h1>Create a parent account</h1>
        <p className="auth-lede">You&rsquo;ll see your student&rsquo;s progress here and set up their login next.</p>
        <label className="field">
          <span>Your first name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
        </label>
        {error && <p className="note note-wrong" role="alert">{error}</p>}
        <button className="btn btn-primary btn-wide" disabled={busy}>
          {busy ? 'Creating account…' : 'Create parent account'}
        </button>
        <p className="auth-alt">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
