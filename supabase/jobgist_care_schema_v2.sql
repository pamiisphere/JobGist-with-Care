-- =====================================================================
--  JobGist with Care — Complete Database Schema v2 (single file)
--  Target: a NEW, empty Supabase project. Run top-to-bottom in SQL Editor.
--
--  Sections
--   1. Shared helpers & lookup vocabulary
--   2. Identity: profiles, contact_details
--   3. Caregiver side: caregiver_details, caregiver_case_skills, certificates
--   4. Family side: job_posts, job_post_case_needs
--   5. Matching: applications (status workflow)
--   6. AI & research: ai_logs, ai_worker_profiles, ai_applicant_summaries,
--                     eval_references, eval_metrics, eval_ratings
--   7. Post-matching loop: feedback_corrections, reviews, notifications
--   8. RLS helper functions
--   9. Triggers & business logic
--  10. Row Level Security policies + column privileges
--  11. Storage bucket (certificates)
--
--  Access model
--   - Frontend (anon key + user JWT): subject to RLS below.
--   - Backend FastAPI (service_role key): bypasses RLS → writes AI outputs,
--     ai_logs and eval data. Backend MUST verify the user's JWT itself.
--   - Roles: 'caregiver' | 'family'. Admin work = service_role / Dashboard.
-- =====================================================================


-- =====================================================================
-- 1. SHARED HELPERS & LOOKUP VOCABULARY
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- One shared vocabulary for care cases. Used by BOTH caregiver skills and
-- job needs, so matching compares like with like. Add rows, not migrations.
create table public.case_types (
  code        text primary key,
  label_th    text not null,
  sort_order  smallint not null default 0
);

insert into public.case_types (code, label_th, sort_order) values
  ('general_elderly',   'ดูแลผู้สูงอายุทั่วไป / เป็นเพื่อน',       1),
  ('mobility_assist',   'ช่วยพยุงเดิน / เคลื่อนย้าย',              2),
  ('bedridden',         'ผู้ป่วยติดเตียง',                          3),
  ('feeding_tube',      'ให้อาหารทางสายยาง',                       4),
  ('dementia',          'ภาวะสมองเสื่อม / อัลไซเมอร์',             5),
  ('stroke_rehab',      'ฟื้นฟูผู้ป่วยหลอดเลือดสมอง',              6),
  ('wound_care',        'ทำแผล / ดูแลแผลกดทับ',                    7),
  ('suction',           'ดูดเสมหะ',                                 8),
  ('urinary_catheter',  'ดูแลสายสวนปัสสาวะ',                       9),
  ('medication',        'จัดยา / ดูแลการทานยา',                    10),
  ('diabetes_care',     'ดูแลผู้ป่วยเบาหวาน / เจาะน้ำตาล',         11),
  ('palliative',        'ดูแลผู้ป่วยระยะท้าย',                     12);


-- =====================================================================
-- 2. IDENTITY
-- =====================================================================

-- profiles: NON-sensitive identity, readable by any signed-in user
-- (families need the caregiver's name; caregivers need the family's name).
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('caregiver', 'family')),
  display_name  text not null check (char_length(display_name) between 1 and 100),
  province      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- contact_details: PRIVATE. Owner-only; revealed to the other party only
-- through get_application_contact() once an application is accepted.
create table public.contact_details (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  phone         text,
  line_id       text,
  line_user_id  text,          -- set by backend after LINE Login linking (for LINE notifications)
  updated_at    timestamptz not null default now()
);


-- =====================================================================
-- 3. CAREGIVER SIDE  (raw input — never overwritten by AI)
-- =====================================================================

create table public.caregiver_details (
  caregiver_id        uuid primary key references public.profiles(id) on delete cascade,
  form_version        smallint not null default 1,
  gender              text check (gender in ('female', 'male', 'other', 'prefer_not_say')),
  birth_year          smallint check (birth_year between 1940 and 2010),
  care_roles          text[] not null default '{}'
                        check (care_roles <@ array['caregiver','nurse_aide','practical_nurse','informal']::text[]),
  years_experience    smallint check (years_experience between 0 and 60),
  work_arrangements   text[] not null default '{}'
                        check (work_arrangements <@ array['live_in','daily','hourly','night_shift']::text[]),
  service_provinces   text[] not null default '{}',
  expected_wage_min   integer check (expected_wage_min >= 0),
  expected_wage_max   integer check (expected_wage_max >= 0),
  wage_unit           text check (wage_unit in ('month', 'day', 'hour')),
  available_from      date,
  extra_answers       jsonb not null default '{}'::jsonb,   -- any other guided-form answers
  is_visible          boolean not null default false,       -- shown to families when true
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint caregiver_wage_range
    check (expected_wage_min is null or expected_wage_max is null
           or expected_wage_max >= expected_wage_min)
);

create table public.caregiver_case_skills (
  caregiver_id   uuid not null references public.caregiver_details(caregiver_id) on delete cascade,
  case_type      text not null references public.case_types(code),
  comfort_level  text not null
                   check (comfort_level in ('experienced', 'trained', 'willing_to_learn', 'not_comfortable')),
  primary key (caregiver_id, case_type)
);

create table public.certificates (
  id                   uuid primary key default gen_random_uuid(),
  caregiver_id         uuid not null references public.profiles(id) on delete cascade,
  cert_type            text not null check (cert_type in (
                         'nurse_aide', 'practical_nurse', 'caregiver_training',
                         'first_aid', 'other')),
  title                text not null,
  issuer               text,
  issued_date          date,
  file_path            text not null,   -- Storage path "<user_id>/<file>", NOT a public URL
  verification_status  text not null default 'pending'
                         check (verification_status in ('pending', 'verified', 'rejected')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index certificates_caregiver_idx on public.certificates (caregiver_id);


-- =====================================================================
-- 4. FAMILY SIDE  (raw input — plain Thai, never overwritten by AI)
-- =====================================================================

create table public.job_posts (
  id                          uuid primary key default gen_random_uuid(),
  family_id                   uuid not null references public.profiles(id) on delete cascade,
  title                       text not null check (char_length(title) between 1 and 150),
  patient_description         text not null,          -- plain Thai, LLM input
  patient_age                 smallint check (patient_age between 0 and 120),
  patient_gender              text check (patient_gender in ('female', 'male', 'other')),
  work_arrangement            text not null
                                check (work_arrangement in ('live_in', 'daily', 'hourly', 'night_shift')),
  province                    text not null,
  district                    text,
  start_date                  date,
  wage_min                    integer check (wage_min >= 0),
  wage_max                    integer check (wage_max >= 0),
  wage_unit                   text check (wage_unit in ('month', 'day', 'hour')),
  preferred_caregiver_gender  text not null default 'any'
                                check (preferred_caregiver_gender in ('any', 'female', 'male')),
  status                      text not null default 'draft'
                                check (status in ('draft', 'open', 'filled', 'closed', 'expired')),
  expires_at                  timestamptz not null default (now() + interval '30 days'),
  filled_at                   timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint job_wage_range
    check (wage_min is null or wage_max is null or wage_max >= wage_min)
);

create index job_posts_family_idx on public.job_posts (family_id);
create index job_posts_open_idx   on public.job_posts (status, province, expires_at);

create table public.job_post_case_needs (
  job_post_id  uuid not null references public.job_posts(id) on delete cascade,
  case_type    text not null references public.case_types(code),
  is_required  boolean not null default true,
  primary key (job_post_id, case_type)
);


-- =====================================================================
-- 5. MATCHING — applications
--    Status workflow (enforced by trigger validate_application_transition):
--      invited ─► applied ─► shortlisted ─► offered ─► accepted ─► completed
--         │          │            │            │           └──► cancelled
--         └► declined/rejected    └► rejected / withdrawn      declined / rejected
-- =====================================================================

create table public.applications (
  id                 uuid primary key default gen_random_uuid(),
  job_post_id        uuid not null references public.job_posts(id) on delete cascade,
  caregiver_id       uuid not null references public.caregiver_details(caregiver_id) on delete cascade,
  initiated_by       text not null check (initiated_by in ('caregiver', 'family')),
  status             text not null check (status in (
                       'invited', 'applied', 'shortlisted', 'offered', 'accepted',
                       'declined', 'withdrawn', 'rejected', 'completed', 'cancelled')),
  message            text check (char_length(message) <= 1000),
  status_updated_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (job_post_id, caregiver_id)
);

create index applications_caregiver_idx on public.applications (caregiver_id, status);
create index applications_job_idx       on public.applications (job_post_id, status);


-- =====================================================================
-- 6. AI & RESEARCH  (written ONLY by backend via service_role)
--    Principle: AI output lives in its own tables, with the exact input
--    snapshot it was generated from → fair, reproducible model comparison.
-- =====================================================================

create table public.ai_logs (
  id              uuid primary key default gen_random_uuid(),
  feature         text not null check (feature in (
                    'worker_profile', 'applicant_summary', 'fit_score', 'other')),
  provider        text not null check (provider in ('typhoon', 'openai')),
  model_name      text not null,
  prompt_version  text not null,
  input_tokens    integer check (input_tokens >= 0),
  output_tokens   integer check (output_tokens >= 0),
  cost_usd        numeric(12, 8) check (cost_usd >= 0),
  latency_ms      integer check (latency_ms >= 0),
  success         boolean not null default true,
  error_message   text,
  routing_reason  text,                      -- why the router chose this model
  is_eval_run     boolean not null default false,
  request_meta    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index ai_logs_analysis_idx on public.ai_logs (feature, model_name, created_at);

create table public.ai_worker_profiles (
  id              uuid primary key default gen_random_uuid(),
  caregiver_id    uuid not null references public.caregiver_details(caregiver_id) on delete cascade,
  provider        text not null check (provider in ('typhoon', 'openai')),
  model_name      text not null,
  prompt_version  text not null,
  input_snapshot  jsonb not null,            -- exact form data sent to the LLM
  input_hash      text not null,             -- hash(input_snapshot): detect stale profile
  output_text     text not null,
  is_active       boolean not null default false,   -- the version families see
  ai_log_id       uuid references public.ai_logs(id) on delete set null,
  created_at      timestamptz not null default now()
);

create unique index ai_worker_profiles_one_active
  on public.ai_worker_profiles (caregiver_id) where is_active;
create index ai_worker_profiles_hash_idx on public.ai_worker_profiles (input_hash);

create table public.ai_applicant_summaries (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  provider        text not null check (provider in ('typhoon', 'openai')),
  model_name      text not null,
  prompt_version  text not null,
  input_snapshot  jsonb not null,            -- job post + caregiver data sent to the LLM
  input_hash      text not null,
  summary_text    text not null,
  fit_score       numeric(5, 2) check (fit_score between 0 and 100),
  fit_rationale   text,
  is_active       boolean not null default false,
  ai_log_id       uuid references public.ai_logs(id) on delete set null,
  created_at      timestamptz not null default now()
);

create unique index ai_summaries_one_active
  on public.ai_applicant_summaries (application_id) where is_active;
create index ai_summaries_hash_idx on public.ai_applicant_summaries (input_hash);

-- Human-written gold references (for ROUGE / BERTScore)
create table public.eval_references (
  id              uuid primary key default gen_random_uuid(),
  target_type     text not null check (target_type in ('worker_profile', 'applicant_summary')),
  input_hash      text not null,             -- same input the models received
  reference_text  text not null,
  author_code     text not null,             -- anonymised writer id, e.g. 'R1'
  created_at      timestamptz not null default now()
);

create index eval_references_hash_idx on public.eval_references (target_type, input_hash);

-- Automatic metric results per AI output
create table public.eval_metrics (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null check (target_type in ('worker_profile', 'applicant_summary')),
  target_id     uuid not null,               -- ai_worker_profiles.id or ai_applicant_summaries.id
  reference_id  uuid references public.eval_references(id) on delete cascade,
  metric        text not null,               -- 'rouge1','rouge2','rougeL','bertscore_f1',...
  value         numeric(8, 5) not null,
  created_at    timestamptz not null default now(),
  unique (target_id, reference_id, metric)
);

-- Human ratings (for inter-rater agreement, e.g. Krippendorff's alpha / Cohen's kappa)
create table public.eval_ratings (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('worker_profile', 'applicant_summary')),
  target_id    uuid not null,
  rater_code   text not null,               -- anonymised rater id
  criterion    text not null check (criterion in ('fluency', 'accuracy', 'completeness', 'usefulness')),
  score        smallint not null check (score between 1 and 5),
  created_at   timestamptz not null default now(),
  unique (target_id, rater_code, criterion)
);


-- =====================================================================
-- 7. POST-MATCHING LOOP
-- =====================================================================

-- Users correct / rate AI output. APPEND-ONLY for research integrity.
create table public.feedback_corrections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  target_type     text not null check (target_type in (
                    'worker_profile', 'applicant_summary', 'fit_rationale')),
  target_id       uuid not null,
  original_text   text not null,
  corrected_text  text,
  rating          smallint check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now(),
  constraint feedback_has_content
    check (corrected_text is not null or rating is not null or comment is not null)
);

create index feedback_target_idx on public.feedback_corrections (target_type, target_id);

-- Reviews after a job is completed (both directions)
create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  reviewer_id     uuid not null references public.profiles(id) on delete cascade,
  reviewee_id     uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text check (char_length(comment) <= 1000),
  created_at      timestamptz not null default now(),
  unique (application_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index reviews_reviewee_idx on public.reviews (reviewee_id);

-- In-app notifications; backend reads rows with line_sent_at IS NULL to push via LINE
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in (
                    'application_received', 'invited', 'status_changed',
                    'job_expiring', 'review_received', 'system')),
  title           text not null,
  body            text,
  application_id  uuid references public.applications(id) on delete cascade,
  job_post_id     uuid references public.job_posts(id) on delete cascade,
  read_at         timestamptz,
  line_sent_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);


-- =====================================================================
-- 8. RLS HELPER FUNCTIONS
--    SECURITY DEFINER = run as owner, bypassing RLS inside the function.
--    This prevents "infinite recursion detected in policy" when policies
--    on job_posts and applications need to look at each other.
-- =====================================================================

create or replace function public.get_my_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.owns_job_post(p_job_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.job_posts
    where id = p_job_post_id and family_id = (select auth.uid())
  );
$$;

create or replace function public.has_applied_to_job(p_job_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.applications
    where job_post_id = p_job_post_id and caregiver_id = (select auth.uid())
  );
$$;

-- Does the current family have this caregiver in any of their job's applications?
create or replace function public.family_has_applicant(p_caregiver_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    join public.job_posts j on j.id = a.job_post_id
    where a.caregiver_id = p_caregiver_id
      and j.family_id = (select auth.uid())
  );
$$;

-- Self, or a family viewing a visible caregiver / one linked to their job
create or replace function public.can_view_caregiver(p_caregiver_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    p_caregiver_id = (select auth.uid())
    or (
      (select role from public.profiles where id = (select auth.uid())) = 'family'
      and (
        exists (select 1 from public.caregiver_details
                where caregiver_id = p_caregiver_id and is_visible)
        or public.family_has_applicant(p_caregiver_id)
      )
    );
$$;

create or replace function public.owns_application_job(p_application_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    join public.job_posts j on j.id = a.job_post_id
    where a.id = p_application_id and j.family_id = (select auth.uid())
  );
$$;

-- Reviewer must be a party of a COMPLETED application; reviewee = the other party
create or replace function public.can_review(p_application_id uuid, p_reviewee_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    join public.job_posts j on j.id = a.job_post_id
    where a.id = p_application_id
      and a.status = 'completed'
      and (
        ((select auth.uid()) = a.caregiver_id and p_reviewee_id = j.family_id)
        or ((select auth.uid()) = j.family_id and p_reviewee_id = a.caregiver_id)
      )
  );
$$;


-- =====================================================================
-- 9. TRIGGERS & BUSINESS LOGIC
-- =====================================================================

-- 9.1 updated_at on every mutable table
create trigger profiles_set_updated_at          before update on public.profiles          for each row execute function public.set_updated_at();
create trigger contact_details_set_updated_at   before update on public.contact_details   for each row execute function public.set_updated_at();
create trigger caregiver_details_set_updated_at before update on public.caregiver_details for each row execute function public.set_updated_at();
create trigger certificates_set_updated_at      before update on public.certificates      for each row execute function public.set_updated_at();
create trigger job_posts_set_updated_at         before update on public.job_posts         for each row execute function public.set_updated_at();
create trigger applications_set_updated_at      before update on public.applications      for each row execute function public.set_updated_at();


-- 9.2 Signup → create profiles + contact_details
-- Frontend: supabase.auth.signUp({ email, password,
--   options: { data: { role: 'caregiver'|'family', display_name, phone } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  if requested_role is null or requested_role not in ('caregiver', 'family') then
    raise exception 'Invalid or missing role at signup: %', requested_role;
  end if;

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    requested_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'ผู้ใช้ใหม่')
  );

  insert into public.contact_details (user_id, phone)
  values (new.id, new.raw_user_meta_data ->> 'phone');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- 9.3 Application status workflow — who may move which status where
create or replace function public.validate_application_transition()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  actor text;
begin
  if new.status = old.status then
    return new;
  end if;

  new.status_updated_at := now();

  -- service_role / Dashboard / internal cascade from on_application_accepted()
  if uid is null or coalesce(current_setting('app.system_update', true), '') = 'on' then
    return new;
  end if;

  if uid = old.caregiver_id then
    actor := 'caregiver';
  elsif exists (select 1 from public.job_posts j
                where j.id = old.job_post_id and j.family_id = uid) then
    actor := 'family';
  else
    raise exception 'Not a party to this application';
  end if;

  if (old.status, new.status, actor) not in (
      ('invited',     'applied',     'caregiver'),
      ('invited',     'declined',    'caregiver'),
      ('invited',     'rejected',    'family'),
      ('applied',     'shortlisted', 'family'),
      ('applied',     'offered',     'family'),
      ('applied',     'rejected',    'family'),
      ('applied',     'withdrawn',   'caregiver'),
      ('shortlisted', 'offered',     'family'),
      ('shortlisted', 'rejected',    'family'),
      ('shortlisted', 'withdrawn',   'caregiver'),
      ('offered',     'accepted',    'caregiver'),
      ('offered',     'declined',    'caregiver'),
      ('offered',     'rejected',    'family'),
      ('accepted',    'completed',   'family'),
      ('accepted',    'cancelled',   'family'),
      ('accepted',    'cancelled',   'caregiver')
  ) then
    raise exception 'Transition % -> % is not allowed for %', old.status, new.status, actor;
  end if;

  return new;
end;
$$;

create trigger applications_validate_transition
before update of status on public.applications
for each row execute function public.validate_application_transition();


-- 9.4 Caregiver accepts → job becomes 'filled', other open applications rejected
create or replace function public.on_application_accepted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    perform set_config('app.system_update', 'on', true);

    update public.job_posts
       set status = 'filled', filled_at = now()
     where id = new.job_post_id;

    update public.applications
       set status = 'rejected'
     where job_post_id = new.job_post_id
       and id <> new.id
       and status in ('invited', 'applied', 'shortlisted', 'offered');

    perform set_config('app.system_update', 'off', true);
  end if;
  return null;
end;
$$;

create trigger applications_after_accept
after update of status on public.applications
for each row execute function public.on_application_accepted();


-- 9.5 Notifications for every new application / status change
create or replace function public.notify_application_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_family_id  uuid;
  v_job_title  text;
  v_label      text;
begin
  select family_id, title into v_family_id, v_job_title
  from public.job_posts where id = new.job_post_id;

  v_label := case new.status
    when 'invited'     then 'ได้รับคำเชิญให้สมัครงาน'
    when 'applied'     then 'มีผู้สมัครงาน'
    when 'shortlisted' then 'ผ่านการคัดเลือกเบื้องต้น'
    when 'offered'     then 'ได้รับข้อเสนองาน'
    when 'accepted'    then 'ตอบรับงานแล้ว'
    when 'declined'    then 'ปฏิเสธ'
    when 'withdrawn'   then 'ถอนใบสมัคร'
    when 'rejected'    then 'ไม่ได้รับการคัดเลือก'
    when 'completed'   then 'งานเสร็จสิ้น'
    when 'cancelled'   then 'ยกเลิกงาน'
  end;

  if tg_op = 'INSERT' then
    if new.status = 'applied' then
      insert into public.notifications (user_id, type, title, body, application_id, job_post_id)
      values (v_family_id, 'application_received', 'มีผู้สมัครงานใหม่',
              format('มีผู้สมัครงาน "%s"', v_job_title), new.id, new.job_post_id);
    elsif new.status = 'invited' then
      insert into public.notifications (user_id, type, title, body, application_id, job_post_id)
      values (new.caregiver_id, 'invited', 'คุณได้รับคำเชิญให้สมัครงาน',
              format('ครอบครัวเชิญคุณสมัครงาน "%s"', v_job_title), new.id, new.job_post_id);
    end if;
    return null;
  end if;

  if new.status = old.status then
    return null;
  end if;

  -- notify the caregiver about family-side decisions
  if new.status in ('shortlisted', 'offered', 'rejected', 'completed', 'cancelled') then
    insert into public.notifications (user_id, type, title, body, application_id, job_post_id)
    values (new.caregiver_id, 'status_changed', v_label,
            format('งาน "%s": %s', v_job_title, v_label), new.id, new.job_post_id);
  end if;

  -- notify the family about caregiver-side decisions
  if new.status in ('applied', 'accepted', 'declined', 'withdrawn', 'cancelled') then
    insert into public.notifications (user_id, type, title, body, application_id, job_post_id)
    values (v_family_id, 'status_changed', v_label,
            format('งาน "%s": %s', v_job_title, v_label), new.id, new.job_post_id);
  end if;

  return null;
end;
$$;

create trigger applications_notify
after insert or update of status on public.applications
for each row execute function public.notify_application_event();


-- 9.6 Notify the reviewee when a review arrives
create or replace function public.notify_review()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, application_id)
  values (new.reviewee_id, 'review_received', 'คุณได้รับรีวิวใหม่',
          format('คะแนน %s/5', new.rating), new.application_id);
  return null;
end;
$$;

create trigger reviews_notify
after insert on public.reviews
for each row execute function public.notify_review();


-- 9.7 Contact reveal: only after acceptance, only to the two parties
-- Frontend: supabase.rpc('get_application_contact', { p_application_id })
create or replace function public.get_application_contact(p_application_id uuid)
returns table (user_id uuid, display_name text, phone text, line_id text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.display_name, c.phone, c.line_id
  from public.applications a
  join public.job_posts j        on j.id = a.job_post_id
  join public.profiles p         on p.id = case when (select auth.uid()) = a.caregiver_id
                                                then j.family_id else a.caregiver_id end
  join public.contact_details c  on c.user_id = p.id
  where a.id = p_application_id
    and a.status in ('accepted', 'completed')
    and (select auth.uid()) in (a.caregiver_id, j.family_id);
$$;

revoke execute on function public.get_application_contact(uuid) from public, anon;
grant  execute on function public.get_application_contact(uuid) to authenticated;


-- 9.8 Job post lifecycle: expire old open posts (+ reminder 3 days before)
create or replace function public.run_job_post_maintenance()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  -- reminder, once per post
  insert into public.notifications (user_id, type, title, body, job_post_id)
  select j.family_id, 'job_expiring', 'ประกาศงานใกล้หมดอายุ',
         format('ประกาศ "%s" จะหมดอายุใน 3 วัน', j.title), j.id
  from public.job_posts j
  where j.status = 'open'
    and j.expires_at between now() and now() + interval '3 days'
    and not exists (select 1 from public.notifications n
                    where n.job_post_id = j.id and n.type = 'job_expiring');

  update public.job_posts
     set status = 'expired'
   where status = 'open' and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.run_job_post_maintenance() from public, anon, authenticated;

-- To run hourly: Dashboard → Integrations → Cron (enables pg_cron), then:
-- select cron.schedule('job-post-maintenance', '0 * * * *',
--                      $$ select public.run_job_post_maintenance(); $$);

-- Trigger functions must not be callable via RPC
revoke execute on function public.handle_new_user()                  from public, anon, authenticated;
revoke execute on function public.validate_application_transition()  from public, anon, authenticated;
revoke execute on function public.on_application_accepted()          from public, anon, authenticated;
revoke execute on function public.notify_application_event()         from public, anon, authenticated;
revoke execute on function public.notify_review()                    from public, anon, authenticated;


-- =====================================================================
-- 10. ROW LEVEL SECURITY
--     RLS controls ROWS. Column privileges (revoke/grant update(...))
--     control which COLUMNS a user may change.
-- =====================================================================

alter table public.case_types             enable row level security;
alter table public.profiles               enable row level security;
alter table public.contact_details        enable row level security;
alter table public.caregiver_details      enable row level security;
alter table public.caregiver_case_skills  enable row level security;
alter table public.certificates           enable row level security;
alter table public.job_posts              enable row level security;
alter table public.job_post_case_needs    enable row level security;
alter table public.applications           enable row level security;
alter table public.ai_logs                enable row level security;   -- no policies: service_role only
alter table public.ai_worker_profiles     enable row level security;
alter table public.ai_applicant_summaries enable row level security;
alter table public.eval_references        enable row level security;   -- no policies: service_role only
alter table public.eval_metrics           enable row level security;   -- no policies: service_role only
alter table public.eval_ratings           enable row level security;   -- no policies: service_role only
alter table public.feedback_corrections   enable row level security;
alter table public.reviews                enable row level security;
alter table public.notifications          enable row level security;


-- case_types: public vocabulary
create policy "case_types: anyone reads"
on public.case_types for select to anon, authenticated using (true);


-- profiles
create policy "profiles: signed-in users read"
on public.profiles for select to authenticated using (true);

create policy "profiles: update own"
on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant  update (display_name, province) on public.profiles to authenticated;


-- contact_details (private)
create policy "contact: read own"
on public.contact_details for select to authenticated
using (user_id = (select auth.uid()));

create policy "contact: update own"
on public.contact_details for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.contact_details from anon, authenticated;
grant  update (phone, line_id) on public.contact_details to authenticated;


-- caregiver_details
create policy "caregiver_details: visible to self & families"
on public.caregiver_details for select to authenticated
using (public.can_view_caregiver(caregiver_id));

create policy "caregiver_details: caregiver creates own"
on public.caregiver_details for insert to authenticated
with check (caregiver_id = (select auth.uid()) and (select public.get_my_role()) = 'caregiver');

create policy "caregiver_details: caregiver updates own"
on public.caregiver_details for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));


-- caregiver_case_skills
create policy "skills: visible to self & families"
on public.caregiver_case_skills for select to authenticated
using (public.can_view_caregiver(caregiver_id));

create policy "skills: caregiver inserts own"
on public.caregiver_case_skills for insert to authenticated
with check (caregiver_id = (select auth.uid()));

create policy "skills: caregiver updates own"
on public.caregiver_case_skills for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));

create policy "skills: caregiver deletes own"
on public.caregiver_case_skills for delete to authenticated
using (caregiver_id = (select auth.uid()));


-- certificates (families see them only for caregivers linked to their jobs)
create policy "certificates: owner or linked family reads"
on public.certificates for select to authenticated
using (caregiver_id = (select auth.uid()) or public.family_has_applicant(caregiver_id));

create policy "certificates: caregiver inserts own"
on public.certificates for insert to authenticated
with check (caregiver_id = (select auth.uid()) and (select public.get_my_role()) = 'caregiver');

create policy "certificates: caregiver updates own"
on public.certificates for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));

create policy "certificates: caregiver deletes own"
on public.certificates for delete to authenticated
using (caregiver_id = (select auth.uid()));

revoke update on public.certificates from anon, authenticated;   -- no self-verification
grant  update (cert_type, title, issuer, issued_date, file_path) on public.certificates to authenticated;


-- job_posts
create policy "job_posts: owner, caregivers (open), or applicants read"
on public.job_posts for select to authenticated
using (
  family_id = (select auth.uid())
  or (status = 'open' and expires_at > now() and (select public.get_my_role()) = 'caregiver')
  or public.has_applied_to_job(id)
);

create policy "job_posts: family creates own"
on public.job_posts for insert to authenticated
with check (family_id = (select auth.uid()) and (select public.get_my_role()) = 'family');

create policy "job_posts: family updates own"
on public.job_posts for update to authenticated
using (family_id = (select auth.uid())) with check (family_id = (select auth.uid()));

create policy "job_posts: family deletes own drafts"
on public.job_posts for delete to authenticated
using (family_id = (select auth.uid()) and status = 'draft');

revoke update on public.job_posts from anon, authenticated;
grant  update (title, patient_description, patient_age, patient_gender, work_arrangement,
               province, district, start_date, wage_min, wage_max, wage_unit,
               preferred_caregiver_gender, status, expires_at)
  on public.job_posts to authenticated;


-- job_post_case_needs (readable whenever the job post itself is readable)
create policy "needs: readable with job post"
on public.job_post_case_needs for select to authenticated
using (exists (select 1 from public.job_posts j where j.id = job_post_id));

create policy "needs: owner inserts"
on public.job_post_case_needs for insert to authenticated
with check (public.owns_job_post(job_post_id));

create policy "needs: owner updates"
on public.job_post_case_needs for update to authenticated
using (public.owns_job_post(job_post_id)) with check (public.owns_job_post(job_post_id));

create policy "needs: owner deletes"
on public.job_post_case_needs for delete to authenticated
using (public.owns_job_post(job_post_id));


-- applications
create policy "applications: parties read"
on public.applications for select to authenticated
using (caregiver_id = (select auth.uid()) or public.owns_job_post(job_post_id));

create policy "applications: caregiver applies / family invites"
on public.applications for insert to authenticated
with check (
  exists (select 1 from public.job_posts j
          where j.id = job_post_id and j.status = 'open' and j.expires_at > now())
  and (
    (caregiver_id = (select auth.uid())
       and (select public.get_my_role()) = 'caregiver'
       and initiated_by = 'caregiver' and status = 'applied')
    or
    (public.owns_job_post(job_post_id)
       and initiated_by = 'family' and status = 'invited')
  )
);

create policy "applications: parties update (workflow enforced by trigger)"
on public.applications for update to authenticated
using (caregiver_id = (select auth.uid()) or public.owns_job_post(job_post_id))
with check (caregiver_id = (select auth.uid()) or public.owns_job_post(job_post_id));

revoke update, delete on public.applications from anon, authenticated;
grant  update (status) on public.applications to authenticated;


-- AI outputs: read-only for users, only the ACTIVE version
create policy "ai_worker_profiles: active, visible caregiver"
on public.ai_worker_profiles for select to authenticated
using (is_active and public.can_view_caregiver(caregiver_id));

create policy "ai_summaries: active, job owner only"
on public.ai_applicant_summaries for select to authenticated
using (is_active and public.owns_application_job(application_id));


-- feedback_corrections: append-only
create policy "feedback: insert own"
on public.feedback_corrections for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "feedback: read own"
on public.feedback_corrections for select to authenticated
using (user_id = (select auth.uid()));


-- reviews: public to signed-in users; write once, after completion
create policy "reviews: signed-in users read"
on public.reviews for select to authenticated using (true);

create policy "reviews: party of completed job writes"
on public.reviews for insert to authenticated
with check (reviewer_id = (select auth.uid()) and public.can_review(application_id, reviewee_id));


-- notifications: own only; may only mark as read
create policy "notifications: read own"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "notifications: mark own as read"
on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.notifications from anon, authenticated;
grant  update (read_at) on public.notifications to authenticated;


-- =====================================================================
-- 11. STORAGE — private certificate files
--     Upload path: "<auth.uid()>/<uuid>.<ext>"  (bucket: certificates)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "cert files: owner or linked family reads"
on storage.objects for select to authenticated
using (
  bucket_id = 'certificates'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.family_has_applicant(((storage.foldername(name))[1])::uuid)
  )
);

create policy "cert files: owner uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cert files: owner deletes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- =====================================================================
-- END
-- =====================================================================
