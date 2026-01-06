-- Schema bootstrap for local development and CI
create table if not exists public.courses (
  course_id bigint not null,
  term_code text not null,
  subject text not null,
  catalog_number text not null,
  title text not null,
  description text,
  requirements_description text,
  grading_basis text,
  component_code text,
  enroll_consent_code text,
  enroll_consent_description text,
  drop_consent_code text,
  drop_consent_description text,
  is_required boolean default false,
  program_relevant boolean default false,
  updated_at timestamptz default timezone('utc', now()),
  primary key (course_id, term_code)
);

create table if not exists public.user_courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  term text not null default 'TBD',
  completed boolean not null default false,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now()),
  primary key (user_id, course_code)
);

create index if not exists user_courses_user_idx on public.user_courses (user_id);

-- Keep updated_at in sync on changes
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_courses_set_updated_at on public.user_courses;
create trigger user_courses_set_updated_at
before update on public.user_courses
for each row execute procedure public.touch_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute procedure public.touch_updated_at();

-- RLS
alter table public.courses enable row level security;
create policy if not exists "Courses are readable by all"
  on public.courses for select using (true);

alter table public.user_courses enable row level security;
create policy if not exists "Users manage their own plan"
  on public.user_courses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
