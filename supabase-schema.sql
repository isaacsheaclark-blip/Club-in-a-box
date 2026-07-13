-- Club in a Box — persistence schema
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor).

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists module_status (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  module_id text not null,
  status text not null default 'not_started',
  updated_at timestamptz not null default now(),
  unique (submission_id, module_id)
);

alter table submissions enable row level security;
alter table module_status enable row level security;

-- There's no user login yet (see README — "What NOT to build yet"), so the app
-- talks to Supabase directly from the browser with the anon key. Access is scoped
-- by knowing a submission's UUID rather than by a logged-in user. That's an
-- acceptable trade-off for this stage; revisit if/when real accounts land.
create policy "anon can insert submissions" on submissions
  for insert to anon with check (true);

create policy "anon can read submissions" on submissions
  for select to anon using (true);

create policy "anon can manage module_status" on module_status
  for all to anon using (true) with check (true);
