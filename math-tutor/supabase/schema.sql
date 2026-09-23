-- Algebra 2 Coach database setup.
-- Paste this whole file into Supabase: SQL Editor → New query → Run.
-- Safe to re-run.

-- ---------- Profiles ----------
-- One row per login. Parents sign up themselves; students are created by a parent.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'student')),
  display_name text not null default '',
  username text,
  parent_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists profiles_parent_idx on public.profiles (parent_id);

-- ---------- Attempts ----------
-- One row per finished practice problem.
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  skill text not null,
  correct boolean not null,        -- got it eventually (first try or after a hint)
  first_try boolean not null,      -- got it on the first try with no hints
  hints_used int not null default 0,
  prompt text,
  given_answer text,
  correct_answer text,
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_time_idx on public.attempts (user_id, created_at desc);

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;

-- Profiles: you can read your own row and your kids' rows. No client-side
-- inserts or updates: rows are created by the trigger below or by the server
-- route that creates student logins.
drop policy if exists "read own or children" on public.profiles;
create policy "read own or children" on public.profiles
  for select using (id = auth.uid() or parent_id = auth.uid());

-- Attempts: students write their own; parents can read their kids'.
drop policy if exists "insert own attempts" on public.attempts;
create policy "insert own attempts" on public.attempts
  for insert with check (user_id = auth.uid());

drop policy if exists "read own or children attempts" on public.attempts;
create policy "read own or children attempts" on public.attempts
  for select using (
    user_id = auth.uid()
    or user_id in (select id from public.profiles where parent_id = auth.uid())
  );

-- ---------- New-user trigger ----------
-- Anyone who signs up through the app gets a parent profile. The server
-- route immediately converts student logins into student profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'parent',
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
