-- ============================================================================
-- JobGist with Care - Supabase Database Schema v3 (Complete DDL)
-- 
-- Region: Southeast Asia (Singapore)
-- PostgreSQL 15+ / Supabase
-- 24 Tables, 2 Storage Buckets, 3 Public RPCs, RLS Security Definer Functions
-- ============================================================================

-- ============================================================================
-- PART 0: RESET & EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Drop existing tables if re-running
drop table if exists public.notifications cascade;
drop table if exists public.platform_reviews cascade;
drop table if exists public.feedback_corrections cascade;
drop table if exists public.eval_qualifications cascade;
drop table if exists public.eval_ratings cascade;
drop table if exists public.eval_metrics cascade;
drop table if exists public.eval_references cascade;
drop table if exists public.eval_inputs cascade;
drop table if exists public.ai_applicant_summaries cascade;
drop table if exists public.ai_worker_profiles cascade;
drop table if exists public.ai_logs cascade;
drop table if exists public.favorites cascade;
drop table if exists public.matches cascade;
drop table if exists public.job_post_photos cascade;
drop table if exists public.job_post_case_needs cascade;
drop table if exists public.job_post_locations cascade;
drop table if exists public.job_posts cascade;
drop table if exists public.certificates cascade;
drop table if exists public.caregiver_case_skills cascade;
drop table if exists public.caregiver_locations cascade;
drop table if exists public.caregiver_details cascade;
drop table if exists public.contact_details cascade;
drop table if exists public.profiles cascade;
drop table if exists public.case_types cascade;

-- ============================================================================
-- PART 1: CASE TYPES (12 Standard Medical & Care Conditions)
-- ============================================================================
create table public.case_types (
    code text primary key,
    title_th text not null,
    short_label_th text not null,
    description_th text not null,
    category text check (category in ('general', 'medical', 'rehab')),
    sort_order int default 0
);

insert into public.case_types (code, title_th, short_label_th, description_th, category, sort_order) values
('bedridden', 'ผู้ป่วยติดเตียง', 'ติดเตียง', 'ผู้ป่วยที่ไม่สามารถขยับตัวหรือลุกนั่งได้เอง ต้องพลิกตัวและดูแลความสะอาด', 'medical', 1),
('tube_feeding', 'ให้อาหารทางสายยาง', 'สายยาง', 'การให้อาหารทางสายยาง (NG tube / PEG) การบดอาหาร ยา และทำความสะอาดสาย', 'medical', 2),
('dementia', 'สมองเสื่อม / อัลไซเมอร์', 'สมองเสื่อม', 'ความจำถดถอย สับสน หลงลืม อารมณ์แปรปรวน หรือมีพฤติกรรมเดินออกจากบ้าน', 'general', 3),
('stroke', 'โรคหลอดเลือดสมอง (สโตรก)', 'สโตรก', 'อัมพฤกษ์ อัมพาต แขนขาอ่อนแรงครึ่งซีก ปากเบี้ยว กลืนลำบาก', 'medical', 4),
('post_surgery', 'ฟื้นฟูหลังผ่าตัด', 'หลังผ่าตัด', 'ดูแลการพักฟื้น ระวังภาวะแทรกซ้อน พยุงเดิน และทำตามคำสั่งแพทย์เฉพาะทาง', 'rehab', 5),
('wound_care', 'ทำแผล / ล้างแผลกดทับ', 'ทำแผล', 'การทำแผลปลอดเชื้อ แผลกดทับระดับต่างๆ หรือแผลเรื้อรัง', 'medical', 6),
('hospital_escort', 'พาพบแพทย์ / ไปโรงพยาบาล', 'พาพบแพทย์', 'เดินทางเป็นเพื่อน เข็นรถเข็น รอรับยา ฟังคำอธิบายแพทย์ และสรุปให้ญาติ', 'general', 7),
('general_elderly', 'ดูแลผู้สูงอายุทั่วไป', 'ผู้สูงอายุทั่วไป', 'ช่วยเหลือกิจวัตรประจำวัน อาบน้ำ เตรียมอาหาร พยุงเดิน เป็นเพื่อนคุย', 'general', 8),
('tracheostomy_suction', 'เจาะคอ / ดูดเสมหะ', 'เจาะคอ/ดูดเสมหะ', 'การดูแลท่อช่วยหายใจทางคอ ดูดเสมหะด้วยเครื่องดูดปลอดเชื้อ และพ่นยา', 'medical', 9),
('physical_therapy', 'กายภาพบำบัด / ออกกำลังกายฟื้นฟู', 'กายภาพ', 'ยืดเหยียดกล้ามเนื้อ ฝึกขยับข้อต่อ ป้องกันข้อยึดติด และฝึกก้าวเดิน', 'rehab', 10),
('diabetes_insulin', 'เบาหวาน / ฉีดอินซูลิน', 'เบาหวาน/ฉีดอินซูลิน', 'เจาะน้ำตาลปลายนิ้ว คุมอาหารเบาหวาน และฉีดยาอินซูลินตามเวลา', 'medical', 11),
('palliative_care', 'ระยะประคับประคอง (Palliative Care)', 'ระยะประคับประคอง', 'ดูแลด้านความสุขสบาย ลดความเจ็บปวด ดูแลจิตใจผู้ป่วยและครอบครัว', 'medical', 12);

-- ============================================================================
-- PART 2: PROFILES & PRIVATE CONTACTS
-- ============================================================================
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('caregiver', 'family')),
    display_name text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.contact_details (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    phone text not null,
    line_id text,
    line_user_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- PART 3: CAREGIVER DETAILS, LOCATIONS, SKILLS & CERTIFICATES
-- ============================================================================
create table public.caregiver_details (
    caregiver_id uuid primary key references public.profiles(id) on delete cascade,
    care_roles text[] not null check (care_roles <@ array['caregiver', 'nurse_aide', 'practical_nurse', 'informal']),
    work_arrangements text[] not null check (work_arrangements <@ array['daily', 'live_in']),
    years_experience int not null check (years_experience >= 0 and years_experience <= 60),
    expected_wage_min numeric not null check (expected_wage_min >= 0),
    expected_wage_max numeric not null check (expected_wage_max >= expected_wage_min),
    wage_unit text not null check (wage_unit in ('month', 'day', 'hour')),
    home_province text not null,
    home_district text not null,
    max_travel_km numeric not null check (max_travel_km >= 1 and max_travel_km <= 500),
    extra_answers jsonb default '{}'::jsonb,
    is_visible boolean not null default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.caregiver_locations (
    caregiver_id uuid primary key references public.profiles(id) on delete cascade,
    address_text text not null,
    lat numeric,
    lng numeric,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.caregiver_case_skills (
    id uuid primary key default gen_random_uuid(),
    caregiver_id uuid not null references public.profiles(id) on delete cascade,
    case_type text not null references public.case_types(code) on delete cascade,
    comfort_level text not null check (comfort_level in ('experienced', 'trained', 'willing_to_learn', 'not_comfortable')),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (caregiver_id, case_type)
);

create table public.certificates (
    id uuid primary key default gen_random_uuid(),
    caregiver_id uuid not null references public.profiles(id) on delete cascade,
    file_path text not null,
    file_name text not null,
    verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
    cert_type text not null,
    issued_by text,
    created_at timestamptz default now()
);

-- ============================================================================
-- PART 4: FAMILY JOB POSTS, LOCATIONS & CASE NEEDS
-- ============================================================================
create table public.job_posts (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references public.profiles(id) on delete cascade,
    patient_description text not null,
    work_arrangement text not null check (work_arrangement in ('daily', 'live_in')),
    province text not null,
    district text not null,
    preferred_caregiver_gender text not null default 'any' check (preferred_caregiver_gender in ('any', 'female', 'male')),
    expected_wage numeric,
    wage_unit text not null default 'month' check (wage_unit in ('month', 'day', 'hour')),
    start_date date,
    extra_answers jsonb default '{}'::jsonb,
    status text not null default 'open' check (status in ('draft', 'open', 'closed', 'expired')),
    expires_at timestamptz default (now() + interval '30 days'),
    closed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.job_post_locations (
    job_post_id uuid primary key references public.job_posts(id) on delete cascade,
    address_text text not null,
    lat numeric,
    lng numeric,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.job_post_case_needs (
    id uuid primary key default gen_random_uuid(),
    job_post_id uuid not null references public.job_posts(id) on delete cascade,
    case_type text not null references public.case_types(code) on delete cascade,
    is_required boolean not null default true,
    created_at timestamptz default now(),
    unique (job_post_id, case_type)
);

create table public.job_post_photos (
    id uuid primary key default gen_random_uuid(),
    job_post_id uuid not null references public.job_posts(id) on delete cascade,
    file_path text not null,
    caption text,
    created_at timestamptz default now()
);

-- ============================================================================
-- PART 5: MATCHING & FAVORITES
-- ============================================================================
create table public.matches (
    id uuid primary key default gen_random_uuid(),
    job_post_id uuid not null references public.job_posts(id) on delete cascade,
    caregiver_id uuid not null references public.profiles(id) on delete cascade,
    caregiver_decision text check (caregiver_decision in ('like', 'pass')),
    family_decision text check (family_decision in ('like', 'pass')),
    caregiver_decided_at timestamptz,
    family_decided_at timestamptz,
    matched_at timestamptz,
    created_at timestamptz default now(),
    unique (job_post_id, caregiver_id)
);

create table public.favorites (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references public.profiles(id) on delete cascade,
    caregiver_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz default now(),
    unique (family_id, caregiver_id)
);

-- ============================================================================
-- PART 6: AI WORKLOADS & RESEARCH EVALUATION TABLES
-- ============================================================================
create table public.ai_logs (
    id uuid primary key default gen_random_uuid(),
    call_type text not null,
    model_name text not null,
    prompt_version text not null,
    tokens_in int not null default 0,
    tokens_out int not null default 0,
    latency_ms int not null default 0,
    cost_usd numeric not null default 0,
    usd_thb_rate numeric not null default 36.5,
    cost_thb numeric not null default 0,
    success boolean not null default true,
    error_message text,
    is_eval_run boolean not null default false,
    created_at timestamptz default now()
);

create table public.ai_worker_profiles (
    id uuid primary key default gen_random_uuid(),
    caregiver_id uuid references public.profiles(id) on delete cascade,
    eval_input_id uuid,
    profile_text text not null,
    summary_headline text not null,
    key_strengths text[] not null default '{}',
    is_active boolean not null default true,
    prompt_version text not null,
    input_hash text not null,
    ai_log_id uuid references public.ai_logs(id),
    created_at timestamptz default now(),
    check ((caregiver_id is not null and eval_input_id is null) or (caregiver_id is null and eval_input_id is not null))
);

create table public.ai_applicant_summaries (
    id uuid primary key default gen_random_uuid(),
    job_post_id uuid references public.job_posts(id) on delete cascade,
    caregiver_id uuid references public.profiles(id) on delete cascade,
    eval_input_id uuid,
    summary_text text not null,
    fit_score int not null check (fit_score >= 0 and fit_score <= 100),
    fit_rationale jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    input_hash text not null,
    prompt_version text not null,
    ai_log_id uuid references public.ai_logs(id),
    created_at timestamptz default now()
);

-- Research tables for benchmark & evaluation
create table public.eval_inputs (
    id uuid primary key default gen_random_uuid(),
    raw_input_json jsonb not null,
    created_at timestamptz default now()
);

create table public.eval_references (
    id uuid primary key default gen_random_uuid(),
    eval_input_id uuid not null references public.eval_inputs(id) on delete cascade,
    reference_text text not null,
    created_at timestamptz default now()
);

create table public.eval_metrics (
    id uuid primary key default gen_random_uuid(),
    ai_log_id uuid not null references public.ai_logs(id) on delete cascade,
    rouge_l numeric,
    bert_score numeric,
    created_at timestamptz default now()
);

create table public.eval_ratings (
    id uuid primary key default gen_random_uuid(),
    rater_code text not null,
    criterion text not null check (criterion in ('completeness', 'faithfulness', 'thai_quality')),
    score numeric not null,
    created_at timestamptz default now()
);

create table public.eval_qualifications (
    id uuid primary key default gen_random_uuid(),
    auto_completeness boolean not null default false,
    auto_format boolean not null default false,
    is_qualified boolean not null default false,
    created_at timestamptz default now()
);

-- ============================================================================
-- PART 7: FEEDBACK, REVIEWS & NOTIFICATIONS
-- ============================================================================
create table public.feedback_corrections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    original_ai_text text not null,
    corrected_text text not null,
    correction_type text not null default 'worker_profile' check (correction_type in ('worker_profile', 'applicant_summary')),
    rating int check (rating >= 1 and rating <= 5),
    created_at timestamptz default now()
);

create table public.platform_reviews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    ease_of_use_score int not null check (ease_of_use_score >= 1 and ease_of_use_score <= 5),
    clarity_score int not null check (clarity_score >= 1 and clarity_score <= 5),
    recommendation_score int not null check (recommendation_score >= 1 and recommendation_score <= 5),
    comment text,
    created_at timestamptz default now(),
    unique (user_id)
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    message text not null,
    link_url text,
    read_at timestamptz,
    line_sent_at timestamptz,
    created_at timestamptz default now()
);

-- ============================================================================
-- PART 8: SECURITY DEFINER PERMISSION FUNCTIONS
-- ============================================================================
create or replace function public.get_my_role()
returns text language sql security definer as $$
    select role from public.profiles where id = auth.uid();
$$;

create or replace function public.owns_job_post(p_job_post_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.job_posts
        where id = p_job_post_id and family_id = auth.uid()
    );
$$;

create or replace function public.is_job_open(p_job_post_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.job_posts
        where id = p_job_post_id and status = 'open' and expires_at > now()
    );
$$;

create or replace function public.can_view_job_post(p_job_post_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.job_posts
        where id = p_job_post_id and (
            family_id = auth.uid()
            or status = 'open'
            or exists (select 1 from public.matches where job_post_id = p_job_post_id and caregiver_id = auth.uid())
        )
    );
$$;

create or replace function public.family_has_match_with(p_caregiver_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.matches m
        join public.job_posts j on j.id = m.job_post_id
        where m.caregiver_id = p_caregiver_id and j.family_id = auth.uid()
    );
$$;

create or replace function public.can_view_caregiver(p_caregiver_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.caregiver_details cd
        where cd.caregiver_id = p_caregiver_id and (
            cd.caregiver_id = auth.uid()
            or cd.is_visible = true
            or public.family_has_match_with(p_caregiver_id)
        )
    );
$$;

-- ============================================================================
-- PART 9: TRIGGERS & AUTOMATION
-- ============================================================================

-- Auto-create profile & contact details upon auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
    v_role text;
    v_display_name text;
    v_phone text;
begin
    v_role := new.raw_user_meta_data->>'role';
    v_display_name := coalesce(new.raw_user_meta_data->>'display_name', 'ผู้ใช้งาน');
    v_phone := coalesce(new.raw_user_meta_data->>'phone', '08X-XXX-XXXX');

    if v_role is null or v_role not in ('caregiver', 'family') then
        raise exception 'Invalid or missing role at signup. Must be caregiver or family';
    end if;

    insert into public.profiles (id, role, display_name)
    values (new.id, v_role, v_display_name);

    insert into public.contact_details (user_id, phone)
    values (new.id, v_phone);

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Trigger: matches_before_write (Mutual match & decision lockdown)
create or replace function public.matches_before_write()
returns trigger language plpgsql security definer as $$
begin
    -- If already matched, cannot alter decision
    if tg_op = 'UPDATE' and old.matched_at is not null then
        raise exception 'This pair is already matched';
    end if;

    -- Track timestamps
    if new.caregiver_decision is not null and (tg_op = 'INSERT' or old.caregiver_decision is null) then
        new.caregiver_decided_at := now();
    end if;

    if new.family_decision is not null and (tg_op = 'INSERT' or old.family_decision is null) then
        new.family_decided_at := now();
    end if;

    -- Set matched_at if both like
    if new.caregiver_decision = 'like' and new.family_decision = 'like' then
        new.matched_at := now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_matches_before_write on public.matches;
create trigger trg_matches_before_write
    before insert or update on public.matches
    for each row execute function public.matches_before_write();

-- Trigger: matches_after_write (Send in-app & LINE notifications)
create or replace function public.matches_after_write()
returns trigger language plpgsql security definer as $$
declare
    v_family_id uuid;
    v_caregiver_name text;
    v_family_name text;
begin
    select family_id into v_family_id from public.job_posts where id = new.job_post_id;
    select display_name into v_caregiver_name from public.profiles where id = new.caregiver_id;
    select display_name into v_family_name from public.profiles where id = v_family_id;

    -- Notify family when caregiver likes first
    if (tg_op = 'INSERT' or old.caregiver_decision is null) and new.caregiver_decision = 'like' and new.family_decision is null then
        insert into public.notifications (user_id, title, message, link_url)
        values (
            v_family_id,
            'มีผู้ดูแลสนใจงานของคุณ: ' || v_caregiver_name,
            v_caregiver_name || ' ได้กดสนใจงานของคุณ ตรวจสอบโปรไฟล์และเลือกตอบรับได้เลย',
            '/family/applicants'
        );
    end if;

    -- Notify both sides when mutually matched
    if new.matched_at is not null and (tg_op = 'INSERT' or old.matched_at is null) then
        insert into public.notifications (user_id, title, message, link_url)
        values
        (
            new.caregiver_id,
            'จับคู่สำเร็จกับ ' || coalesce(v_family_name, 'ครอบครัวผู้ว่าจ้าง') || '!',
            'ครอบครัวได้ตอบรับความสนใจของคุณแล้ว สามารถเปิดดูเบอร์โทรและ LINE เพื่อเริ่มงานได้ทันที',
            '/matches'
        ),
        (
            v_family_id,
            'จับคู่สำเร็จกับ ' || coalesce(v_caregiver_name, 'ผู้ดูแล') || '!',
            'คุณและผู้ดูแลแสดงความสนใจตรงกันแล้ว สามารถเปิดดูข้อมูลติดต่อเพื่อตกลงเริ่มงานได้ทันที',
            '/matches'
        );
    end if;

    return new;
end;
$$;

drop trigger if exists trg_matches_after_write on public.matches;
create trigger trg_matches_after_write
    after insert or update on public.matches
    for each row execute function public.matches_after_write();

-- ============================================================================
-- PART 10: FRONTEND RPC FUNCTIONS
-- ============================================================================

-- RPC 1: candidate_caregivers for family job
create or replace function public.candidate_caregivers(
    p_job_post_id uuid,
    p_max_km numeric default 50,
    p_limit int default 20
)
returns table (
    caregiver_id uuid,
    display_name text,
    care_roles text[],
    years_experience int,
    home_province text,
    home_district text,
    expected_wage_min numeric,
    expected_wage_max numeric,
    wage_unit text,
    distance_km numeric,
    needs_met int,
    needs_required int,
    caregiver_liked boolean
)
language plpgsql security definer as $$
declare
    v_job public.job_posts%rowtype;
    v_job_loc public.job_post_locations%rowtype;
begin
    select * into v_job from public.job_posts where id = p_job_post_id;
    if not found then return; end if;

    select * into v_job_loc from public.job_post_locations where job_post_id = p_job_post_id;

    return query
    with job_needs as (
        select case_type from public.job_post_case_needs
        where job_post_id = p_job_post_id and is_required = true
    ),
    caregiver_qualified as (
        select ccs.caregiver_id, count(distinct ccs.case_type) as met_count
        from public.caregiver_case_skills ccs
        join job_needs jn on jn.case_type = ccs.case_type
        where ccs.comfort_level in ('experienced', 'trained')
        group by ccs.caregiver_id
    )
    select
        p.id as caregiver_id,
        p.display_name,
        cd.care_roles,
        cd.years_experience,
        cd.home_province,
        cd.home_district,
        cd.expected_wage_min,
        cd.expected_wage_max,
        cd.wage_unit,
        case
            when cl.lat is not null and v_job_loc.lat is not null then
                round((point(cl.lng, cl.lat) <@> point(v_job_loc.lng, v_job_loc.lat))::numeric * 1.60934, 1)
            else 5.0
        end as distance_km,
        coalesce(cq.met_count, 0)::int as needs_met,
        (select count(*)::int from job_needs) as needs_required,
        coalesce(m.caregiver_decision = 'like', false) as caregiver_liked
    from public.caregiver_details cd
    join public.profiles p on p.id = cd.caregiver_id
    left join public.caregiver_locations cl on cl.caregiver_id = cd.caregiver_id
    left join caregiver_qualified cq on cq.caregiver_id = cd.caregiver_id
    left join public.matches m on m.job_post_id = p_job_post_id and m.caregiver_id = cd.caregiver_id
    where cd.is_visible = true
      and (m.family_decision is null or m.family_decision != 'pass')
      and (v_job.work_arrangement = any(cd.work_arrangements))
    order by
        coalesce(m.caregiver_decision = 'like', false) desc,
        coalesce(cq.met_count, 0) desc,
        distance_km asc
    limit p_limit;
end;
$$;

-- RPC 2: job_feed_for_me for caregiver
create or replace function public.job_feed_for_me(
    p_max_km numeric default null,
    p_limit int default 20
)
returns table (
    job_post_id uuid,
    family_id uuid,
    patient_description text,
    work_arrangement text,
    province text,
    district text,
    expected_wage numeric,
    wage_unit text,
    distance_km numeric,
    needs_i_can_do int,
    needs_required int,
    family_liked boolean
)
language plpgsql security definer as $$
declare
    v_user_id uuid := auth.uid();
    v_cg_detail public.caregiver_details%rowtype;
    v_cg_loc public.caregiver_locations%rowtype;
    v_eff_max_km numeric;
begin
    select * into v_cg_detail from public.caregiver_details where caregiver_id = v_user_id;
    select * into v_cg_loc from public.caregiver_locations where caregiver_id = v_user_id;
    v_eff_max_km := coalesce(p_max_km, v_cg_detail.max_travel_km, 30);

    return query
    with my_skills as (
        select case_type from public.caregiver_case_skills
        where caregiver_id = v_user_id and comfort_level in ('experienced', 'trained')
    ),
    job_match_counts as (
        select
            jp.id as j_id,
            count(distinct jcn.case_type) filter (where jcn.case_type in (select case_type from my_skills)) as i_can_do,
            count(distinct jcn.case_type) filter (where jcn.is_required = true) as req_count
        from public.job_posts jp
        left join public.job_post_case_needs jcn on jcn.job_post_id = jp.id
        group by jp.id
    )
    select
        jp.id as job_post_id,
        jp.family_id,
        jp.patient_description,
        jp.work_arrangement,
        jp.province,
        jp.district,
        jp.expected_wage,
        jp.wage_unit,
        case
            when v_cg_loc.lat is not null and jl.lat is not null then
                round((point(v_cg_loc.lng, v_cg_loc.lat) <@> point(jl.lng, jl.lat))::numeric * 1.60934, 1)
            else 6.0
        end as distance_km,
        coalesce(jmc.i_can_do, 0)::int as needs_i_can_do,
        coalesce(jmc.req_count, 1)::int as needs_required,
        coalesce(m.family_decision = 'like', false) as family_liked
    from public.job_posts jp
    left join public.job_post_locations jl on jl.job_post_id = jp.id
    left join job_match_counts jmc on jmc.j_id = jp.id
    left join public.matches m on m.job_post_id = jp.id and m.caregiver_id = v_user_id
    where jp.status = 'open'
      and jp.expires_at > now()
      and (m.caregiver_decision is null or m.caregiver_decision != 'pass')
      and (v_cg_detail.work_arrangements is null or jp.work_arrangement = any(v_cg_detail.work_arrangements))
    order by
        coalesce(m.family_decision = 'like', false) desc,
        coalesce(jmc.i_can_do, 0) desc,
        distance_km asc
    limit p_limit;
end;
$$;

-- RPC 3: get_match_contact (Strict contact reveal guard)
create or replace function public.get_match_contact(p_match_id uuid)
returns table (
    contact_name text,
    phone text,
    line_id text,
    role text,
    matched_at timestamptz
)
language plpgsql security definer as $$
declare
    v_match public.matches%rowtype;
    v_job public.job_posts%rowtype;
    v_target_user_id uuid;
begin
    select * into v_match from public.matches where id = p_match_id;
    if not found or v_match.matched_at is null then
        return; -- Return empty if not mutually matched!
    end if;

    select * into v_job from public.job_posts where id = v_match.job_post_id;

    if auth.uid() = v_match.caregiver_id then
        v_target_user_id := v_job.family_id;
    elsif auth.uid() = v_job.family_id then
        v_target_user_id := v_match.caregiver_id;
    else
        return; -- Caller is not part of this match!
    end if;

    return query
    select
        p.display_name as contact_name,
        cd.phone,
        cd.line_id,
        p.role,
        v_match.matched_at
    from public.profiles p
    join public.contact_details cd on cd.user_id = p.id
    where p.id = v_target_user_id;
end;
$$;

-- ============================================================================
-- PART 11: RESEARCH EVALUATION VIEW
-- ============================================================================
create or replace view public.eval_model_summary as
select
    l.call_type,
    l.model_name,
    l.prompt_version,
    count(*) as n_calls,
    count(*) filter (where not l.success) as n_failed_calls,
    round(sum(l.cost_thb), 2) as total_cost_thb,
    round(percentile_cont(0.5) within group (order by l.latency_ms)::numeric, 0) as median_latency_ms,
    round(percentile_cont(0.95) within group (order by l.latency_ms)::numeric, 0) as p95_latency_ms
from public.ai_logs l
group by l.call_type, l.model_name, l.prompt_version;

-- ============================================================================
-- PART 12: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.case_types enable row level security;
alter table public.profiles enable row level security;
alter table public.contact_details enable row level security;
alter table public.caregiver_details enable row level security;
alter table public.caregiver_locations enable row level security;
alter table public.caregiver_case_skills enable row level security;
alter table public.certificates enable row level security;
alter table public.job_posts enable row level security;
alter table public.job_post_locations enable row level security;
alter table public.job_post_case_needs enable row level security;
alter table public.job_post_photos enable row level security;
alter table public.matches enable row level security;
alter table public.favorites enable row level security;
alter table public.ai_worker_profiles enable row level security;
alter table public.ai_applicant_summaries enable row level security;
alter table public.feedback_corrections enable row level security;
alter table public.platform_reviews enable row level security;
alter table public.notifications enable row level security;

-- case_types: readable by all
create policy "case_types_read_all" on public.case_types for select using (true);

-- profiles: readable by authenticated, editable by owner
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- contact_details: readable and editable only by owner (other party accesses via get_match_contact)
create policy "contact_details_own" on public.contact_details for all using (auth.uid() = user_id);

-- caregiver_locations & job_post_locations: Strictly owner-only (privacy isolation)
create policy "caregiver_locations_own" on public.caregiver_locations for all using (auth.uid() = caregiver_id);
create policy "job_post_locations_own" on public.job_post_locations for all using (
    exists (select 1 from public.job_posts where id = job_post_id and family_id = auth.uid())
);

-- caregiver_details: owner can update; families can view when visible
create policy "caregiver_details_read" on public.caregiver_details for select using (
    caregiver_id = auth.uid() or is_visible = true or public.family_has_match_with(caregiver_id)
);
create policy "caregiver_details_write_own" on public.caregiver_details for all using (caregiver_id = auth.uid());

-- certificates: viewable by owner & families when visible; editable by owner
create policy "certificates_read" on public.certificates for select using (
    caregiver_id = auth.uid() or public.can_view_caregiver(caregiver_id)
);
create policy "certificates_write_own" on public.certificates for all using (caregiver_id = auth.uid());

-- job_posts: viewable when open or matched; editable by owner
create policy "job_posts_select" on public.job_posts for select using (public.can_view_job_post(id));
create policy "job_posts_write_own" on public.job_posts for all using (family_id = auth.uid());

-- matches: both parties of the pair can read and update their respective decision
create policy "matches_parties" on public.matches for all using (
    caregiver_id = auth.uid() or exists (select 1 from public.job_posts where id = job_post_id and family_id = auth.uid())
);

-- favorites: owner only
create policy "favorites_own" on public.favorites for all using (family_id = auth.uid());

-- notifications: owner only
create policy "notifications_own" on public.notifications for all using (user_id = auth.uid());

-- platform_reviews: insert & read own
create policy "platform_reviews_own" on public.platform_reviews for all using (user_id = auth.uid());

-- feedback_corrections: insert & read own
create policy "feedback_corrections_own" on public.feedback_corrections for all using (user_id = auth.uid());

