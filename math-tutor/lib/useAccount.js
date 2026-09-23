'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from './supabase/client';

/** Loads the signed-in user's profile. */
export function useAccount() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setState({ loading: false, user: null, profile: null, error: null });
        return;
      }
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (alive) setState({ loading: false, user, profile, error: error?.message || null });
    })();
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export async function loadAttempts(userIds, { topic, limit = 1000 } = {}) {
  let q = getSupabase()
    .from('attempts')
    .select('id, user_id, topic, skill, correct, first_try, hints_used, prompt, given_answer, correct_answer, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (topic) q = q.eq('topic', topic);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function saveAttempt(userId, row) {
  const { data, error } = await getSupabase()
    .from('attempts')
    .insert({ ...row, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
