import {
  Profile,
  ContactDetails,
  CaregiverDetails,
  CaregiverLocation,
  CaregiverCaseSkill,
  Certificate,
  JobPost,
  JobPostLocation,
  JobPostCaseNeed,
  MatchRow,
  FavoriteRow,
  AIWorkerProfile,
  AIApplicantSummary,
  PlatformReview,
  NotificationRow,
} from '@/types/database';

export const MOCK_PROFILES: Profile[] = [
  {
    id: 'cg-1-wimon',
    role: 'caregiver',
    display_name: 'พี่วิมล ชัยชนะ',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'cg-2-supaporn',
    role: 'caregiver',
    display_name: 'คุณสุภาพร ใจการุณย์',
    created_at: '2026-10-05T09:30:00Z',
    updated_at: '2026-11-02T14:20:00Z',
  },
  {
    id: 'cg-3-malee',
    role: 'caregiver',
    display_name: 'ป้ามาลี รัตนประเสริฐ',
    created_at: '2026-10-10T11:15:00Z',
    updated_at: '2026-11-03T16:00:00Z',
  },
  {
    id: 'cg-4-karn',
    role: 'caregiver',
    display_name: 'น้องกานต์ วรพงษ์',
    created_at: '2026-10-15T13:45:00Z',
    updated_at: '2026-11-04T09:10:00Z',
  },
  // Families
  {
    id: 'fam-1-wanwimon',
    role: 'family',
    display_name: 'ครอบครัววรรณวิมล',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-11-01T11:00:00Z',
  },
  {
    id: 'fam-2-thanapol',
    role: 'family',
    display_name: 'คุณธนพล ศิริสมบัติ',
    created_at: '2026-10-22T14:00:00Z',
    updated_at: '2026-11-02T16:30:00Z',
  },
];

export const MOCK_CONTACTS: Record<string, ContactDetails> = {
  'cg-1-wimon': {
    user_id: 'cg-1-wimon',
    phone: '081-456-7890',
    line_id: 'wimon_care_pn',
    line_user_id: 'U_wimon_123',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  'cg-2-supaporn': {
    user_id: 'cg-2-supaporn',
    phone: '089-765-4321',
    line_id: 'supaporn_na',
    line_user_id: 'U_supaporn_456',
    created_at: '2026-10-05T09:30:00Z',
    updated_at: '2026-10-05T09:30:00Z',
  },
  'cg-3-malee': {
    user_id: 'cg-3-malee',
    phone: '086-321-9876',
    line_id: 'malee_elderly',
    line_user_id: 'U_malee_789',
    created_at: '2026-10-10T11:15:00Z',
    updated_at: '2026-10-10T11:15:00Z',
  },
  'cg-4-karn': {
    user_id: 'cg-4-karn',
    phone: '095-888-2345',
    line_id: 'karn_care2026',
    line_user_id: 'U_karn_101',
    created_at: '2026-10-15T13:45:00Z',
    updated_at: '2026-10-15T13:45:00Z',
  },
  'fam-1-wanwimon': {
    user_id: 'fam-1-wanwimon',
    phone: '082-999-1122',
    line_id: 'wanwimon_family',
    line_user_id: 'U_wanwimon_fam',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
  'fam-2-thanapol': {
    user_id: 'fam-2-thanapol',
    phone: '084-555-4321',
    line_id: 'thanapol_s',
    line_user_id: 'U_thanapol_fam',
    created_at: '2026-10-22T14:00:00Z',
    updated_at: '2026-10-22T14:00:00Z',
  },
};

export const MOCK_CAREGIVER_DETAILS: Record<string, CaregiverDetails> = {
  'cg-1-wimon': {
    caregiver_id: 'cg-1-wimon',
    care_roles: ['practical_nurse', 'caregiver'],
    work_arrangements: ['live_in', 'daily'],
    years_experience: 8,
    expected_wage_min: 24000,
    expected_wage_max: 28000,
    wage_unit: 'month',
    home_province: 'กรุงเทพมหานคร',
    home_district: 'จตุจักร',
    max_travel_km: 25,
    extra_answers: { has_vehicle: true, non_smoker: true },
    is_visible: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  'cg-2-supaporn': {
    caregiver_id: 'cg-2-supaporn',
    care_roles: ['nurse_aide', 'caregiver'],
    work_arrangements: ['daily'],
    years_experience: 5,
    expected_wage_min: 19000,
    expected_wage_max: 23000,
    wage_unit: 'month',
    home_province: 'นนทบุรี',
    home_district: 'เมืองนนทบุรี',
    max_travel_km: 20,
    extra_answers: { has_vehicle: true, non_smoker: true },
    is_visible: true,
    created_at: '2026-10-05T09:30:00Z',
    updated_at: '2026-11-02T14:20:00Z',
  },
  'cg-3-malee': {
    caregiver_id: 'cg-3-malee',
    care_roles: ['informal', 'caregiver'],
    work_arrangements: ['live_in'],
    years_experience: 12,
    expected_wage_min: 17000,
    expected_wage_max: 20000,
    wage_unit: 'month',
    home_province: 'กรุงเทพมหานคร',
    home_district: 'ดินแดง',
    max_travel_km: 30,
    extra_answers: { patient_cooking: true, non_smoker: true },
    is_visible: true,
    created_at: '2026-10-10T11:15:00Z',
    updated_at: '2026-11-03T16:00:00Z',
  },
  'cg-4-karn': {
    caregiver_id: 'cg-4-karn',
    care_roles: ['caregiver'],
    work_arrangements: ['daily'],
    years_experience: 3,
    expected_wage_min: 700,
    expected_wage_max: 900,
    wage_unit: 'day',
    home_province: 'กรุงเทพมหานคร',
    home_district: 'บางเขน',
    max_travel_km: 15,
    extra_answers: { strong_physique: true, non_smoker: true },
    is_visible: true,
    created_at: '2026-10-15T13:45:00Z',
    updated_at: '2026-11-04T09:10:00Z',
  },
};

export const MOCK_CAREGIVER_LOCATIONS: Record<string, CaregiverLocation> = {
  'cg-1-wimon': {
    caregiver_id: 'cg-1-wimon',
    address_text: 'ซอยพหลโยธิน 34 แขวงเสนานิคม เขตจตุจักร กทม.',
    lat: 13.829,
    lng: 100.569,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  'cg-2-supaporn': {
    caregiver_id: 'cg-2-supaporn',
    address_text: 'ถนนติวานนท์ ต.ตลาดขวัญ อ.เมือง นนทบุรี',
    lat: 13.856,
    lng: 100.518,
    created_at: '2026-10-05T09:30:00Z',
    updated_at: '2026-10-05T09:30:00Z',
  },
  'cg-3-malee': {
    caregiver_id: 'cg-3-malee',
    address_text: 'ซอยประชาสงเคราะห์ 21 เขตดินแดง กทม.',
    lat: 13.774,
    lng: 100.561,
    created_at: '2026-10-10T11:15:00Z',
    updated_at: '2026-10-10T11:15:00Z',
  },
  'cg-4-karn': {
    caregiver_id: 'cg-4-karn',
    address_text: 'ซอยรามอินทรา 5 แขวงอนุสาวรีย์ เขตบางเขน กทม.',
    lat: 13.871,
    lng: 100.602,
    created_at: '2026-10-15T13:45:00Z',
    updated_at: '2026-10-15T13:45:00Z',
  },
};

export const MOCK_CAREGIVER_SKILLS: Record<string, CaregiverCaseSkill[]> = {
  'cg-1-wimon': [
    { id: 's-w-1', caregiver_id: 'cg-1-wimon', case_type: 'tracheostomy_suction', comfort_level: 'experienced' },
    { id: 's-w-2', caregiver_id: 'cg-1-wimon', case_type: 'tube_feeding', comfort_level: 'experienced' },
    { id: 's-w-3', caregiver_id: 'cg-1-wimon', case_type: 'bedridden', comfort_level: 'experienced' },
    { id: 's-w-4', caregiver_id: 'cg-1-wimon', case_type: 'wound_care', comfort_level: 'experienced' },
    { id: 's-w-5', caregiver_id: 'cg-1-wimon', case_type: 'stroke', comfort_level: 'experienced' },
    { id: 's-w-6', caregiver_id: 'cg-1-wimon', case_type: 'diabetes_insulin', comfort_level: 'experienced' },
    { id: 's-w-7', caregiver_id: 'cg-1-wimon', case_type: 'hospital_escort', comfort_level: 'trained' },
    { id: 's-w-8', caregiver_id: 'cg-1-wimon', case_type: 'physical_therapy', comfort_level: 'trained' },
    { id: 's-w-9', caregiver_id: 'cg-1-wimon', case_type: 'palliative_care', comfort_level: 'trained' },
    { id: 's-w-10', caregiver_id: 'cg-1-wimon', case_type: 'general_elderly', comfort_level: 'experienced' },
    { id: 's-w-11', caregiver_id: 'cg-1-wimon', case_type: 'dementia', comfort_level: 'willing_to_learn' },
    { id: 's-w-12', caregiver_id: 'cg-1-wimon', case_type: 'post_surgery', comfort_level: 'experienced' },
  ],
  'cg-2-supaporn': [
    { id: 's-sp-1', caregiver_id: 'cg-2-supaporn', case_type: 'stroke', comfort_level: 'experienced' },
    { id: 's-sp-2', caregiver_id: 'cg-2-supaporn', case_type: 'bedridden', comfort_level: 'experienced' },
    { id: 's-sp-3', caregiver_id: 'cg-2-supaporn', case_type: 'physical_therapy', comfort_level: 'experienced' },
    { id: 's-sp-4', caregiver_id: 'cg-2-supaporn', case_type: 'hospital_escort', comfort_level: 'experienced' },
    { id: 's-sp-5', caregiver_id: 'cg-2-supaporn', case_type: 'general_elderly', comfort_level: 'experienced' },
    { id: 's-sp-6', caregiver_id: 'cg-2-supaporn', case_type: 'tube_feeding', comfort_level: 'trained' },
    { id: 's-sp-7', caregiver_id: 'cg-2-supaporn', case_type: 'wound_care', comfort_level: 'trained' },
    { id: 's-sp-8', caregiver_id: 'cg-2-supaporn', case_type: 'diabetes_insulin', comfort_level: 'trained' },
    { id: 's-sp-9', caregiver_id: 'cg-2-supaporn', case_type: 'post_surgery', comfort_level: 'trained' },
    { id: 's-sp-10', caregiver_id: 'cg-2-supaporn', case_type: 'dementia', comfort_level: 'willing_to_learn' },
    { id: 's-sp-11', caregiver_id: 'cg-2-supaporn', case_type: 'tracheostomy_suction', comfort_level: 'willing_to_learn' },
    { id: 's-sp-12', caregiver_id: 'cg-2-supaporn', case_type: 'palliative_care', comfort_level: 'willing_to_learn' },
  ],
  'cg-3-malee': [
    { id: 's-m-1', caregiver_id: 'cg-3-malee', case_type: 'dementia', comfort_level: 'experienced' },
    { id: 's-m-2', caregiver_id: 'cg-3-malee', case_type: 'general_elderly', comfort_level: 'experienced' },
    { id: 's-m-3', caregiver_id: 'cg-3-malee', case_type: 'hospital_escort', comfort_level: 'experienced' },
    { id: 's-m-4', caregiver_id: 'cg-3-malee', case_type: 'bedridden', comfort_level: 'experienced' },
    { id: 's-m-5', caregiver_id: 'cg-3-malee', case_type: 'diabetes_insulin', comfort_level: 'trained' },
    { id: 's-m-6', caregiver_id: 'cg-3-malee', case_type: 'stroke', comfort_level: 'trained' },
    { id: 's-m-7', caregiver_id: 'cg-3-malee', case_type: 'wound_care', comfort_level: 'willing_to_learn' },
    { id: 's-m-8', caregiver_id: 'cg-3-malee', case_type: 'physical_therapy', comfort_level: 'willing_to_learn' },
    { id: 's-m-9', caregiver_id: 'cg-3-malee', case_type: 'tube_feeding', comfort_level: 'willing_to_learn' },
    { id: 's-m-10', caregiver_id: 'cg-3-malee', case_type: 'post_surgery', comfort_level: 'willing_to_learn' },
    { id: 's-m-11', caregiver_id: 'cg-3-malee', case_type: 'tracheostomy_suction', comfort_level: 'not_comfortable' },
    { id: 's-m-12', caregiver_id: 'cg-3-malee', case_type: 'palliative_care', comfort_level: 'willing_to_learn' },
  ],
  'cg-4-karn': [
    { id: 's-k-1', caregiver_id: 'cg-4-karn', case_type: 'general_elderly', comfort_level: 'experienced' },
    { id: 's-k-2', caregiver_id: 'cg-4-karn', case_type: 'hospital_escort', comfort_level: 'experienced' },
    { id: 's-k-3', caregiver_id: 'cg-4-karn', case_type: 'physical_therapy', comfort_level: 'experienced' },
    { id: 's-k-4', caregiver_id: 'cg-4-karn', case_type: 'post_surgery', comfort_level: 'trained' },
    { id: 's-k-5', caregiver_id: 'cg-4-karn', case_type: 'bedridden', comfort_level: 'trained' },
    { id: 's-k-6', caregiver_id: 'cg-4-karn', case_type: 'dementia', comfort_level: 'willing_to_learn' },
    { id: 's-k-7', caregiver_id: 'cg-4-karn', case_type: 'stroke', comfort_level: 'willing_to_learn' },
    { id: 's-k-8', caregiver_id: 'cg-4-karn', case_type: 'wound_care', comfort_level: 'willing_to_learn' },
    { id: 's-k-9', caregiver_id: 'cg-4-karn', case_type: 'diabetes_insulin', comfort_level: 'willing_to_learn' },
    { id: 's-k-10', caregiver_id: 'cg-4-karn', case_type: 'tube_feeding', comfort_level: 'not_comfortable' },
    { id: 's-k-11', caregiver_id: 'cg-4-karn', case_type: 'tracheostomy_suction', comfort_level: 'not_comfortable' },
    { id: 's-k-12', caregiver_id: 'cg-4-karn', case_type: 'palliative_care', comfort_level: 'not_comfortable' },
  ],
};

export const MOCK_CERTIFICATES: Record<string, Certificate[]> = {
  'cg-1-wimon': [
    {
      id: 'cert-1',
      caregiver_id: 'cg-1-wimon',
      file_path: 'cg-1-wimon/pn-diploma.jpg',
      file_name: 'ใบประกาศนียบัตรผู้ช่วยพยาบาล (PN) 1 ปี',
      verification_status: 'verified',
      cert_type: 'หลักสูตรผู้ช่วยพยาบาล (Practical Nurse)',
      issued_by: 'วิทยาลัยพยาบาลบรมราชชนนี',
      preview_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
      created_at: '2026-10-01T08:00:00Z',
    },
    {
      id: 'cert-2',
      caregiver_id: 'cg-1-wimon',
      file_path: 'cg-1-wimon/suction-wound-training.jpg',
      file_name: 'ใบผ่านการอบรมการเจาะคอ ดูดเสมหะ และการทำแผลปลอดเชื้อ',
      verification_status: 'verified',
      cert_type: 'หัตถการทางการพยาบาลขั้นสูง',
      issued_by: 'คณะแพทยศาสตร์ โรงพยาบาลรามาธิบดี',
      preview_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
      created_at: '2026-10-01T08:10:00Z',
    },
  ],
  'cg-2-supaporn': [
    {
      id: 'cert-3',
      caregiver_id: 'cg-2-supaporn',
      file_path: 'cg-2-supaporn/na-certificate.jpg',
      file_name: 'ประกาศนียบัตรพนักงานช่วยการพยาบาล (NA 840 ชม.)',
      verification_status: 'verified',
      cert_type: 'หลักสูตรผู้ดูแลผู้ป่วย (Nurse Aide)',
      issued_by: 'สถาบันฝึกอบรมวิชาชีพการพยาบาลเอกชน',
      preview_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
      created_at: '2026-10-05T09:30:00Z',
    },
  ],
  'cg-3-malee': [
    {
      id: 'cert-4',
      caregiver_id: 'cg-3-malee',
      file_path: 'cg-3-malee/elderly-care-standard.jpg',
      file_name: 'หนังสือรับรองมาตรฐานฝีมือแรงงาน สาขาผู้ดูแลผู้สูงอายุ',
      verification_status: 'verified',
      cert_type: 'มาตรฐานฝีมือแรงงานแห่งชาติ ระดับ 1',
      issued_by: 'กรมพัฒนาฝีมือแรงงาน กระทรวงแรงงาน',
      preview_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
      created_at: '2026-10-10T11:15:00Z',
    },
  ],
  'cg-4-karn': [
    {
      id: 'cert-5',
      caregiver_id: 'cg-4-karn',
      file_path: 'cg-4-karn/basic-cg.jpg',
      file_name: 'วุฒิบัตรการปฐมพยาบาลเบื้องต้นและ CPR',
      verification_status: 'pending',
      cert_type: 'การปฐมพยาบาลฉุกเฉินและกู้ชีพ',
      issued_by: 'สภากาชาดไทย',
      preview_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
      created_at: '2026-10-15T13:45:00Z',
    },
  ],
};

export const MOCK_AI_WORKER_PROFILES: Record<string, AIWorkerProfile> = {
  'cg-1-wimon': {
    id: 'ai-wp-1',
    caregiver_id: 'cg-1-wimon',
    profile_text:
      'ดิฉันเป็นผู้ช่วยพยาบาล (PN) ประสบการณ์ 8 ปี เชี่ยวชาญการดูแลผู้ป่วยติดเตียงขั้นสูง ดูดเสมหะผ่านท่อเจาะคอ ให้อาหารทางสายยาง และล้างแผลกดทับปลอดเชื้อ เคยดูแลผู้ป่วยสโตรกและผู้ป่วยพักฟื้นผ่าตัดในหอผู้ป่วยหนักและตามบ้าน มีความรู้เรื่องการคุมอาหารเบาหวานและการฉีดอินซูลิน เป็นคนใจเย็น ละเอียดรอบคอบ และเคารพความเป็นส่วนตัวของผู้ป่วย',
    summary_headline: 'ผู้ช่วยพยาบาล (PN) ประสบการณ์ 8 ปี • เชี่ยวชาญเจาะคอ ดูดเสมหะ แผลกดทับ และสายยาง',
    key_strengths: [
      'หัตถการทางการพยาบาลเฉพาะทาง (ดูดเสมหะ, ฟีดอาหาร, ฉีดอินซูลิน)',
      'ป้องกันภาวะแทรกซ้อนในผู้ป่วยติดเตียงและสโตรกอย่างถูกต้อง',
      'มีใบประกาศนียบัตร PN 1 ปี และผ่านการอบรมหัตถการเฉพาะทาง',
      'รับงานได้ทั้งอยู่ประจำ (Live-in) และไป-กลับ',
    ],
    is_active: true,
    prompt_version: 'v3.2_thai_natural',
    input_hash: 'hash_wimon_v3',
    created_at: '2026-10-01T08:30:00Z',
  },
  'cg-2-supaporn': {
    id: 'ai-wp-2',
    caregiver_id: 'cg-2-supaporn',
    profile_text:
      'ดิฉันผ่านหลักสูตรพนักงานช่วยการพยาบาล (NA) มีประสบการณ์ดูแลผู้สูงอายุและผู้ป่วยสโตรกมา 5 ปี ถนัดการทำกายภาพบำบัดเบื้องต้น ยืดเหยียดข้อต่อเพื่อป้องกันข้อยึดติด ช่วยพลิกตัวและทำความสะอาดร่างกายอย่างนุ่มนวล พร้อมช่วยพาผู้สูงอายุไปตรวจรักษาที่โรงพยาบาล สื่อสารชัดเจนและรายงานอาการกับครอบครัวอย่างสม่ำเสมอ',
    summary_headline: 'พนักงานช่วยการพยาบาล (NA) 5 ปี • ถนัดฟื้นฟูกายภาพสโตรก พลิกตัว และพาพบแพทย์',
    key_strengths: [
      'ทำกายภาพบำบัดและฝึกเดินสำหรับผู้ป่วยกล้ามเนื้ออ่อนแรงครึ่งซีก',
      'ชำนาญการพลิกตัว การประคองพยุง และดูแลสุขอนามัย',
      'มีรถยนต์ส่วนตัว สะดวกเดินทางในโซนนนทบุรีและกรุงเทพฯ',
    ],
    is_active: true,
    prompt_version: 'v3.2_thai_natural',
    input_hash: 'hash_supaporn_v3',
    created_at: '2026-10-05T09:45:00Z',
  },
  'cg-3-malee': {
    id: 'ai-wp-3',
    caregiver_id: 'cg-3-malee',
    profile_text:
      'ป้ามีประสบการณ์ดูแลผู้สูงอายุติดบ้านและผู้ป่วยสมองเสื่อมอัลไซเมอร์มากว่า 12 ปี เข้าใจอารมณ์และความเปลี่ยนแปลงของผู้สูงอายุเป็นอย่างดี ใจเย็น ไม่หงุดหงิดเวลาผู้สูงอายุถามซ้ำ ช่วยจัดเตรียมอาหารสุขภาพที่เคี้ยวง่าย จัดยาตามแพทย์สั่ง พาเดินเล่นเป็นเพื่อนคุย อยู่ประจำได้ ไม่ทิ้งงาน ซื่อสัตย์ ไว้วางใจได้เหมือนคนในครอบครัว',
    summary_headline: 'ผู้ดูแลใจเย็น ประสบการณ์ 12 ปี • เชี่ยวชาญสมองเสื่อม อัลไซเมอร์ อาหารสุขภาพ และงานอยู่ประจำ',
    key_strengths: [
      'ประสบการณ์สูง 12 ปี เข้าใจจิตวิทยาผู้สูงอายุและผู้ป่วยสมองเสื่อม',
      'ปรุงอาหารสำหรับผู้สูงอายุและโรคเรื้อรังได้รสชาติดี',
      'พร้อมอยู่ประจำ (Live-in) ดูแลใกล้ชิดตลอด 24 ชม.',
    ],
    is_active: true,
    prompt_version: 'v3.2_thai_natural',
    input_hash: 'hash_malee_v3',
    created_at: '2026-10-10T11:30:00Z',
  },
  'cg-4-karn': {
    id: 'ai-wp-4',
    caregiver_id: 'cg-4-karn',
    profile_text:
      'ผมเป็นผู้ดูแลสุขภาพผู้สูงอายุวัยหนุ่ม แข็งแรง คล่องแคล่ว มีประสบการณ์ 3 ปีในการช่วยพยุงเดิน ทำกายภาพบำบัด และพาไปโรงพยาบาลตามนัด ทราบขั้นตอนการติดต่อแพทย์และเบิกยาตามโรงพยาบาลรัฐและเอกชน มีความอดทน สุภาพ และมีทักษะการปฐมพยาบาลเบื้องต้น',
    summary_headline: 'ผู้ดูแลรุ่นใหม่ คล่องแคล่ว แข็งแรง • ถนัดพยุงเดิน กายภาพ พาพบแพทย์ รพ.',
    key_strengths: [
      'ร่างกายแข็งแรง สามารถช่วยยกพยุงผู้ป่วยรูปร่างใหญ่ได้อย่างปลอดภัย',
      'คล่องตัวในการพาไปโรงพยาบาล เข็นรถเข็น และติดต่อหน่วยงาน',
      'คิดค่าบริการเป็นรายวัน เหมาะกับงานเฉพาะกิจหรือทดลองงาน',
    ],
    is_active: true,
    prompt_version: 'v3.2_thai_natural',
    input_hash: 'hash_karn_v3',
    created_at: '2026-10-15T14:00:00Z',
  },
};

export const MOCK_JOB_POSTS: JobPost[] = [
  {
    id: 'job-1-wanwimon',
    family_id: 'fam-1-wanwimon',
    patient_description:
      'คุณแม่วัย 78 ปี เป็นสโตรกหลอดเลือดสมอง อ่อนแรงซีกขวา นอนติดเตียง ต้องการคนช่วยพลิกตัวทุก 2 ชั่วโมง ให้อาหารทางสายยาง NG tube 4 มื้อ ล้างแผลกดทับที่สะโพก และช่วยทำกายภาพยืดเหยียดแขนขา มีภาวะเบาหวานต้องเจาะน้ำตาลปลายนิ้วและควบคุมอาหาร อยากได้คนใจเย็น มีประสบการณ์ดูแลผู้ป่วยติดเตียง พักอยู่ประจำกับคุณแม่ได้',
    work_arrangement: 'live_in',
    province: 'กรุงเทพมหานคร',
    district: 'ลาดพร้าว',
    preferred_caregiver_gender: 'female',
    expected_wage: 26000,
    wage_unit: 'month',
    start_date: '2026-11-15',
    extra_answers: { room_provided: true, wifi: true, meals_included: true },
    status: 'open',
    expires_at: '2026-12-05T00:00:00Z',
    closed_at: null,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
  {
    id: 'job-2-thanapol',
    family_id: 'fam-2-thanapol',
    patient_description:
      'คุณพ่ออายุ 82 ปี เป็นอัลไซเมอร์ระยะแรก ความจำเริ่มสับสน ชอบเดินออกจากบ้านถ้าไม่มีคนเฝ้า ร่างกายยังเดินได้แข็งแรง ต้องการผู้ดูแลไป-กลับ 8:00 - 17:00 น. วันจันทร์-ศุกร์ ช่วยดูแลเรื่องยา จัดอาหาร พาเดินออกกำลังกายในหมู่บ้าน และพาไปพบแพทย์ตามนัดที่โรงพยาบาลรามาฯ เดือนละ 1-2 ครั้ง',
    work_arrangement: 'daily',
    province: 'กรุงเทพมหานคร',
    district: 'พญาไท',
    preferred_caregiver_gender: 'any',
    expected_wage: 20000,
    wage_unit: 'month',
    start_date: '2026-11-20',
    extra_answers: { hours: '8:00-17:00', weekend_off: true },
    status: 'open',
    expires_at: '2026-12-10T00:00:00Z',
    closed_at: null,
    created_at: '2026-10-22T14:00:00Z',
    updated_at: '2026-10-22T14:00:00Z',
  },
];

export const MOCK_JOB_LOCATIONS: Record<string, JobPostLocation> = {
  'job-1-wanwimon': {
    job_post_id: 'job-1-wanwimon',
    address_text: 'หมู่บ้านเสนานิเวศน์ โครงการ 1 ซอย 118 ถนนเสนานิคม 1 แขวงจรเข้บัว เขตลาดพร้าว กทม.',
    lat: 13.818,
    lng: 100.601,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
  'job-2-thanapol': {
    job_post_id: 'job-2-thanapol',
    address_text: 'คอนโดมิเนียม ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กทม.',
    lat: 13.782,
    lng: 100.545,
    created_at: '2026-10-22T14:00:00Z',
    updated_at: '2026-10-22T14:00:00Z',
  },
};

export const MOCK_JOB_CASE_NEEDS: Record<string, JobPostCaseNeed[]> = {
  'job-1-wanwimon': [
    { id: 'need-1-1', job_post_id: 'job-1-wanwimon', case_type: 'bedridden', is_required: true },
    { id: 'need-1-2', job_post_id: 'job-1-wanwimon', case_type: 'stroke', is_required: true },
    { id: 'need-1-3', job_post_id: 'job-1-wanwimon', case_type: 'tube_feeding', is_required: true },
    { id: 'need-1-4', job_post_id: 'job-1-wanwimon', case_type: 'wound_care', is_required: true },
    { id: 'need-1-5', job_post_id: 'job-1-wanwimon', case_type: 'physical_therapy', is_required: false },
    { id: 'need-1-6', job_post_id: 'job-1-wanwimon', case_type: 'diabetes_insulin', is_required: true },
  ],
  'job-2-thanapol': [
    { id: 'need-2-1', job_post_id: 'job-2-thanapol', case_type: 'dementia', is_required: true },
    { id: 'need-2-2', job_post_id: 'job-2-thanapol', case_type: 'general_elderly', is_required: true },
    { id: 'need-2-3', job_post_id: 'job-2-thanapol', case_type: 'hospital_escort', is_required: true },
  ],
};

export const MOCK_MATCHES: MatchRow[] = [
  {
    id: 'match-1-wanwimon-wimon',
    job_post_id: 'job-1-wanwimon',
    caregiver_id: 'cg-1-wimon',
    caregiver_decision: 'like',
    family_decision: 'like',
    caregiver_decided_at: '2026-11-05T09:15:00Z',
    family_decided_at: '2026-11-05T10:30:00Z',
    matched_at: '2026-11-05T10:30:00Z', // MUTUALLY MATCHED!
    created_at: '2026-11-05T09:15:00Z',
  },
  {
    id: 'match-2-wanwimon-supaporn',
    job_post_id: 'job-1-wanwimon',
    caregiver_id: 'cg-2-supaporn',
    caregiver_decision: 'like',
    family_decision: null, // waiting for family
    caregiver_decided_at: '2026-11-06T08:00:00Z',
    family_decided_at: null,
    matched_at: null,
    created_at: '2026-11-06T08:00:00Z',
  },
  {
    id: 'match-3-thanapol-malee',
    job_post_id: 'job-2-thanapol',
    caregiver_id: 'cg-3-malee',
    caregiver_decision: null,
    family_decision: 'like', // family liked first
    caregiver_decided_at: null,
    family_decided_at: '2026-11-06T14:20:00Z',
    matched_at: null,
    created_at: '2026-11-06T14:20:00Z',
  },
];

export const MOCK_FAVORITES: FavoriteRow[] = [
  {
    id: 'fav-1',
    family_id: 'fam-1-wanwimon',
    caregiver_id: 'cg-1-wimon',
    created_at: '2026-11-04T12:00:00Z',
  },
];

export const MOCK_NOTIFICATIONS: NotificationRow[] = [
  {
    id: 'notif-1',
    user_id: 'fam-1-wanwimon',
    title: 'จับคู่สำเร็จกับพี่วิมล ชัยชนะ!',
    message: 'คุณและพี่วิมลแสดงความสนใจซึ่งกันและกันแล้ว สามารถเปิดดูข้อมูลติดต่อเพื่อพูดคุยได้ทันที',
    link_url: '/matches',
    read_at: null,
    line_sent_at: '2026-11-05T10:31:00Z',
    created_at: '2026-11-05T10:30:05Z',
  },
  {
    id: 'notif-2',
    user_id: 'cg-1-wimon',
    title: 'จับคู่สำเร็จกับครอบครัววรรณวิมล!',
    message: 'ครอบครัววรรณวิมลได้ตอบรับความสนใจของคุณแล้ว สามารถเปิดดูเบอร์และ LINE เพื่อเริ่มงานได้ทันที',
    link_url: '/matches',
    read_at: null,
    line_sent_at: '2026-11-05T10:31:00Z',
    created_at: '2026-11-05T10:30:05Z',
  },
  {
    id: 'notif-3',
    user_id: 'fam-1-wanwimon',
    title: 'มีผู้ดูแลสนใจงานของคุณ: คุณสุภาพร ใจการุณย์',
    message: 'ผู้ช่วยพยาบาล (NA) สนใจงานดูแลคุณแม่ของคุณ เข้ามาดูโปรไฟล์และตัดสินใจได้เลย',
    link_url: '/family/applicants',
    read_at: null,
    line_sent_at: '2026-11-06T08:01:00Z',
    created_at: '2026-11-06T08:00:10Z',
  },
];

export const MOCK_REVIEWS: PlatformReview[] = [
  {
    id: 'rev-1',
    user_id: 'fam-1-wanwimon',
    ease_of_use_score: 5,
    clarity_score: 5,
    recommendation_score: 5,
    comment: 'ใช้งานง่ายมาก ไม่ต้องผ่านนายหน้าหักหัวคิว ได้คุยกับพี่วิมลโดยตรง รู้สึกมั่นใจมากค่ะ',
    created_at: '2026-11-06T15:00:00Z',
  },
];

export const MOCK_AI_APPLICANT_SUMMARIES: Record<string, AIApplicantSummary> = {
  'job-1-wanwimon:cg-1-wimon': {
    id: 'sum-1-1',
    job_post_id: 'job-1-wanwimon',
    caregiver_id: 'cg-1-wimon',
    summary_text:
      'พี่วิมลตรงกับเงื่อนไขหลักของงานนี้ถึง 95% เป็นพยาบาลผู้ช่วย (PN) มีประสบการณ์ 8 ปี เชี่ยวชาญการดูแลผู้ป่วยติดเตียงสโตรก ฟีดอาหารสายยาง NG tube ทำแผลกดทับ และฉีดอินซูลิน พร้อมอยู่ประจำ (Live-in) และอยู่ในเขตลาดพร้าวใกล้เคียง (ห่าง 4.2 กม.)',
    fit_score: 95,
    fit_rationale: {
      pros: [
        'ทักษะตรงครบทุกข้อที่จำเป็น: ติดเตียง, สโตรก, สายยาง, ทำแผลกดทับ, ฉีดอินซูลิน',
        'มีใบประกาศนียบัตร PN 1 ปี และใบอบรมหัตถการเฉพาะทาง ตรวจสอบแล้ว',
        'พร้อมทำงานแบบอยู่ประจำ (Live-in) ตามที่ครอบครัวต้องการ',
        'ระยะทางใกล้เคียงเพียง 4.2 กม.',
      ],
      to_verify: [
        'ควรตกลงเรื่องรอบเวลาการพลิกตัวช่วงกลางคืนและวันหยุดประจำสัปดาห์',
        'ตรวจสอบแผนการให้อาหารสายยางและยี่ห้ออินซูลินที่คุณแม่ใช้อยู่',
      ],
    },
    is_active: true,
    created_at: '2026-10-21T08:00:00Z',
  },
  'job-1-wanwimon:cg-2-supaporn': {
    id: 'sum-1-2',
    job_post_id: 'job-1-wanwimon',
    caregiver_id: 'cg-2-supaporn',
    summary_text:
      'คุณสุภาพรมีความชำนาญสูงด้านกายภาพฟื้นฟูสโตรกและการพลิกตัวผู้ป่วยติดเตียง (NA 5 ปี) มีใบรับรอง NA แต่ในโปรไฟล์ระบุสะดวกงานไป-กลับเป็นหลัก หากต้องการให้อยู่ประจำควรสอบถามเพิ่มเติม',
    fit_score: 78,
    fit_rationale: {
      pros: [
        'ชำนาญการทำกายภาพสโตรกและพลิกตัวผู้ป่วยติดเตียงเป็นอย่างดี',
        'ผ่านการอบรมฟีดสายยางและทำแผลแล้ว',
        'งบประมาณอยู่ในเกณฑ์ที่ครอบครัวตั้งไว้',
      ],
      to_verify: [
        'ครอบครัวต้องการคนอยู่ประจำ แต่คุณสุภาพรระบุต้องการงานไป-กลับ (Daily)',
        'ทักษะการฉีดอินซูลินผ่านการอบรมแต่ยังไม่มีประสบการณ์หน้างานเคสหนัก',
      ],
    },
    is_active: true,
    created_at: '2026-10-21T08:05:00Z',
  },
  'job-1-wanwimon:cg-3-malee': {
    id: 'sum-1-3',
    job_post_id: 'job-1-wanwimon',
    caregiver_id: 'cg-3-malee',
    summary_text:
      'ป้ามาลีมีประสบการณ์ยาวนาน 12 ปี พร้อมอยู่ประจำ และชำนาญการดูแลผู้ป่วยติดเตียงและจัดยาเบาหวาน แต่ทักษะด้านการฟีดสายยางและการทำแผลกดทับยังเป็นระดับพร้อมเรียนรู้',
    fit_score: 71,
    fit_rationale: {
      pros: [
        'ประสบการณ์สูง 12 ปี มีความอดทนและใจเย็นมาก',
        'พร้อมทำงานอยู่ประจำ (Live-in) ไม่ติดปัญหาการเดินทาง',
        'ค่าจ้างประหยัดกว่างบประมาณที่ตั้งไว้',
      ],
      to_verify: [
        'ยังไม่เคยทำแผลกดทับระดับลึกและสายยาง NG tube ด้วยตนเองอย่างเป็นทางการ',
      ],
    },
    is_active: true,
    created_at: '2026-10-21T08:10:00Z',
  },
  'job-1-wanwimon:cg-4-karn': {
    id: 'sum-1-4',
    job_post_id: 'job-1-wanwimon',
    caregiver_id: 'cg-4-karn',
    summary_text:
      'น้องกานต์ร่างกายแข็งแรง ช่วยพยุงและกายภาพได้ดี แต่ไม่สะดวกการให้อาหารทางสายยางและงานอยู่ประจำ เหมาะกับงานช่วยพยุงเดินเฉพาะกิจมากกว่า',
    fit_score: 52,
    fit_rationale: {
      pros: [
        'ร่างกายแข็งแรง ช่วยพลิกตัวและทำกายภาพได้คล่องแคล่ว',
        'อยู่ใกล้พื้นที่ลาดพร้าว (ห่างประมาณ 6 กม.)',
      ],
      to_verify: [
        'ระบุไม่สะดวกทำเคสสายยาง (Tube Feeding) ซึ่งเป็นเงื่อนไขจำเป็น',
        'รับเฉพาะงานไป-กลับรายวัน',
      ],
    },
    is_active: true,
    created_at: '2026-10-21T08:15:00Z',
  },
};
