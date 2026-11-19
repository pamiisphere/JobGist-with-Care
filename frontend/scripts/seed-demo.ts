/**
 * Seed the demo data (src/lib/mockData.ts) into Supabase as REAL accounts and rows.
 *
 *   npm run seed:demo            # (re)create demo users + data, then generate AI via the backend
 *   npm run seed:demo -- --no-ai # data only
 *   npm run seed:demo -- --clean # delete every *@demo.jobgist.app user (and, by cascade, their data)
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from ../backend/.env,
 * and NEXT_PUBLIC_API_BASE (+ anon key) from .env.local. The backend must be running for AI.
 * All demo accounts use the password in src/services/live.ts (DEMO_PASSWORD).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as M from '../src/lib/mockData';
import { DEMO_PASSWORD, toDbCase, certTypeToDb } from '../src/services/live';
import { approxLatLng } from '../src/services/geo';

const DOMAIN = 'demo.jobgist.app';
const args = new Set(process.argv.slice(2));

function readEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8').split('\n')
      .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const be = readEnv('../backend/.env');
const fe = readEnv('.env.local');
const URL = be.SUPABASE_URL || fe.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = be.SUPABASE_SERVICE_ROLE_KEY;
const ANON = fe.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API = (fe.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');
if (!URL || !SERVICE) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in ../backend/.env');

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const emailFor = (mockId: string) => `${mockId.split('-').slice(2).join('-') || mockId}@${DOMAIN}`;
const must = <T,>(r: { data: T; error: unknown }, where: string): T => {
  if (r.error) throw new Error(`${where}: ${(r.error as Error).message || JSON.stringify(r.error)}`);
  return r.data;
};
const genderDb = (g?: string | null) => (g === 'female' || g === 'male' ? g : 'prefer_not_say');
const birthYear = (age?: number | null) => {
  if (!age) return null;
  const y = new Date().getFullYear() - age;
  return y >= 1940 && y <= 2010 ? y : null;
};

async function deleteDemoUsers() {
  let page = 1, removed = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const demo = data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`));
    for (const u of demo) {
      const del = await admin.auth.admin.deleteUser(u.id);
      if (del.error) throw new Error(`delete ${u.email}: ${del.error.message}`);
      removed++;
    }
    if (data.users.length < 200) break;
    if (!demo.length) page++;
  }
  console.log(`removed ${removed} demo users (their rows cascade-deleted)`);
}

async function ensureCaseTypes() {
  must(await admin.from('case_types').upsert([
    { code: 'post_surgery', label_th: 'ฟื้นฟูหลังผ่าตัด', sort_order: 20 },
    { code: 'hospital_escort', label_th: 'พาพบแพทย์ / ไปโรงพยาบาล', sort_order: 21 },
    { code: 'physical_therapy', label_th: 'กายภาพบำบัด / ฝึกเดิน', sort_order: 22 },
  ], { onConflict: 'code', ignoreDuplicates: true }), 'case_types');
}

async function uploadPreview(uid: string, url?: string): Promise<string> {
  const path = `${uid}/demo-${Math.random().toString(36).slice(2, 10)}.jpg`;
  if (url?.startsWith('http')) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const up = await admin.storage.from('certificates').upload(path, buf, { contentType: 'image/jpeg' });
        if (!up.error) return path;
      }
    } catch { /* fall through: row without a stored file */ }
  }
  return path;
}

async function signedInClient(email: string): Promise<{ c: SupabaseClient; token: string }> {
  if (!ANON) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error || !data.session) throw new Error(`sign in ${email}: ${error?.message}`);
  return { c, token: data.session.access_token };
}

async function post(path: string, token: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  await deleteDemoUsers();
  if (args.has('--clean')) return;
  await ensureCaseTypes();

  // 1. users (the signup trigger creates profiles + contact_details)
  const id: Record<string, string> = {};
  for (const p of M.MOCK_PROFILES) {
    const contact = M.MOCK_CONTACTS[p.id];
    const { data, error } = await admin.auth.admin.createUser({
      email: emailFor(p.id),
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role: p.role, display_name: p.display_name, phone: contact?.phone || null },
    });
    if (error || !data.user) throw new Error(`create ${p.id}: ${error?.message}`);
    id[p.id] = data.user.id;
    if (contact?.line_id) {
      must(await admin.from('contact_details').update({ line_id: contact.line_id }).eq('user_id', data.user.id), 'contact');
    }
  }
  console.log(`created ${Object.keys(id).length} users`);

  // 2. caregivers
  for (const [mockId, d] of Object.entries(M.MOCK_CAREGIVER_DETAILS)) {
    const uid = id[mockId];
    if (!uid) continue;
    const prof = M.MOCK_PROFILES.find((p) => p.id === mockId);
    must(await admin.from('caregiver_details').insert({
      caregiver_id: uid,
      gender: genderDb(d.gender),
      birth_year: birthYear(d.age),
      care_roles: d.care_roles,
      years_experience: d.years_experience,
      work_arrangements: d.work_arrangements,
      home_province: d.home_province,
      home_district: d.home_district,
      max_travel_km: d.max_travel_km,
      expected_wage_min: d.expected_wage_min,
      expected_wage_max: Math.max(d.expected_wage_min, d.expected_wage_max),
      wage_unit: d.wage_unit,
      extra_answers: { ...(d.extra_answers || {}), avatar_url: d.avatar_url || prof?.avatar_url || null },
      is_visible: d.is_visible,
    }), `caregiver_details ${mockId}`);

    const loc = M.MOCK_CAREGIVER_LOCATIONS[mockId];
    const ll = loc?.lat != null && loc?.lng != null ? { lat: loc.lat, lng: loc.lng } : approxLatLng(d.home_province, d.home_district);
    must(await admin.from('caregiver_locations').insert({
      caregiver_id: uid, address_text: loc?.address_text || null, lat: ll?.lat ?? null, lng: ll?.lng ?? null,
    }), `caregiver_locations ${mockId}`);

    const seen = new Set<string>();
    const skills = (M.MOCK_CAREGIVER_SKILLS[mockId] || [])
      .map((k) => ({ caregiver_id: uid, case_type: toDbCase(k.case_type), comfort_level: k.comfort_level }))
      .filter((k) => (seen.has(k.case_type) ? false : (seen.add(k.case_type), true)));
    if (skills.length) must(await admin.from('caregiver_case_skills').insert(skills), `skills ${mockId}`);

    for (const c of M.MOCK_CERTIFICATES[mockId] || []) {
      must(await admin.from('certificates').insert({
        caregiver_id: uid,
        cert_type: certTypeToDb(c.cert_type),
        title: c.file_name,
        issuer: c.issued_by,
        file_path: await uploadPreview(uid, c.preview_url),
        verification_status: c.verification_status === 'verified' ? 'verified' : 'pending',
      }), `certificates ${mockId}`);
    }
  }
  console.log('caregivers seeded');

  // 3. families' job posts
  const jobId: Record<string, string> = {};
  for (const j of M.MOCK_JOB_POSTS) {
    const fam = id[j.family_id];
    if (!fam) continue;
    const famProfile = M.MOCK_PROFILES.find((p) => p.id === j.family_id);
    const desc = j.patient_description.replace(/\s+/g, ' ').trim();
    const row = must(await admin.from('job_posts').insert({
      family_id: fam,
      title: desc.length > 60 ? `${desc.slice(0, 57)}...` : desc,
      patient_description: j.patient_description,
      patient_age: j.patient_age ?? null,
      patient_gender: j.patient_gender === 'female' || j.patient_gender === 'male' ? j.patient_gender : null,
      work_arrangement: j.work_arrangement,
      province: j.province,
      district: j.district,
      start_date: j.start_date && j.start_date > new Date().toISOString().slice(0, 10) ? j.start_date : null,
      wage_min: null,
      wage_max: j.expected_wage,
      wage_unit: j.wage_unit,
      preferred_caregiver_gender: j.preferred_caregiver_gender,
      extra_answers: { ...(j.extra_answers || {}), family_avatar_url: famProfile?.avatar_url || null },
      status: j.status === 'open' || j.status === 'draft' ? j.status : 'open',
    }).select('id').single(), `job ${j.id}`) as { id: string };
    jobId[j.id] = row.id;

    const loc = M.MOCK_JOB_LOCATIONS[j.id];
    const ll = loc?.lat != null && loc?.lng != null ? { lat: loc.lat, lng: loc.lng } : approxLatLng(j.province, j.district);
    must(await admin.from('job_post_locations').insert({
      job_post_id: row.id, address_text: loc?.address_text || null, lat: ll?.lat ?? null, lng: ll?.lng ?? null,
    }), `job location ${j.id}`);

    const seen = new Set<string>();
    const needs = (M.MOCK_JOB_CASE_NEEDS[j.id] || [])
      .map((n) => ({ job_post_id: row.id, case_type: toDbCase(n.case_type), is_required: n.is_required }))
      .filter((n) => (seen.has(n.case_type) ? false : (seen.add(n.case_type), true)));
    if (needs.length) must(await admin.from('job_post_case_needs').insert(needs), `needs ${j.id}`);
  }
  console.log(`seeded ${Object.keys(jobId).length} job posts`);

  // 4. swipe history (the DB trigger sets matched_at and writes notifications)
  let nMatches = 0;
  for (const m of M.MOCK_MATCHES) {
    const job = jobId[m.job_post_id], cg = id[m.caregiver_id];
    if (!job || !cg || (!m.caregiver_decision && !m.family_decision)) continue;
    must(await admin.from('matches').insert({
      job_post_id: job, caregiver_id: cg,
      caregiver_decision: m.caregiver_decision, family_decision: m.family_decision,
    }), `match ${m.id}`);
    nMatches++;
  }
  console.log(`seeded ${nMatches} swipes/matches`);

  if (args.has('--no-ai')) return;

  // 5. AI through the real backend (logged in ai_logs) — warms the caches for the demo
  console.log(`AI via ${API} ...`);
  for (const [mockId, d] of Object.entries(M.MOCK_CAREGIVER_DETAILS)) {
    if (!id[mockId] || !d.is_visible) continue;
    try {
      const { token } = await signedInClient(emailFor(mockId));
      const r = await post('/ai/worker-profile', token);
      console.log(`  worker profile ${mockId}: ${r.cached ? 'cached' : 'generated'}`);
    } catch (e) {
      console.warn(`  worker profile ${mockId} failed:`, (e as Error).message);
    }
  }
  for (const j of M.MOCK_JOB_POSTS) {
    const jid = jobId[j.id];
    if (!jid || j.status !== 'open') continue;
    try {
      const { c, token } = await signedInClient(emailFor(j.family_id));
      const { data } = await c.rpc('candidate_caregivers', { p_job_post_id: jid, p_max_km: null, p_limit: 20 });
      const ids = (data || []).map((r: { caregiver_id: string }) => r.caregiver_id);
      if (!ids.length) { console.log(`  summaries ${j.id}: no candidates after SQL pre-filter`); continue; }
      const r = await post('/ai/applicant-summaries', token, { job_post_id: jid, caregiver_ids: ids });
      console.log(`  summaries ${j.id}: ${r.summaries.length} candidates scored`);
    } catch (e) {
      console.warn(`  summaries ${j.id} failed:`, (e as Error).message);
    }
  }
  console.log('done ✔  demo login:', emailFor('cg-1-wimon'), '/', emailFor('fam-1-wanwimon'), 'password:', DEMO_PASSWORD);
}

main().catch((e) => {
  console.error('seed failed:', e.message || e);
  process.exit(1);
});
