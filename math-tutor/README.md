# Algebra 2 Coach

A tutoring web app for Algebra 2. Each topic has a short lesson and unlimited
practice problems generated on the fly. When your student misses a problem:

1. **First wrong answer:** feedback aimed at the specific mistake (for example,
   "(−3)² turned into −9") plus a hint, and another try.
2. **Second wrong answer:** the full worked solution, a re-teach of the idea
   (with a marked-up graph where it helps), and a button for a similar problem.

Practice in "Mixed" mode leans toward the skills they miss most. Every
problem is saved, and the parent dashboard shows progress by topic and skill,
plus recent misses with what they typed versus the correct answer.

**Current topics**

- Is it a function? (pairs, tables, mapping diagrams, vertical line test, equations)
- Evaluating functions (substitution, graphs, tables, f(x) = k, composition)
- Domain, range, intercepts, average rate of change
- Extrema and intervals (relative max/min, increasing/decreasing, positive/negative)

Stack: Next.js 15 (App Router, plain JavaScript) + Supabase (login and Postgres)
on Vercel. No AI API, so there's no per-problem cost. Supabase and Vercel free
tiers cover a family easily.

---

## Setup (about 15 minutes)

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a project, and wait for it to finish provisioning.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**.
3. Go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email".
   This is a private family app, so skipping confirmation keeps signup simple.
   (If you'd rather keep it on, set **Authentication → URL Configuration → Site URL** to your Vercel URL and add
   `https://YOUR-APP.vercel.app/auth/callback` under Redirect URLs.)
4. From **Project Settings → API**, copy the Project URL, the anon/publishable key, and the service_role/secret key.

### 2. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New → Project**, import the repo. Framework preset: Next.js (auto-detected).
3. Add these environment variables before deploying (see `.env.example`):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon or publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role or secret key (server only) |

   Alternative: install the Supabase integration from the Vercel Marketplace, which sets these for you.
4. Deploy.

### 3. Create the accounts

1. Open your Vercel URL and click **Create a parent account**.
2. On the Progress page, fill in **Add a student login**: his first name, a username, and a password.
3. He signs in with just the username and password. You can change his password from your dashboard.

### Run locally (optional)

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
npm test                     # generates 7,500 problems and checks every answer key
```

---

## Adding a new topic

Every topic is one file in `lib/topics/`. To add one (say, "Transformations"):

1. Copy an existing topic file, such as `lib/topics/function-notation.js`, to `lib/topics/transformations.js`.
2. Change `id`, `title`, and `summary`. The `id` becomes the URL: `/learn/transformations`.
3. Write the `lesson` sections and the `skills`. Each skill is `{ id, name, generate }`.
4. Import it in `lib/topics/index.js` and add it to the `TOPICS` array.
5. Run `npm test` to check the new generators.

Progress for existing topics is untouched. Old attempts stay linked to their topic and skill ids, so don't rename ids that are already in use.

### What a generator returns

```js
{
  prompt: 'Evaluate f(−3).',                // the question
  math: 'f(x) = 2x² − 5x + 1',              // optional, shown large in a math font
  visual: { type: 'graph', ... },           // optional: 'graph' | 'mapping' | 'table'
  answer: numberAnswer(34),                 // see lib/topics/shared.js
  inputKind: 'number',                      // 'number' | 'interval' | 'points' (choice needs none)
  hints: ['...', '...'],                    // revealed one at a time
  solution: ['step 1', 'step 2', ...],      // worked steps for this exact problem
  reteach: { title, text: [...], visual?, caption? },  // shown after a second miss
  diagnose: (raw, parsed) => 'message' | null,         // optional: spot a specific mistake
}
```

Answer helpers in `lib/topics/shared.js`: `choiceAnswer`, `numberAnswer`,
`fracAnswer` (accepts 3/2 or 1.5), `intervalAnswer`, `pointsAnswer`.
Graph builders in `lib/math/curves.js` create random graphs whose turning
points, zeros, and endpoints all land on whole numbers.

In lesson text, wrap a key idea in `**double asterisks**` to show it highlighted.

---

## Notes and conventions

- **Interval endpoints.** Increasing/decreasing and positive/negative intervals use parentheses at turning points and zeros, which is the most common Algebra 2 convention. If his class uses brackets at turning points, change `openIv` to closed intervals in `lib/math/curves.js` (`randomSmoothGraph`).
- **Accepted input.** Typing `inf`, `-inf`, `U`, `none`, and `all reals` works, as do fractions like `-3/4`. The symbol buttons under the answer box insert ∞, ∪, and brackets on phones. A notation typo doesn't count as a wrong try; the app explains the format instead.
- **Mastery.** A skill is mastered at 80% or better first-try accuracy over its last 10 problems (at least 5). Answers that needed a hint count as correct but not first-try. Change the numbers at the top of `lib/progress.js`.
- **Student usernames.** Supabase needs an email for every login, so the username `jake` is stored as `jake@students.invalid`, an address that can never receive mail. If Supabase rejects that domain when you create a student, set `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN` to a domain you own and redeploy, or type a real email in the username box.
- **Security.** Row level security means a student can only read and write his own attempts, and a parent can only read their own students. The service role key is used only in `app/api/students/route.js`, on the server.

## Project map

```
app/
  learn/            topic list and lesson/practice page (student)
  parent/           progress dashboard and student logins (parent)
  api/students/     creates student logins, resets passwords (server)
  login/ signup/    auth pages
components/         Graph (SVG), Practice (problem flow), Lesson, etc.
lib/
  topics/           one file per topic: lessons + problem generators
  math/             parsing answers, formatting, random graphs
  progress.js       mastery and adaptive skill selection
supabase/schema.sql tables, security policies, new-user trigger
scripts/            npm test: generator self-check
```
