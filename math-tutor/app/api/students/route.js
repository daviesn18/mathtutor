import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase/server';
import { loginEmail } from '@/lib/constants';

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

async function requireParent() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'parent')
    return { error: NextResponse.json({ error: 'Only parent accounts can manage student logins.' }, { status: 403 }) };
  return { user };
}

/** Create a student login linked to the signed-in parent. */
export async function POST(request) {
  const { user, error } = await requireParent();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const displayName = String(body.displayName || '').trim();
  const login = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!displayName) return NextResponse.json({ error: 'Enter your student\'s first name.' }, { status: 400 });
  if (!login.includes('@') && !USERNAME_RE.test(login))
    return NextResponse.json({ error: 'Usernames are 3–30 characters: letters, numbers, dots, dashes, or underscores.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Passwords need at least 6 characters.' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: loginEmail(login),
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createErr) {
    const msg = /already/i.test(createErr.message) ? 'That username is taken. Try another one.' : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profileErr } = await admin.from('profiles').upsert({
    id: created.user.id,
    role: 'student',
    display_name: displayName,
    username: login,
    parent_id: user.id,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: `Couldn't save the profile: ${profileErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Change a student's password. */
export async function PATCH(request) {
  const { user, error } = await requireParent();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId || '');
  const password = String(body.password || '');
  if (password.length < 6) return NextResponse.json({ error: 'Passwords need at least 6 characters.' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: student } = await admin.from('profiles').select('parent_id').eq('id', studentId).single();
  if (!student || student.parent_id !== user.id)
    return NextResponse.json({ error: 'That student isn\'t linked to your account.' }, { status: 403 });

  const { error: updErr } = await admin.auth.admin.updateUserById(studentId, { password });
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
