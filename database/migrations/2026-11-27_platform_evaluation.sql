-- =============================================================================
-- Platform evaluation (Objective 1) — run once in the Supabase SQL editor.
--
-- 1) platform_reviews: replace the old 3-question form with 5 single-topic
--    questions (1–5). Questions that do not apply to a role are stored as NULL.
-- 2) task_events: one row per user per step, with start and finish time,
--    used for task completion rate and time on task.
-- =============================================================================

-- 1) platform_reviews ---------------------------------------------------------
alter table public.platform_reviews
  add column if not exists role                 text     check (role in ('caregiver', 'family')),
  add column if not exists profile_clarity      smallint check (profile_clarity      between 1 and 5),
  add column if not exists summary_accuracy     smallint check (summary_accuracy     between 1 and 5),
  add column if not exists tag_usefulness       smallint check (tag_usefulness       between 1 and 5),
  add column if not exists overall_satisfaction smallint check (overall_satisfaction between 1 and 5);

-- old columns are kept for existing rows but are no longer required
alter table public.platform_reviews alter column ui_design          drop not null;
alter table public.platform_reviews alter column ai_summary_quality drop not null;

comment on column public.platform_reviews.ease_of_use          is 'Q1 ease of use (both roles)';
comment on column public.platform_reviews.profile_clarity      is 'Q2 AI profile text is clear (both roles)';
comment on column public.platform_reviews.summary_accuracy     is 'Q3 fit summary matches real data (family only)';
comment on column public.platform_reviews.tag_usefulness       is 'Q4 suggested tags are useful (family only)';
comment on column public.platform_reviews.overall_satisfaction is 'Q5 overall satisfaction, target mean >= 4 (both roles)';
comment on column public.platform_reviews.comment              is 'Open answer: where was it confusing or hard to use?';

grant insert (role, profile_clarity, summary_accuracy, tag_usefulness, overall_satisfaction)
  on public.platform_reviews to authenticated;
grant update (role, profile_clarity, summary_accuracy, tag_usefulness, overall_satisfaction)
  on public.platform_reviews to authenticated;

-- 2) task_events --------------------------------------------------------------
create table if not exists public.task_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null check (role in ('caregiver', 'family')),
  step          text not null check (step in ('signup', 'onboarding_form', 'post_job')),
  started_at    timestamptz,                    -- null if the start was not captured
  completed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (user_id, step)                        -- only the first completion counts
);

alter table public.task_events enable row level security;

grant select, insert on public.task_events to authenticated;

drop policy if exists "task_events: insert own" on public.task_events;
create policy "task_events: insert own"
on public.task_events for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "task_events: read own" on public.task_events;
create policy "task_events: read own"
on public.task_events for select to authenticated
using (user_id = auth.uid());

-- backend (service_role) reads task_events for /admin/eval-stats; schema.sql revokes defaults
grant all on public.task_events to service_role;
