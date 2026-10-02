-- =====================================================================
--  JobGist with Care — ฐานข้อมูลทั้งหมด (ไฟล์เดียวจบ)
--  Supabase (PostgreSQL)
--
--  วิธีใช้: วางทั้งไฟล์ใน Supabase → SQL Editor → Run ครั้งเดียว
--  รันซ้ำได้ เพราะส่วนที่ 0 ล้างของเก่าก่อนทุกครั้ง
--  ⚠ ข้อมูลในตารางทั้งหมดจะหายทุกครั้งที่รัน (หลังมีข้อมูลจริง ห้ามรันซ้ำ)
--
--  สารบัญ (เลขเดียวกับหัวข้อในคู่มือ)
--   0. ล้างของเก่า                    Reset
--   1. ฟังก์ชันพื้นฐาน + คำศัพท์กลาง      Helpers & case types
--   2. ตัวตนผู้ใช้                      profiles, contact_details
--   3. ฝั่งผู้ดูแล                       caregiver_*
--   4. ฝั่งครอบครัว                     job_post_*
--   5. การจับคู่ (swipe)                matches, favorites
--   6. AI และงานวิจัย                  ai_*, eval_*
--   7. หลังจับคู่                       feedback, platform review, notifications
--   8. ฟังก์ชันเช็คสิทธิ์                 RLS helpers
--   9. สิ่งที่ฐานข้อมูลทำให้อัตโนมัติ        Triggers
--  10. ฟังก์ชันดึงการ์ด                  Card feeds (หน้า swipe เรียกใช้)
--  11. สรุปผลวิจัย                      eval_model_summary view
--  12. สิทธิ์ใครเห็นอะไร                 RLS policies + grants
--  13. ที่เก็บไฟล์                       Storage buckets
--
--  ใครเข้าถึงได้
--   - Frontend (anon key + JWT ของผู้ใช้) → ถูกจำกัดด้วย RLS ทุกครั้ง
--   - Backend FastAPI (service_role key) → ข้าม RLS ได้ ใช้เขียนผล AI,
--     ai_logs และข้อมูลวิจัย ต้องตรวจ JWT ของผู้ใช้เองทุกครั้ง
--   - ผู้ใช้มี 2 role: 'caregiver' | 'family' (ไม่มี admin; งาน admin ทำผ่าน Dashboard)
--   - ที่อยู่และพิกัดเป็นความลับ คนอื่นเห็นแค่จังหวัด เขต และระยะทาง (กม.)
-- =====================================================================


-- =====================================================================
-- 0. ล้างของเก่า (RESET)
--    ลบ policy, trigger, view, ตาราง และฟังก์ชันเดิมทั้งหมด
--    (รวมชื่อจากไฟล์รุ่นก่อน เช่น applications, reviews) เพื่อให้รันซ้ำได้
-- =====================================================================

drop policy if exists "cert files: owner or linked family reads" on storage.objects;
drop policy if exists "cert files: owner or viewer reads"        on storage.objects;
drop policy if exists "cert files: owner uploads"                on storage.objects;
drop policy if exists "cert files: owner deletes"                on storage.objects;
drop policy if exists "job photos: owner or viewer reads"        on storage.objects;
drop policy if exists "job photos: owner uploads"                on storage.objects;
drop policy if exists "job photos: owner deletes"                on storage.objects;

drop trigger if exists on_auth_user_created on auth.users;

drop view if exists public.eval_model_summary;

drop table if exists
  public.notifications, public.reviews, public.platform_reviews,
  public.feedback_corrections, public.eval_qualifications, public.eval_ratings,
  public.eval_metrics, public.eval_references, public.ai_applicant_summaries,
  public.ai_worker_profiles, public.ai_logs, public.eval_inputs,
  public.favorites, public.matches, public.applications,
  public.job_post_photos, public.job_post_locations, public.job_post_case_needs,
  public.job_posts, public.certificates, public.caregiver_case_skills,
  public.caregiver_locations, public.caregiver_details, public.contact_details,
  public.profiles, public.case_types
cascade;

drop function if exists
  public.set_updated_at(),
  public.distance_km(double precision, double precision, double precision, double precision),
  public.try_uuid(text),
  public.get_my_role(),
  public.owns_job_post(uuid),
  public.is_job_open(uuid),
  public.can_view_job_post(uuid),
  public.has_applied_to_job(uuid),
  public.family_has_applicant(uuid),
  public.family_has_match_with(uuid),
  public.can_view_caregiver(uuid),
  public.owns_application_job(uuid),
  public.can_review(uuid, uuid),
  public.handle_new_user(),
  public.job_posts_track_close(),
  public.validate_application_transition(),
  public.on_application_accepted(),
  public.notify_application_event(),
  public.notify_review(),
  public.matches_before_write(),
  public.matches_after_write(),
  public.get_application_contact(uuid),
  public.get_match_contact(uuid),
  public.run_job_post_maintenance(),
  public.candidate_caregivers(uuid, double precision, integer),
  public.job_feed_for_me(double precision, integer)
cascade;


-- =====================================================================
-- 1. ฟังก์ชันพื้นฐาน + คำศัพท์กลาง (HELPERS & CASE TYPES)
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Great-circle distance in km. Returns NULL if any coordinate is NULL.
create or replace function public.distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision)
returns double precision
language sql immutable strict set search_path = ''
as $$
  select 6371.0 * 2 * asin(least(1.0, sqrt(
           power(sin(radians(lat2 - lat1) / 2), 2)
         + cos(radians(lat1)) * cos(radians(lat2))
         * power(sin(radians(lng2 - lng1) / 2), 2))));
$$;

-- Safe text → uuid (NULL instead of an error). Used in storage policies.
create or replace function public.try_uuid(p text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- One shared vocabulary for care cases, used by BOTH caregiver skills and
-- job needs so matching compares like with like. Add rows, not migrations.
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
-- 2. ตัวตนผู้ใช้ (IDENTITY)
--    profiles = ข้อมูลทั่วไปที่คนอื่นเห็นได้, contact_details = เบอร์/LINE (ลับ)
-- =====================================================================

-- Non-sensitive identity, readable by any signed-in user.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('caregiver', 'family')),
  display_name  text not null check (char_length(display_name) between 1 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- PRIVATE. Owner-only; revealed to the other party only through
-- get_match_contact() after a mutual match.
create table public.contact_details (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  phone         text,
  line_id       text,
  line_user_id  text,          -- set by backend after LINE Login linking (for LINE notifications)
  updated_at    timestamptz not null default now()
);


-- =====================================================================
-- 3. ฝั่งผู้ดูแล (CAREGIVER) — ข้อมูลดิบที่ผู้ใช้กรอก AI ไม่เขียนทับ
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
                        check (work_arrangements <@ array['daily','live_in']::text[]),
  home_province       text,                 -- public: used for filters / card display
  home_district       text,                 -- public: e.g. 'วัฒนา', area filter
  max_travel_km       smallint check (max_travel_km between 1 and 500),
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

-- PRIVATE home location (owner-only). Others get distance in km via feed functions.
create table public.caregiver_locations (
  caregiver_id  uuid primary key references public.caregiver_details(caregiver_id) on delete cascade,
  address_text  text,
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  updated_at    timestamptz not null default now(),
  constraint caregiver_location_pair check ((lat is null) = (lng is null))
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
-- 4. ฝั่งครอบครัว (FAMILY) — ข้อมูลดิบที่ผู้ใช้กรอก AI ไม่เขียนทับ
-- =====================================================================

create table public.job_posts (
  id                          uuid primary key default gen_random_uuid(),
  family_id                   uuid not null references public.profiles(id) on delete cascade,
  title                       text not null check (char_length(title) between 1 and 150),
  patient_description         text not null,          -- plain Thai, LLM input
  patient_age                 smallint check (patient_age between 0 and 120),
  patient_gender              text check (patient_gender in ('female', 'male', 'other')),
  work_arrangement            text not null check (work_arrangement in ('daily', 'live_in')),
  province                    text not null,          -- public
  district                    text,                   -- public, area filter
  start_date                  date,
  wage_min                    integer check (wage_min >= 0),
  wage_max                    integer check (wage_max >= 0),
  wage_unit                   text check (wage_unit in ('month', 'day', 'hour')),
  preferred_caregiver_gender  text not null default 'any'
                                check (preferred_caregiver_gender in ('any', 'female', 'male')),
  extra_answers               jsonb not null default '{}'::jsonb,   -- choice-based answers (image flow)
  status                      text not null default 'draft'
                                check (status in ('draft', 'open', 'closed', 'expired')),
  expires_at                  timestamptz not null default (now() + interval '30 days'),
  closed_at                   timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint job_wage_range
    check (wage_min is null or wage_max is null or wage_max >= wage_min)
);

create index job_posts_family_idx on public.job_posts (family_id);
create index job_posts_open_idx   on public.job_posts (status, province, expires_at);

-- PRIVATE job location (owner-only). Caregivers see distance in km only.
create table public.job_post_locations (
  job_post_id   uuid primary key references public.job_posts(id) on delete cascade,
  address_text  text,
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  updated_at    timestamptz not null default now(),
  constraint job_location_pair check ((lat is null) = (lng is null))
);

create table public.job_post_case_needs (
  job_post_id  uuid not null references public.job_posts(id) on delete cascade,
  case_type    text not null references public.case_types(code),
  is_required  boolean not null default true,
  primary key (job_post_id, case_type)
);

-- Photos of the patient / situation. Storage path "<family_id>/<job_post_id>/<file>"
create table public.job_post_photos (
  id           uuid primary key default gen_random_uuid(),
  job_post_id  uuid not null references public.job_posts(id) on delete cascade,
  file_path    text not null,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);

create index job_post_photos_job_idx on public.job_post_photos (job_post_id, sort_order);


-- =====================================================================
-- 5. การจับคู่แบบ swipe (MATCHING)
--    One row per (job_post, caregiver) pair, created by whoever swipes first.
--    Each side owns only its own decision column (enforced by trigger).
--    matched_at is set automatically when both decisions are 'like';
--    after that the pair is locked. Hiring and payment happen off-platform.
-- =====================================================================

create table public.matches (
  id                    uuid primary key default gen_random_uuid(),
  job_post_id           uuid not null references public.job_posts(id) on delete cascade,
  caregiver_id          uuid not null references public.caregiver_details(caregiver_id) on delete cascade,
  caregiver_decision    text check (caregiver_decision in ('like', 'pass')),
  family_decision       text check (family_decision in ('like', 'pass')),
  caregiver_decided_at  timestamptz,
  family_decided_at     timestamptz,
  matched_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (job_post_id, caregiver_id),
  constraint matches_has_decision
    check (caregiver_decision is not null or family_decision is not null)
);

create index matches_caregiver_idx on public.matches (caregiver_id, matched_at);
create index matches_job_idx       on public.matches (job_post_id, family_decision);

create table public.favorites (
  family_id     uuid not null references public.profiles(id) on delete cascade,
  caregiver_id  uuid not null references public.caregiver_details(caregiver_id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (family_id, caregiver_id)
);


-- =====================================================================
-- 6. AI และงานวิจัย (AI & RESEARCH) — backend เขียนคนเดียว
--    - AI output lives in its own tables with the exact input snapshot.
--    - Real-user outputs point to caregiver / job rows; evaluation outputs
--      point to eval_inputs instead, so the test set never mixes with users.
-- =====================================================================

-- The research test set (~60 caregiver inputs; job_input used for summaries)
create table public.eval_inputs (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,          -- e.g. 'T001'
  caregiver_input  jsonb not null,
  job_input        jsonb,
  notes            text,
  created_at       timestamptz not null default now()
);

create table public.ai_logs (
  id              uuid primary key default gen_random_uuid(),
  feature         text not null check (feature in (
                    'worker_profile', 'applicant_summary', 'location_pin', 'other')),
  provider        text not null check (provider in ('typhoon', 'openai', 'other')),
  model_name      text not null,
  prompt_version  text not null,
  input_tokens    integer check (input_tokens >= 0),    -- for cost only, not cross-model comparison
  output_tokens   integer check (output_tokens >= 0),
  cost_usd        numeric(12, 8) check (cost_usd >= 0),
  usd_thb_rate    numeric(10, 4) check (usd_thb_rate > 0),   -- rate used, for reproducibility
  cost_thb        numeric(12, 6) check (cost_thb >= 0),
  latency_ms      integer check (latency_ms >= 0),
  success         boolean not null default true,
  error_message   text,
  routing_reason  text,                      -- why the router chose this model (stretch goal)
  is_eval_run     boolean not null default false,
  eval_input_id   uuid references public.eval_inputs(id) on delete set null,
  request_meta    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index ai_logs_analysis_idx on public.ai_logs (feature, model_name, is_eval_run, created_at);

create table public.ai_worker_profiles (
  id              uuid primary key default gen_random_uuid(),
  caregiver_id    uuid references public.caregiver_details(caregiver_id) on delete cascade,
  eval_input_id   uuid references public.eval_inputs(id) on delete cascade,
  provider        text not null check (provider in ('typhoon', 'openai')),
  model_name      text not null,
  prompt_version  text not null,
  input_snapshot  jsonb not null,            -- exact form data sent to the LLM
  input_hash      text not null,             -- hash(input_snapshot): detect stale profile
  output_text     text not null,
  is_active       boolean not null default false,   -- the version families see
  ai_log_id       uuid references public.ai_logs(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint worker_profile_target check (num_nonnulls(caregiver_id, eval_input_id) = 1)
);

create unique index ai_worker_profiles_one_active
  on public.ai_worker_profiles (caregiver_id) where is_active and caregiver_id is not null;
create index ai_worker_profiles_hash_idx on public.ai_worker_profiles (input_hash);

-- Summary + fit score for a (job, caregiver) pair, shown on the family's card
create table public.ai_applicant_summaries (
  id              uuid primary key default gen_random_uuid(),
  job_post_id     uuid references public.job_posts(id) on delete cascade,
  caregiver_id    uuid references public.caregiver_details(caregiver_id) on delete cascade,
  eval_input_id   uuid references public.eval_inputs(id) on delete cascade,
  provider        text not null check (provider in ('typhoon', 'openai')),
  model_name      text not null,
  prompt_version  text not null,
  input_snapshot  jsonb not null,            -- job + caregiver data sent to the LLM
  input_hash      text not null,
  summary_text    text not null,
  fit_score       numeric(5, 2) check (fit_score between 0 and 100),
  fit_rationale   text,
  is_active       boolean not null default false,
  ai_log_id       uuid references public.ai_logs(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint summary_target check (
       (eval_input_id is null and job_post_id is not null and caregiver_id is not null)
    or (eval_input_id is not null and job_post_id is null and caregiver_id is null))
);

create unique index ai_summaries_one_active
  on public.ai_applicant_summaries (job_post_id, caregiver_id)
  where is_active and eval_input_id is null;
create index ai_summaries_hash_idx on public.ai_applicant_summaries (input_hash);

-- Human-written gold references (for ROUGE / BERTScore)
create table public.eval_references (
  id              uuid primary key default gen_random_uuid(),
  target_type     text not null check (target_type in ('worker_profile', 'applicant_summary')),
  eval_input_id   uuid not null references public.eval_inputs(id) on delete cascade,
  reference_text  text not null,
  author_code     text not null,                     -- anonymised writer id, e.g. 'R1'
  verified_by     text[] not null default '{}',      -- reviewer codes (two reviewers)
  created_at      timestamptz not null default now()
);

create index eval_references_input_idx on public.eval_references (target_type, eval_input_id);

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

-- Human ratings per qualified-output criterion (Cohen's kappa across 2 raters)
--   completeness, faithfulness : 0 = fail, 1 = pass
--   thai_quality               : 1-5
create table public.eval_ratings (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('worker_profile', 'applicant_summary')),
  target_id    uuid not null,
  rater_code   text not null,
  criterion    text not null check (criterion in ('completeness', 'faithfulness', 'thai_quality')),
  score        smallint not null,
  created_at   timestamptz not null default now(),
  unique (target_id, rater_code, criterion),
  constraint eval_rating_scale check (
       (criterion in ('completeness', 'faithfulness') and score in (0, 1))
    or (criterion = 'thai_quality' and score between 1 and 5))
);

-- Final verdict per output: passes all four criteria or not
create table public.eval_qualifications (
  id                 uuid primary key default gen_random_uuid(),
  target_type        text not null check (target_type in ('worker_profile', 'applicant_summary')),
  target_id          uuid not null,
  auto_completeness  boolean,          -- automated field check
  auto_format        boolean,          -- template + length check
  is_qualified       boolean not null,
  notes              text,
  decided_at         timestamptz not null default now(),
  unique (target_type, target_id)
);


-- =====================================================================
-- 7. หลังจับคู่ (FEEDBACK, PLATFORM REVIEWS, NOTIFICATIONS)
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

-- In-app review of the PLATFORM (users never review each other). One per user, editable.
create table public.platform_reviews (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles(id) on delete cascade,
  ease_of_use         smallint not null check (ease_of_use between 1 and 5),
  ui_design           smallint not null check (ui_design between 1 and 5),
  ai_summary_quality  smallint not null check (ai_summary_quality between 1 and 5),
  comment             text check (char_length(comment) <= 1000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- In-app notifications; backend reads rows with line_sent_at IS NULL to push via LINE
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in (
                  'interest_received', 'match', 'job_expiring', 'system')),
  title         text not null,
  body          text,
  match_id      uuid references public.matches(id) on delete cascade,
  job_post_id   uuid references public.job_posts(id) on delete cascade,
  read_at       timestamptz,
  line_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);


-- =====================================================================
-- 8. ฟังก์ชันเช็คสิทธิ์ (RLS HELPERS) — ตอบ ใช่/ไม่ใช่ ให้ policy
--    SECURITY DEFINER = run as owner, bypassing RLS inside the function,
--    which prevents "infinite recursion detected in policy".
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

create or replace function public.is_job_open(p_job_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.job_posts
    where id = p_job_post_id and status = 'open' and expires_at > now()
  );
$$;

-- Owner; any caregiver while the post is open; or a caregiver already paired with it
create or replace function public.can_view_job_post(p_job_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.job_posts j
    where j.id = p_job_post_id
      and (
        j.family_id = (select auth.uid())
        or (j.status = 'open' and j.expires_at > now()
            and (select role from public.profiles where id = (select auth.uid())) = 'caregiver')
        or exists (select 1 from public.matches m
                   where m.job_post_id = j.id and m.caregiver_id = (select auth.uid()))
      )
  );
$$;

-- Does the current family have a pair row with this caregiver on any of their jobs?
create or replace function public.family_has_match_with(p_caregiver_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    join public.job_posts j on j.id = m.job_post_id
    where m.caregiver_id = p_caregiver_id
      and j.family_id = (select auth.uid())
  );
$$;

-- Self, or a family viewing a visible caregiver / one paired with their job
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
        or public.family_has_match_with(p_caregiver_id)
      )
    );
$$;


-- =====================================================================
-- 9. สิ่งที่ฐานข้อมูลทำให้อัตโนมัติ (TRIGGERS & BUSINESS LOGIC)
-- =====================================================================

-- 9.1 updated_at on every mutable table
create trigger profiles_set_updated_at            before update on public.profiles            for each row execute function public.set_updated_at();
create trigger contact_details_set_updated_at     before update on public.contact_details     for each row execute function public.set_updated_at();
create trigger caregiver_details_set_updated_at   before update on public.caregiver_details   for each row execute function public.set_updated_at();
create trigger caregiver_locations_set_updated_at before update on public.caregiver_locations for each row execute function public.set_updated_at();
create trigger certificates_set_updated_at        before update on public.certificates        for each row execute function public.set_updated_at();
create trigger job_posts_set_updated_at           before update on public.job_posts           for each row execute function public.set_updated_at();
create trigger job_post_locations_set_updated_at  before update on public.job_post_locations  for each row execute function public.set_updated_at();
create trigger matches_set_updated_at             before update on public.matches             for each row execute function public.set_updated_at();
create trigger platform_reviews_set_updated_at    before update on public.platform_reviews    for each row execute function public.set_updated_at();


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


-- 9.3 Job post: keep closed_at in sync with status
create or replace function public.job_posts_track_close()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status in ('closed', 'expired') and old.status not in ('closed', 'expired') then
    new.closed_at := now();
  elsif new.status not in ('closed', 'expired') then
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger job_posts_track_close
before update of status on public.job_posts
for each row execute function public.job_posts_track_close();


-- 9.4 Matches: each side sets only its own decision; mutual 'like' → matched
create or replace function public.matches_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and (new.job_post_id <> old.job_post_id or new.caregiver_id <> old.caregiver_id) then
    raise exception 'job_post_id and caregiver_id cannot be changed';
  end if;

  if tg_op = 'UPDATE' and old.matched_at is not null
     and (new.caregiver_decision is distinct from old.caregiver_decision
          or new.family_decision is distinct from old.family_decision) then
    raise exception 'This pair is already matched';
  end if;

  -- uid is null for service_role / Dashboard: skip user checks
  if uid is not null then
    if not public.is_job_open(new.job_post_id) then
      raise exception 'This job post is no longer open';
    end if;

    if uid = new.caregiver_id then
      if (tg_op = 'INSERT' and new.family_decision is not null)
         or (tg_op = 'UPDATE' and new.family_decision is distinct from old.family_decision) then
        raise exception 'A caregiver cannot set the family decision';
      end if;
    elsif exists (select 1 from public.job_posts j
                  where j.id = new.job_post_id and j.family_id = uid) then
      if (tg_op = 'INSERT' and new.caregiver_decision is not null)
         or (tg_op = 'UPDATE' and new.caregiver_decision is distinct from old.caregiver_decision) then
        raise exception 'A family cannot set the caregiver decision';
      end if;
    else
      raise exception 'Not a party to this pair';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.matched_at := null;
    if new.caregiver_decision is not null then new.caregiver_decided_at := now(); end if;
    if new.family_decision    is not null then new.family_decided_at    := now(); end if;
  else
    if new.caregiver_decision is distinct from old.caregiver_decision then new.caregiver_decided_at := now(); end if;
    if new.family_decision    is distinct from old.family_decision    then new.family_decided_at    := now(); end if;
  end if;

  if new.matched_at is null
     and new.caregiver_decision = 'like' and new.family_decision = 'like' then
    new.matched_at := now();
  end if;

  return new;
end;
$$;

create trigger matches_before_write
before insert or update on public.matches
for each row execute function public.matches_before_write();


-- 9.5 Notifications: family on caregiver interest; both sides on match
create or replace function public.matches_after_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_family_id uuid;
  v_title     text;
begin
  select family_id, title into v_family_id, v_title
  from public.job_posts where id = new.job_post_id;

  if new.matched_at is not null and (tg_op = 'INSERT' or old.matched_at is null) then
    insert into public.notifications (user_id, type, title, body, match_id, job_post_id) values
      (new.caregiver_id, 'match', 'จับคู่สำเร็จ',
       format('คุณกับครอบครัวสนใจกันในงาน "%s" ดูช่องทางติดต่อได้แล้ว', v_title),
       new.id, new.job_post_id),
      (v_family_id, 'match', 'จับคู่สำเร็จ',
       format('คุณกับผู้ดูแลสนใจกันในงาน "%s" ดูช่องทางติดต่อได้แล้ว', v_title),
       new.id, new.job_post_id);
  elsif new.caregiver_decision = 'like'
        and (tg_op = 'INSERT' or old.caregiver_decision is distinct from 'like') then
    insert into public.notifications (user_id, type, title, body, match_id, job_post_id)
    values (v_family_id, 'interest_received', 'มีผู้ดูแลสนใจงานของคุณ',
            format('มีผู้ดูแลสนใจงาน "%s"', v_title), new.id, new.job_post_id);
  end if;

  return null;
end;
$$;

create trigger matches_after_write
after insert or update on public.matches
for each row execute function public.matches_after_write();


-- 9.6 Contact reveal: only after a mutual match, only to the two parties
-- Frontend: supabase.rpc('get_match_contact', { p_match_id })
create or replace function public.get_match_contact(p_match_id uuid)
returns table (user_id uuid, display_name text, phone text, line_id text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.display_name, c.phone, c.line_id
  from public.matches m
  join public.job_posts j        on j.id = m.job_post_id
  join public.profiles p         on p.id = case when (select auth.uid()) = m.caregiver_id
                                                then j.family_id else m.caregiver_id end
  join public.contact_details c  on c.user_id = p.id
  where m.id = p_match_id
    and m.matched_at is not null
    and (select auth.uid()) in (m.caregiver_id, j.family_id);
$$;


-- 9.7 Job post lifecycle: expire old open posts (+ reminder 3 days before)
create or replace function public.run_job_post_maintenance()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
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

-- To run hourly: Dashboard → Integrations → Cron (enables pg_cron), then:
-- select cron.schedule('job-post-maintenance', '0 * * * *',
--                      $$ select public.run_job_post_maintenance(); $$);


-- =====================================================================
-- 10. ฟังก์ชันดึงการ์ด (CARD FEEDS) — หน้า swipe ทั้งสองฝั่งเรียกใช้
--     Cheap SQL pre-filter BEFORE any LLM call (cost-first design):
--     the backend generates AI summaries / fit scores only for the top
--     rows returned here, then the frontend orders cards by fit_score.
--     SECURITY DEFINER so they can compute distance from the private
--     location tables; they return km only, never coordinates.
-- =====================================================================

-- Family side: caregiver candidates for one of MY job posts
-- Frontend: supabase.rpc('candidate_caregivers', { p_job_post_id, p_max_km: 20 })
create or replace function public.candidate_caregivers(
  p_job_post_id uuid,
  p_max_km      double precision default null,
  p_limit       integer default 20)
returns table (
  caregiver_id       uuid,
  display_name       text,
  gender             text,
  years_experience   smallint,
  home_province      text,
  home_district      text,
  expected_wage_min  integer,
  expected_wage_max  integer,
  wage_unit          text,
  distance_km        double precision,
  needs_met          integer,
  needs_required     integer,
  caregiver_liked    boolean)
language sql stable security definer set search_path = ''
as $$
  with job as (
    select j.id, j.work_arrangement, j.preferred_caregiver_gender,
           j.wage_max, j.wage_unit, l.lat, l.lng
    from public.job_posts j
    left join public.job_post_locations l on l.job_post_id = j.id
    where j.id = p_job_post_id
      and j.family_id = (select auth.uid())
  ),
  needs as (
    select n.case_type
    from public.job_post_case_needs n
    where n.job_post_id = p_job_post_id and n.is_required
  ),
  scored as (
    select c.caregiver_id, p.display_name, c.gender, c.years_experience,
           c.home_province, c.home_district,
           c.expected_wage_min, c.expected_wage_max, c.wage_unit,
           public.distance_km(job.lat, job.lng, cl.lat, cl.lng) as distance_km,
           (select count(*)::int
              from public.caregiver_case_skills s
              join needs on needs.case_type = s.case_type
             where s.caregiver_id = c.caregiver_id
               and s.comfort_level in ('experienced', 'trained')) as needs_met,
           (select count(*)::int from needs) as needs_required,
           coalesce(m.caregiver_decision = 'like', false) as caregiver_liked
    from job
    join public.caregiver_details c on c.is_visible
    join public.profiles p on p.id = c.caregiver_id
    left join public.caregiver_locations cl on cl.caregiver_id = c.caregiver_id
    left join public.matches m on m.job_post_id = job.id and m.caregiver_id = c.caregiver_id
    where m.family_decision is null                         -- not swiped yet
      and m.caregiver_decision is distinct from 'pass'      -- caregiver didn't reject this job
      and job.work_arrangement = any (c.work_arrangements)
      and (job.preferred_caregiver_gender = 'any' or c.gender = job.preferred_caregiver_gender)
      and (job.wage_max is null or c.expected_wage_min is null
           or c.wage_unit is distinct from job.wage_unit
           or c.expected_wage_min <= job.wage_max)
  )
  select s.caregiver_id, s.display_name, s.gender, s.years_experience,
         s.home_province, s.home_district, s.expected_wage_min, s.expected_wage_max,
         s.wage_unit, s.distance_km, s.needs_met, s.needs_required, s.caregiver_liked
  from scored s
  where p_max_km is null or s.distance_km <= p_max_km
  order by s.caregiver_liked desc, s.needs_met desc, s.distance_km asc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

-- Caregiver side: open job cards for ME (salary, distance, tasks)
-- Frontend: supabase.rpc('job_feed_for_me', { p_max_km: 15 })
create or replace function public.job_feed_for_me(
  p_max_km  double precision default null,
  p_limit   integer default 20)
returns table (
  job_post_id       uuid,
  title             text,
  province          text,
  district          text,
  work_arrangement  text,
  wage_min          integer,
  wage_max          integer,
  wage_unit         text,
  start_date        date,
  distance_km       double precision,
  needs_required    integer,
  needs_i_can_do    integer,
  family_liked      boolean)
language sql stable security definer set search_path = ''
as $$
  with me as (
    select c.caregiver_id, c.gender, c.work_arrangements, c.max_travel_km, cl.lat, cl.lng
    from public.caregiver_details c
    left join public.caregiver_locations cl on cl.caregiver_id = c.caregiver_id
    where c.caregiver_id = (select auth.uid())
  ),
  feed as (
    select j.id as job_post_id, j.title, j.province, j.district, j.work_arrangement,
           j.wage_min, j.wage_max, j.wage_unit, j.start_date,
           public.distance_km(jl.lat, jl.lng, me.lat, me.lng) as distance_km,
           (select count(*)::int
              from public.job_post_case_needs n
             where n.job_post_id = j.id and n.is_required) as needs_required,
           (select count(*)::int
              from public.job_post_case_needs n
              join public.caregiver_case_skills s
                on s.case_type = n.case_type and s.caregiver_id = me.caregiver_id
             where n.job_post_id = j.id and n.is_required
               and s.comfort_level in ('experienced', 'trained')) as needs_i_can_do,
           coalesce(m.family_decision = 'like', false) as family_liked,
           coalesce(p_max_km, me.max_travel_km::double precision) as km_limit
    from me
    join public.job_posts j on j.status = 'open' and j.expires_at > now()
    left join public.job_post_locations jl on jl.job_post_id = j.id
    left join public.matches m on m.job_post_id = j.id and m.caregiver_id = me.caregiver_id
    where m.caregiver_decision is null                      -- not swiped yet
      and m.family_decision is distinct from 'pass'         -- family didn't reject me
      and (cardinality(me.work_arrangements) = 0 or j.work_arrangement = any (me.work_arrangements))
      and (j.preferred_caregiver_gender = 'any' or j.preferred_caregiver_gender = me.gender)
  )
  select f.job_post_id, f.title, f.province, f.district, f.work_arrangement,
         f.wage_min, f.wage_max, f.wage_unit, f.start_date, f.distance_km,
         f.needs_required, f.needs_i_can_do, f.family_liked
  from feed f
  where f.km_limit is null or f.distance_km <= f.km_limit
  order by f.family_liked desc, f.needs_i_can_do desc, f.distance_km asc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;


-- =====================================================================
-- 11. สรุปผลวิจัย (RESEARCH SUMMARY VIEW) — backend เท่านั้น
--     Cost per qualified output = total THB cost of ALL eval calls
--     (including failed ones) ÷ number of qualified outputs.
-- =====================================================================

create view public.eval_model_summary
with (security_invoker = true)
as
with costs as (
  select l.feature as target_type, l.provider, l.model_name, l.prompt_version,
         count(*)                                   as n_calls,
         count(*) filter (where not l.success)      as n_failed_calls,
         sum(l.cost_thb)                            as total_cost_thb,
         percentile_cont(0.5)  within group (order by l.latency_ms) as median_latency_ms,
         percentile_cont(0.95) within group (order by l.latency_ms) as p95_latency_ms
  from public.ai_logs l
  where l.is_eval_run and l.feature in ('worker_profile', 'applicant_summary')
  group by 1, 2, 3, 4
),
outputs as (
  select 'worker_profile'::text as target_type, w.id as target_id,
         w.provider, w.model_name, w.prompt_version
  from public.ai_worker_profiles w where w.eval_input_id is not null
  union all
  select 'applicant_summary', s.id, s.provider, s.model_name, s.prompt_version
  from public.ai_applicant_summaries s where s.eval_input_id is not null
),
qual as (
  select o.target_type, o.provider, o.model_name, o.prompt_version,
         count(*)                                  as n_outputs,
         count(*) filter (where q.is_qualified)    as n_qualified
  from outputs o
  left join public.eval_qualifications q
         on q.target_type = o.target_type and q.target_id = o.target_id
  group by 1, 2, 3, 4
)
select c.target_type, c.provider, c.model_name, c.prompt_version,
       c.n_calls, c.n_failed_calls,
       coalesce(q.n_outputs, 0)    as n_outputs,
       coalesce(q.n_qualified, 0)  as n_qualified,
       round(coalesce(q.n_qualified, 0)::numeric / nullif(q.n_outputs, 0), 4) as qualified_rate,
       c.total_cost_thb,
       c.total_cost_thb / nullif(q.n_qualified, 0) as cost_per_qualified_thb,
       c.median_latency_ms, c.p95_latency_ms
from costs c
left join qual q using (target_type, provider, model_name, prompt_version);


-- =====================================================================
-- 12. สิทธิ์ใครเห็นอะไร (ROW LEVEL SECURITY + PRIVILEGES)
--     RLS controls ROWS; GRANT controls which COLUMNS a role may touch.
--     Start from zero for anon/authenticated, then grant explicitly.
-- =====================================================================

alter table public.case_types             enable row level security;
alter table public.profiles               enable row level security;
alter table public.contact_details        enable row level security;
alter table public.caregiver_details      enable row level security;
alter table public.caregiver_locations    enable row level security;
alter table public.caregiver_case_skills  enable row level security;
alter table public.certificates           enable row level security;
alter table public.job_posts              enable row level security;
alter table public.job_post_locations     enable row level security;
alter table public.job_post_case_needs    enable row level security;
alter table public.job_post_photos        enable row level security;
alter table public.matches                enable row level security;
alter table public.favorites              enable row level security;
alter table public.eval_inputs            enable row level security;   -- no policies: service_role only
alter table public.ai_logs                enable row level security;   -- no policies: service_role only
alter table public.ai_worker_profiles     enable row level security;
alter table public.ai_applicant_summaries enable row level security;
alter table public.eval_references        enable row level security;   -- no policies: service_role only
alter table public.eval_metrics           enable row level security;   -- no policies: service_role only
alter table public.eval_ratings           enable row level security;   -- no policies: service_role only
alter table public.eval_qualifications    enable row level security;   -- no policies: service_role only
alter table public.feedback_corrections   enable row level security;
alter table public.platform_reviews       enable row level security;
alter table public.notifications          enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant  all on all tables in schema public to service_role;


-- case_types: public vocabulary
grant select on public.case_types to anon, authenticated;
create policy "case_types: anyone reads"
on public.case_types for select to anon, authenticated using (true);


-- profiles
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "profiles: signed-in users read"
on public.profiles for select to authenticated using (true);

create policy "profiles: update own"
on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));


-- contact_details (private)
grant select on public.contact_details to authenticated;
grant update (phone, line_id) on public.contact_details to authenticated;

create policy "contact: read own"
on public.contact_details for select to authenticated
using (user_id = (select auth.uid()));

create policy "contact: update own"
on public.contact_details for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));


-- caregiver_details
grant select, insert, update on public.caregiver_details to authenticated;

create policy "caregiver_details: visible to self & families"
on public.caregiver_details for select to authenticated
using (public.can_view_caregiver(caregiver_id));

create policy "caregiver_details: caregiver creates own"
on public.caregiver_details for insert to authenticated
with check (caregiver_id = (select auth.uid()) and (select public.get_my_role()) = 'caregiver');

create policy "caregiver_details: caregiver updates own"
on public.caregiver_details for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));


-- caregiver_locations (owner-only)
grant select, insert, update on public.caregiver_locations to authenticated;

create policy "caregiver_locations: owner reads"
on public.caregiver_locations for select to authenticated
using (caregiver_id = (select auth.uid()));

create policy "caregiver_locations: owner inserts"
on public.caregiver_locations for insert to authenticated
with check (caregiver_id = (select auth.uid()));

create policy "caregiver_locations: owner updates"
on public.caregiver_locations for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));


-- caregiver_case_skills
grant select, insert, update, delete on public.caregiver_case_skills to authenticated;

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


-- certificates (no self-verification: verification_status is not grantable)
grant select, delete on public.certificates to authenticated;
grant insert (caregiver_id, cert_type, title, issuer, issued_date, file_path) on public.certificates to authenticated;
grant update (cert_type, title, issuer, issued_date, file_path)               on public.certificates to authenticated;

create policy "certificates: visible to self & families"
on public.certificates for select to authenticated
using (public.can_view_caregiver(caregiver_id));

create policy "certificates: caregiver inserts own"
on public.certificates for insert to authenticated
with check (caregiver_id = (select auth.uid()) and (select public.get_my_role()) = 'caregiver');

create policy "certificates: caregiver updates own"
on public.certificates for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));

create policy "certificates: caregiver deletes own"
on public.certificates for delete to authenticated
using (caregiver_id = (select auth.uid()));


-- job_posts
grant select, delete on public.job_posts to authenticated;
grant insert (id, family_id, title, patient_description, patient_age, patient_gender,
              work_arrangement, province, district, start_date, wage_min, wage_max,
              wage_unit, preferred_caregiver_gender, extra_answers, status, expires_at)
  on public.job_posts to authenticated;
grant update (title, patient_description, patient_age, patient_gender,
              work_arrangement, province, district, start_date, wage_min, wage_max,
              wage_unit, preferred_caregiver_gender, extra_answers, status, expires_at)
  on public.job_posts to authenticated;

create policy "job_posts: owner, caregivers (open), or paired caregiver read"
on public.job_posts for select to authenticated
using (public.can_view_job_post(id));

create policy "job_posts: family creates own"
on public.job_posts for insert to authenticated
with check (family_id = (select auth.uid()) and (select public.get_my_role()) = 'family');

create policy "job_posts: family updates own"
on public.job_posts for update to authenticated
using (family_id = (select auth.uid())) with check (family_id = (select auth.uid()));

create policy "job_posts: family deletes own drafts"
on public.job_posts for delete to authenticated
using (family_id = (select auth.uid()) and status = 'draft');


-- job_post_locations (owner-only)
grant select, insert, update on public.job_post_locations to authenticated;

create policy "job_locations: owner reads"
on public.job_post_locations for select to authenticated
using (public.owns_job_post(job_post_id));

create policy "job_locations: owner inserts"
on public.job_post_locations for insert to authenticated
with check (public.owns_job_post(job_post_id));

create policy "job_locations: owner updates"
on public.job_post_locations for update to authenticated
using (public.owns_job_post(job_post_id)) with check (public.owns_job_post(job_post_id));


-- job_post_case_needs
grant select, insert, update, delete on public.job_post_case_needs to authenticated;

create policy "needs: readable with job post"
on public.job_post_case_needs for select to authenticated
using (public.can_view_job_post(job_post_id));

create policy "needs: owner inserts"
on public.job_post_case_needs for insert to authenticated
with check (public.owns_job_post(job_post_id));

create policy "needs: owner updates"
on public.job_post_case_needs for update to authenticated
using (public.owns_job_post(job_post_id)) with check (public.owns_job_post(job_post_id));

create policy "needs: owner deletes"
on public.job_post_case_needs for delete to authenticated
using (public.owns_job_post(job_post_id));


-- job_post_photos
grant select, insert, update, delete on public.job_post_photos to authenticated;

create policy "photos: readable with job post"
on public.job_post_photos for select to authenticated
using (public.can_view_job_post(job_post_id));

create policy "photos: owner inserts"
on public.job_post_photos for insert to authenticated
with check (public.owns_job_post(job_post_id));

create policy "photos: owner updates"
on public.job_post_photos for update to authenticated
using (public.owns_job_post(job_post_id)) with check (public.owns_job_post(job_post_id));

create policy "photos: owner deletes"
on public.job_post_photos for delete to authenticated
using (public.owns_job_post(job_post_id));


-- matches (who may set which decision is enforced by matches_before_write)
grant select on public.matches to authenticated;
grant insert (job_post_id, caregiver_id, caregiver_decision, family_decision) on public.matches to authenticated;
-- job_post_id / caregiver_id are grantable only so supabase-js upsert() works; the trigger forbids changing them
grant update (job_post_id, caregiver_id, caregiver_decision, family_decision) on public.matches to authenticated;

create policy "matches: parties read"
on public.matches for select to authenticated
using (caregiver_id = (select auth.uid()) or public.owns_job_post(job_post_id));

create policy "matches: caregiver or family swipes"
on public.matches for insert to authenticated
with check (
  public.is_job_open(job_post_id)
  and (
    (caregiver_id = (select auth.uid())
       and (select public.get_my_role()) = 'caregiver'
       and family_decision is null and caregiver_decision is not null)
    or
    (public.owns_job_post(job_post_id)
       and caregiver_decision is null and family_decision is not null
       and public.can_view_caregiver(caregiver_id))
  )
);

create policy "matches: parties update"
on public.matches for update to authenticated
using (caregiver_id = (select auth.uid()) or public.owns_job_post(job_post_id))
with check (caregiver_id = (select auth.uid()) or public.owns_job_post(job_post_id));


-- favorites (family only)
grant select, insert, delete on public.favorites to authenticated;

create policy "favorites: read own"
on public.favorites for select to authenticated
using (family_id = (select auth.uid()));

create policy "favorites: family adds visible caregiver"
on public.favorites for insert to authenticated
with check (
  family_id = (select auth.uid())
  and (select public.get_my_role()) = 'family'
  and public.can_view_caregiver(caregiver_id)
);

create policy "favorites: delete own"
on public.favorites for delete to authenticated
using (family_id = (select auth.uid()));


-- AI outputs: read-only for users, only the ACTIVE real-user version
grant select on public.ai_worker_profiles     to authenticated;
grant select on public.ai_applicant_summaries to authenticated;

create policy "ai_worker_profiles: active, visible caregiver"
on public.ai_worker_profiles for select to authenticated
using (is_active and caregiver_id is not null and public.can_view_caregiver(caregiver_id));

create policy "ai_summaries: active, job owner only"
on public.ai_applicant_summaries for select to authenticated
using (is_active and job_post_id is not null and public.owns_job_post(job_post_id));


-- feedback_corrections: append-only
grant select, insert on public.feedback_corrections to authenticated;

create policy "feedback: insert own"
on public.feedback_corrections for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "feedback: read own"
on public.feedback_corrections for select to authenticated
using (user_id = (select auth.uid()));


-- platform_reviews: one per user, editable
grant select on public.platform_reviews to authenticated;
grant insert (user_id, ease_of_use, ui_design, ai_summary_quality, comment) on public.platform_reviews to authenticated;
grant update (ease_of_use, ui_design, ai_summary_quality, comment)          on public.platform_reviews to authenticated;

create policy "platform_reviews: read own"
on public.platform_reviews for select to authenticated
using (user_id = (select auth.uid()));

create policy "platform_reviews: insert own"
on public.platform_reviews for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "platform_reviews: update own"
on public.platform_reviews for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));


-- notifications: own only; may only mark as read
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: read own"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "notifications: mark own as read"
on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));


-- research view: service_role only
revoke all on public.eval_model_summary from anon, authenticated;
grant  select on public.eval_model_summary to service_role;


-- functions: trigger / maintenance functions are not callable via RPC
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.job_posts_track_close()     from public, anon, authenticated;
revoke execute on function public.matches_before_write()      from public, anon, authenticated;
revoke execute on function public.matches_after_write()       from public, anon, authenticated;
revoke execute on function public.run_job_post_maintenance()  from public, anon, authenticated;

-- user-facing RPCs: signed-in users only
revoke execute on function public.get_match_contact(uuid)                               from public, anon;
revoke execute on function public.candidate_caregivers(uuid, double precision, integer) from public, anon;
revoke execute on function public.job_feed_for_me(double precision, integer)            from public, anon;
grant  execute on function public.get_match_contact(uuid)                               to authenticated;
grant  execute on function public.candidate_caregivers(uuid, double precision, integer) to authenticated;
grant  execute on function public.job_feed_for_me(double precision, integer)            to authenticated;


-- =====================================================================
-- 13. ที่เก็บไฟล์ (STORAGE) — private buckets
--   certificates : "<caregiver_id>/<uuid>.<ext>"
--   job-photos   : "<family_id>/<job_post_id>/<uuid>.<ext>"
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('certificates', 'certificates', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('job-photos', 'job-photos', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "cert files: owner or viewer reads"
on storage.objects for select to authenticated
using (
  bucket_id = 'certificates'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.can_view_caregiver(public.try_uuid((storage.foldername(name))[1]))
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

create policy "job photos: owner or viewer reads"
on storage.objects for select to authenticated
using (
  bucket_id = 'job-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.can_view_job_post(public.try_uuid((storage.foldername(name))[2]))
  )
);

create policy "job photos: owner uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.owns_job_post(public.try_uuid((storage.foldername(name))[2]))
);

create policy "job photos: owner deletes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- =====================================================================
-- END
-- =====================================================================