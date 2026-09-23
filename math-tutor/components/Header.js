'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/constants';

export default function Header({ profile }) {
  const router = useRouter();
  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace('/login');
    router.refresh();
  };
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <BrandMark />
        {APP_NAME}
      </Link>
      {profile && (
        <nav className="header-nav" aria-label="Account">
          {profile.role === 'parent' && (
            <>
              <Link href="/parent">Progress</Link>
              <Link href="/learn">Try the tutor</Link>
            </>
          )}
          <span className="header-name">{profile.display_name}</span>
          <button type="button" className="link-btn" onClick={signOut}>
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="brand-mark">
      <path d="M1 13h24M13 1v24" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <path d="M2 21 C 7 4, 11 4, 14 13 S 21 22, 24 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
