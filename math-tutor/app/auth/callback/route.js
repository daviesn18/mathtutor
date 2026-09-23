import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

// Handles the link in the "confirm your email" message (if confirmation is on).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await getServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/`);
}
