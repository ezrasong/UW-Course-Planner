create table if not exists public.user_program_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_program_plans enable row level security;

create policy if not exists "Users can view own program plan"
  on public.user_program_plans
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own program plan"
  on public.user_program_plans
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own program plan"
  on public.user_program_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
