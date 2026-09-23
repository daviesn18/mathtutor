export const APP_NAME = 'Algebra 2 Coach';

// Student logins use a username. Behind the scenes Supabase needs an email,
// so "jake" becomes "jake@students.invalid". This address never receives mail.
export const STUDENT_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'students.invalid';

/** "jake" → "jake@students.invalid"; anything with an @ is used as-is. */
export const loginEmail = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${STUDENT_EMAIL_DOMAIN}`;
};
