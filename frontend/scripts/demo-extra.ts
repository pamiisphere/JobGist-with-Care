/**
 * Extra synthetic demo data for scripts/seed-demo.ts — same shapes as src/lib/mockData.ts.
 * Deterministic (fixed random seed) so every reseed produces the same people and jobs.
 */
import type {
  CaregiverCaseSkill, CaregiverDetails, CaregiverLocation, CaseTypeCode, Certificate, ComfortLevel,
  ContactDetails, JobPost, JobPostCaseNeed, JobPostLocation, MatchRow, Profile,
} from '../src/types/database';
import { approxLatLng } from '../src/services/geo';

let seed = 20261119;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const sample = <T,>(a: readonly T[], n: number) => [...a].sort(() => rnd() - 0.5).slice(0, n);
const round = (n: number, step: number) => Math.round(n / step) * step;
const NOW = '2026-11-19T00:00:00Z';

const F_NAMES = ['สมศรี', 'กาญจนา', 'รัตนา', 'วันเพ็ญ', 'สุดารัตน์', 'นงลักษณ์', 'ละเอียด', 'อรุณี', 'จันทร์เพ็ญ',
  'พรทิพย์', 'สายสุนีย์', 'บุญเรือน', 'มยุรี', 'วิไลวรรณ', 'ชลธิชา', 'ดวงใจ', 'เพ็ญศรี', 'อัญชลี', 'สุนทรี', 'ลำดวน'];
const M_NAMES = ['สมศักดิ์', 'ประเสริฐ', 'วิชัย', 'สุรชัย', 'ธีระ', 'อำนาจ', 'ไพโรจน์', 'สมพงษ์', 'ณรงค์', 'เกรียงไกร'];
const SURNAMES = ['ใจดี', 'ศรีสุข', 'มีสุข', 'บุญประเสริฐ', 'แก้วมณี', 'รุ่งเรือง', 'ทองดี', 'สุขสวัสดิ์', 'พรหมมา',
  'วงศ์ใหญ่', 'จันทร์หอม', 'เพชรรัตน์', 'ศรีวงศ์', 'อินทร์แก้ว', 'นาคสวัสดิ์'];
const DISTRICTS = ['จตุจักร', 'ลาดพร้าว', 'บางกะปิ', 'ห้วยขวาง', 'ดินแดง', 'บางเขน', 'บึงกุ่ม', 'วังทองหลาง', 'บางซื่อ',
  'พญาไท', 'ราชเทวี', 'วัฒนา', 'คลองเตย', 'พระโขนง', 'บางนา', 'สวนหลวง', 'ประเวศ', 'บางแค', 'ภาษีเจริญ',
  'ตลิ่งชัน', 'บางพลัด', 'ดอนเมือง', 'หลักสี่', 'สายไหม', 'มีนบุรี'];
const F_CG_AVATARS = ['cg-female-1.jpg', 'cg-female-2.jpg', 'cg-female-3.jpg', 'cg-female-4.jpg', 'cg-female-5.jpg', 'cg-female-anong.jpg'];
const M_CG_AVATARS = ['cg-male-1.jpg', 'cg-male-2.png', 'cg-male-3.jpg', 'cg-male-4.jpg', 'cg-male-5.jpg'];
const F_FAM_AVATARS = ['fam-female-1.jpg', 'fam-female-2.jpg', 'fam-female-3.jpg', 'fam-female-4.jpg', 'fam-female-5.jpg', 'fam-female-6.jpg'];
const M_FAM_AVATARS = ['fam-male-1.png', 'fam-male-2.jpg', 'fam-male-3.jpg', 'fam-male-4.jpg'];

const ALL_CASES: CaseTypeCode[] = ['bedridden', 'tube_feeding', 'dementia', 'stroke', 'post_surgery', 'wound_care',
  'hospital_escort', 'general_elderly', 'tracheostomy_suction', 'physical_therapy', 'diabetes_insulin', 'palliative_care'];

const ROLE_SETS = [['caregiver'], ['nurse_aide'], ['practical_nurse'], ['informal'], ['caregiver', 'nurse_aide'],
  ['practical_nurse', 'caregiver'], ['informal', 'caregiver']] as const;

const CERTS = [
  { file_name: 'ประกาศนียบัตรผู้ดูแลผู้สูงอายุ 420 ชั่วโมง', cert_type: 'หลักสูตรผู้ดูแลผู้สูงอายุ (Caregiver)', issued_by: 'กรมอนามัย กระทรวงสาธารณสุข' },
  { file_name: 'ประกาศนียบัตรพนักงานช่วยการพยาบาล (NA)', cert_type: 'หลักสูตรพนักงานช่วยการพยาบาล (NA)', issued_by: 'โรงเรียนบริบาลเอกชน' },
  { file_name: 'ประกาศนียบัตรผู้ช่วยพยาบาล (PN) 1 ปี', cert_type: 'หลักสูตรผู้ช่วยพยาบาล (Practical Nurse)', issued_by: 'วิทยาลัยพยาบาลบรมราชชนนี' },
  { file_name: 'การปฐมพยาบาลเบื้องต้นและ CPR', cert_type: 'First Aid / CPR', issued_by: 'สภากาชาดไทย' },
];

// Job templates: description (with {rel} {age}), needs (first = required core)
const JOBS = [
  { text: '{rel}อายุ {age} ปี ป่วยเป็นสโตรก ติดเตียง แขนขาอ่อนแรงซีกซ้าย ต้องพลิกตัวทุก 2 ชั่วโมง ให้อาหารทางสายยาง และทำกายภาพยืดเหยียดทุกวัน',
    needs: ['bedridden', 'stroke', 'tube_feeding', 'physical_therapy'], arr: 'live_in' },
  { text: '{rel}อายุ {age} ปี มีภาวะสมองเสื่อมระยะกลาง ชอบเดินออกนอกบ้านตอนกลางคืน ต้องการคนดูแลใจเย็น ช่วยจัดยา อาบน้ำ และพาเดินออกกำลังกาย',
    needs: ['dementia', 'general_elderly'], arr: 'live_in' },
  { text: '{rel}อายุ {age} ปี เพิ่งผ่าตัดเปลี่ยนข้อเข่า ต้องการคนช่วยพยุงเดิน ทำกายภาพตามที่แพทย์สั่ง และพาไปตรวจตามนัดที่โรงพยาบาล',
    needs: ['post_surgery', 'physical_therapy', 'hospital_escort'], arr: 'daily' },
  { text: '{rel}อายุ {age} ปี เป็นเบาหวาน ต้องเจาะน้ำตาลปลายนิ้วเช้าเย็น ฉีดอินซูลิน และคุมอาหาร มีแผลที่เท้าต้องทำแผลทุกวัน',
    needs: ['diabetes_insulin', 'wound_care', 'general_elderly'], arr: 'daily' },
  { text: '{rel}อายุ {age} ปี ติดเตียง เจาะคอ ต้องดูดเสมหะบ่อย ให้อาหารทางสายยาง มีแผลกดทับที่ก้นกบ ต้องการผู้ช่วยพยาบาลที่มีประสบการณ์',
    needs: ['bedridden', 'tracheostomy_suction', 'tube_feeding', 'wound_care'], arr: 'live_in' },
  { text: '{rel}อายุ {age} ปี ป่วยมะเร็งระยะท้าย อยู่ในระยะประคับประคอง ต้องการคนดูแลความสุขสบาย จัดท่า เช็ดตัว และเป็นเพื่อนคุยอย่างอ่อนโยน',
    needs: ['palliative_care', 'bedridden', 'general_elderly'], arr: 'live_in' },
  { text: '{rel}อายุ {age} ปี ยังเดินได้แต่ช้า อยู่บ้านคนเดียวช่วงกลางวัน ต้องการคนดูแลทั่วไป ทำอาหาร ดูแลการทานยา และพาไปหาหมอเดือนละครั้ง',
    needs: ['general_elderly', 'hospital_escort'], arr: 'daily' },
  { text: '{rel}อายุ {age} ปี ฟื้นฟูหลังเส้นเลือดในสมองตีบ พูดไม่ค่อยชัด ต้องฝึกเดินและฝึกกลืน ต้องการคนดูแลที่ช่วยทำกายภาพได้',
    needs: ['stroke', 'physical_therapy', 'general_elderly'], arr: 'daily' },
] as const;
const RELS = [['คุณพ่อ', 'male'], ['คุณแม่', 'female'], ['คุณตา', 'male'], ['คุณยาย', 'female'], ['คุณลุง', 'male'], ['คุณป้า', 'female']] as const;

export interface DemoSet {
  MOCK_PROFILES: Profile[];
  MOCK_CONTACTS: Record<string, ContactDetails>;
  MOCK_CAREGIVER_DETAILS: Record<string, CaregiverDetails>;
  MOCK_CAREGIVER_LOCATIONS: Record<string, CaregiverLocation>;
  MOCK_CAREGIVER_SKILLS: Record<string, CaregiverCaseSkill[]>;
  MOCK_CERTIFICATES: Record<string, Certificate[]>;
  MOCK_JOB_POSTS: JobPost[];
  MOCK_JOB_LOCATIONS: Record<string, JobPostLocation>;
  MOCK_JOB_CASE_NEEDS: Record<string, JobPostCaseNeed[]>;
  MOCK_MATCHES: MatchRow[];
}

const near = (district: string) => {
  const c = approxLatLng('กรุงเทพมหานคร', district)!;
  return { lat: +(c.lat + (rnd() - 0.5) * 0.02).toFixed(4), lng: +(c.lng + (rnd() - 0.5) * 0.02).toFixed(4) };
};
const phone = () => `08${int(10000000, 99999999)}`;

export function makeExtraDemo(nCaregivers: number, nFamilies: number, certPreviews: string[]): DemoSet {
  const out: DemoSet = {
    MOCK_PROFILES: [], MOCK_CONTACTS: {}, MOCK_CAREGIVER_DETAILS: {}, MOCK_CAREGIVER_LOCATIONS: {},
    MOCK_CAREGIVER_SKILLS: {}, MOCK_CERTIFICATES: {}, MOCK_JOB_POSTS: [], MOCK_JOB_LOCATIONS: {},
    MOCK_JOB_CASE_NEEDS: {}, MOCK_MATCHES: [],
  };

  const cgIds: string[] = [];
  for (let i = 1; i <= nCaregivers; i++) {
    const n = 100 + i, id = `cg-${n}-cg${n}`;
    const female = rnd() < 0.8;
    const name = `คุณ${pick(female ? F_NAMES : M_NAMES)} ${pick(SURNAMES)}`;
    const avatar = `/caregivers/${pick(female ? F_CG_AVATARS : M_CG_AVATARS)}`;
    const district = pick(DISTRICTS);
    const roles = [...pick(ROLE_SETS)];
    const years = int(1, 15);
    const arr: ('live_in' | 'daily')[] = [...pick([['live_in'], ['daily'], ['live_in', 'daily']] as const)];
    const monthly = arr.includes('live_in');
    const wMin = monthly ? round(int(15000, 27000), 500) : round(int(600, 1000), 50);
    cgIds.push(id);

    out.MOCK_PROFILES.push({ id, role: 'caregiver', display_name: name, gender: female ? 'female' : 'male', avatar_url: avatar, created_at: NOW, updated_at: NOW });
    out.MOCK_CONTACTS[id] = { user_id: id, phone: phone(), line_id: `cg${n}_care`, line_user_id: null, created_at: NOW, updated_at: NOW };
    out.MOCK_CAREGIVER_DETAILS[id] = {
      caregiver_id: id, care_roles: roles as CaregiverDetails['care_roles'], work_arrangements: arr,
      years_experience: years, expected_wage_min: wMin, expected_wage_max: wMin + (monthly ? 3000 : 150),
      wage_unit: monthly ? 'month' : 'day', home_province: 'กรุงเทพมหานคร', home_district: district,
      max_travel_km: pick([10, 15, 20, 25, 30]), gender: female ? 'female' : 'male', age: int(25, 58),
      avatar_url: avatar, extra_answers: {}, is_visible: rnd() < 0.9, created_at: NOW, updated_at: NOW,
    };
    out.MOCK_CAREGIVER_LOCATIONS[id] = { caregiver_id: id, address_text: `เขต${district} กรุงเทพฯ`, ...near(district), created_at: NOW, updated_at: NOW };

    const skilled = years >= 5 || roles.includes('practical_nurse') || roles.includes('nurse_aide');
    out.MOCK_CAREGIVER_SKILLS[id] = sample(ALL_CASES, int(3, 7)).map((c, k) => ({
      id: `${id}-s${k}`, caregiver_id: id, case_type: c,
      comfort_level: pick<ComfortLevel>(skilled
        ? ['experienced', 'experienced', 'trained', 'trained', 'willing_to_learn']
        : ['experienced', 'trained', 'willing_to_learn', 'willing_to_learn', 'not_comfortable']),
    }));
    out.MOCK_CERTIFICATES[id] = sample(CERTS, skilled ? int(1, 2) : int(0, 1)).map((c, k) => ({
      id: `${id}-c${k}`, caregiver_id: id, file_path: '', file_name: c.file_name, cert_type: c.cert_type,
      issued_by: c.issued_by, verification_status: rnd() < 0.7 ? 'verified' : 'pending',
      preview_url: certPreviews.length ? pick(certPreviews) : undefined, created_at: NOW,
    }));
  }

  const jobIds: string[] = [];
  for (let i = 1; i <= nFamilies; i++) {
    const n = 100 + i, id = `fam-${n}-fam${n}`, jobId = `jobx-${n}`;
    const female = rnd() < 0.6;
    const name = `คุณ${pick(female ? F_NAMES : M_NAMES)} ${pick(SURNAMES)}`;
    const avatar = `/families/${pick(female ? F_FAM_AVATARS : M_FAM_AVATARS)}`;
    const district = pick(DISTRICTS);
    const t = pick(JOBS);
    const [rel, pGender] = pick(RELS);
    const age = int(65, 92);
    const monthly = t.arr === 'live_in';
    jobIds.push(jobId);

    out.MOCK_PROFILES.push({ id, role: 'family', display_name: name, gender: female ? 'female' : 'male', avatar_url: avatar, created_at: NOW, updated_at: NOW });
    out.MOCK_CONTACTS[id] = { user_id: id, phone: phone(), line_id: `fam${n}`, line_user_id: null, created_at: NOW, updated_at: NOW };
    out.MOCK_JOB_POSTS.push({
      id: jobId, family_id: id, patient_description: t.text.replace('{rel}', rel).replace('{age}', String(age)),
      patient_gender: pGender, patient_age: age, work_arrangement: t.arr, province: 'กรุงเทพมหานคร', district,
      preferred_caregiver_gender: rnd() < 0.6 ? 'any' : rnd() < 0.85 ? 'female' : 'male',
      expected_wage: monthly ? round(int(18000, 30000), 1000) : round(int(700, 1100), 50),
      wage_unit: monthly ? 'month' : 'day', start_date: null, extra_answers: {}, status: 'open',
      expires_at: '2026-12-31T00:00:00Z', closed_at: null, created_at: NOW, updated_at: NOW,
    });
    out.MOCK_JOB_LOCATIONS[jobId] = { job_post_id: jobId, address_text: `เขต${district} กรุงเทพฯ`, ...near(district), created_at: NOW, updated_at: NOW };
    out.MOCK_JOB_CASE_NEEDS[jobId] = t.needs.map((c, k) => ({ id: `${jobId}-n${k}`, job_post_id: jobId, case_type: c as CaseTypeCode, is_required: k < 2 || rnd() < 0.5 }));
  }

  // swipe history: some caregiver likes, some family likes, a few mutual matches
  const used = new Set<string>();
  const nPairs = Math.min(cgIds.length * jobIds.length, Math.round((nCaregivers + nFamilies) * 0.6));
  for (let k = 0; k < nPairs; k++) {
    const job = pick(jobIds), cg = pick(cgIds), key = `${job}:${cg}`;
    if (used.has(key)) continue;
    used.add(key);
    const r = rnd();
    out.MOCK_MATCHES.push({
      id: `mx-${k}`, job_post_id: job, caregiver_id: cg,
      caregiver_decision: r < 0.45 || r >= 0.85 ? 'like' : null,
      family_decision: r >= 0.45 ? 'like' : null,
      caregiver_decided_at: null, family_decided_at: null, matched_at: null, created_at: NOW,
    });
  }
  return out;
}

/** Concatenate the hand-written demo set with the generated one. */
export function mergeDemo(a: DemoSet, b: DemoSet): DemoSet {
  return {
    MOCK_PROFILES: [...a.MOCK_PROFILES, ...b.MOCK_PROFILES],
    MOCK_CONTACTS: { ...a.MOCK_CONTACTS, ...b.MOCK_CONTACTS },
    MOCK_CAREGIVER_DETAILS: { ...a.MOCK_CAREGIVER_DETAILS, ...b.MOCK_CAREGIVER_DETAILS },
    MOCK_CAREGIVER_LOCATIONS: { ...a.MOCK_CAREGIVER_LOCATIONS, ...b.MOCK_CAREGIVER_LOCATIONS },
    MOCK_CAREGIVER_SKILLS: { ...a.MOCK_CAREGIVER_SKILLS, ...b.MOCK_CAREGIVER_SKILLS },
    MOCK_CERTIFICATES: { ...a.MOCK_CERTIFICATES, ...b.MOCK_CERTIFICATES },
    MOCK_JOB_POSTS: [...a.MOCK_JOB_POSTS, ...b.MOCK_JOB_POSTS],
    MOCK_JOB_LOCATIONS: { ...a.MOCK_JOB_LOCATIONS, ...b.MOCK_JOB_LOCATIONS },
    MOCK_JOB_CASE_NEEDS: { ...a.MOCK_JOB_CASE_NEEDS, ...b.MOCK_JOB_CASE_NEEDS },
    MOCK_MATCHES: [...a.MOCK_MATCHES, ...b.MOCK_MATCHES],
  };
}
