/**
 * JobGist with Care - Supabase Database Schema v3 TypeScript Definitions
 * 
 * Complies strictly with Schema v3 specification:
 * - 2 roles: caregiver | family
 * - 4 caregiver care roles: caregiver | nurse_aide | practical_nurse | informal
 * - 2 work arrangements: daily | live_in
 * - 3 wage units: month | day | hour
 * - 12 Standard Care Conditions (case_types)
 * - 4 Comfort Levels: experienced | trained | willing_to_learn | not_comfortable (qualified if experienced | trained)
 * - Job status: draft | open | closed | expired
 * - Swipe decisions: like | pass
 * - Private locations & contacts concealed until mutual match
 */

export type UserRole = 'caregiver' | 'family';

export type CareRole = 'caregiver' | 'nurse_aide' | 'practical_nurse' | 'informal';

export type WorkArrangement = 'daily' | 'live_in';

export type WageUnit = 'month' | 'day' | 'hour';

export type JobStatus = 'draft' | 'open' | 'closed' | 'expired';

export type SwipeDecision = 'like' | 'pass';

export type ComfortLevel = 'experienced' | 'trained' | 'willing_to_learn' | 'not_comfortable';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type CaregiverGenderPreference = 'any' | 'female' | 'male';

export type CaseTypeCode =
  | 'bedridden'
  | 'tube_feeding'
  | 'dementia'
  | 'stroke'
  | 'post_surgery'
  | 'wound_care'
  | 'hospital_escort'
  | 'general_elderly'
  | 'tracheostomy_suction'
  | 'physical_therapy'
  | 'diabetes_insulin'
  | 'palliative_care';

export interface CaseType {
  code: CaseTypeCode;
  title_th: string;
  short_label_th: string;
  description_th: string;
  category: 'general' | 'medical' | 'rehab';
  keywords: string[];
}

export const CASE_TYPES_V3: Record<CaseTypeCode, CaseType> = {
  bedridden: {
    code: 'bedridden',
    title_th: 'ผู้ป่วยติดเตียง',
    short_label_th: 'ติดเตียง',
    description_th: 'ผู้ป่วยที่ไม่สามารถขยับตัวหรือลุกนั่งได้เอง ต้องพลิกตัวและดูแลความสะอาด',
    category: 'medical',
    keywords: ['ติดเตียง', 'นอนติดเตียง', 'ขยับตัวไม่ได้', 'พลิกตัว', 'ไม่ลุก', 'แผลกดทับ'],
  },
  tube_feeding: {
    code: 'tube_feeding',
    title_th: 'ให้อาหารทางสายยาง',
    short_label_th: 'สายยาง',
    description_th: 'การให้อาหารทางสายยาง (NG tube / PEG) การบดอาหาร ยา และทำความสะอาดสาย',
    category: 'medical',
    keywords: ['สายยาง', 'ฟีดอาหาร', 'ให้อาหารทางสาย', 'NG tube', 'PEG', 'ปั่นอาหาร'],
  },
  dementia: {
    code: 'dementia',
    title_th: 'สมองเสื่อม / อัลไซเมอร์',
    short_label_th: 'สมองเสื่อม',
    description_th: 'ความจำถดถอย สับสน หลงลืม อารมณ์แปรปรวน หรือมีพฤติกรรมเดินออกจากบ้าน',
    category: 'general',
    keywords: ['สมองเสื่อม', 'อัลไซเมอร์', 'หลงลืม', 'จำไม่ได้', 'สับสน', 'ก้าวร้าว', 'เดินหาย'],
  },
  stroke: {
    code: 'stroke',
    title_th: 'โรคหลอดเลือดสมอง (สโตรก)',
    short_label_th: 'สโตรก',
    description_th: 'อัมพฤกษ์ อัมพาต แขนขาอ่อนแรงครึ่งซีก ปากเบี้ยว กลืนลำบาก',
    category: 'medical',
    keywords: ['สโตรก', 'stroke', 'หลอดเลือดสมอง', 'อัมพฤกษ์', 'อัมพาต', 'แขนขาอ่อนแรง', 'ปากเบี้ยว', 'กลืนลำบาก'],
  },
  post_surgery: {
    code: 'post_surgery',
    title_th: 'ฟื้นฟูหลังผ่าตัด',
    short_label_th: 'หลังผ่าตัด',
    description_th: 'ดูแลการพักฟื้น ระวังภาวะแทรกซ้อน พยุงเดิน และทำตามคำสั่งแพทย์เฉพาะทาง',
    category: 'rehab',
    keywords: ['หลังผ่าตัด', 'ผ่าตัด', 'พักฟื้น', 'แผลผ่าตัด', 'ผ่าข้อเข่า', 'ผ่าสะโพก'],
  },
  wound_care: {
    code: 'wound_care',
    title_th: 'ทำแผล / ล้างแผลกดทับ',
    short_label_th: 'ทำแผล',
    description_th: 'การทำแผลปลอดเชื้อ แผลกดทับระดับต่างๆ หรือแผลเรื้อรัง',
    category: 'medical',
    keywords: ['ทำแผล', 'ล้างแผล', 'แผลกดทับ', 'แผลเรื้อรัง', 'ทำความสะอาดแผล', 'dressing'],
  },
  hospital_escort: {
    code: 'hospital_escort',
    title_th: 'พาพบแพทย์ / ไปโรงพยาบาล',
    short_label_th: 'พาพบแพทย์',
    description_th: 'เดินทางเป็นเพื่อน เข็นรถเข็น รอรับยา ฟังคำอธิบายแพทย์ และสรุปให้ญาติ',
    category: 'general',
    keywords: ['พาพบแพทย์', 'ไปโรงพยาบาล', 'พาไปหาหมอ', 'นัดหมอ', 'รถเข็น', 'พาตรวจ'],
  },
  general_elderly: {
    code: 'general_elderly',
    title_th: 'ดูแลผู้สูงอายุทั่วไป',
    short_label_th: 'ผู้สูงอายุทั่วไป',
    description_th: 'ช่วยเหลือกิจวัตรประจำวัน อาบน้ำ เตรียมอาหาร พยุงเดิน เป็นเพื่อนคุย',
    category: 'general',
    keywords: ['ผู้สูงอายุ', 'คนแก่', 'ช่วยพยุง', 'อาบน้ำ', 'เพื่อนคุย', 'เตรียมอาหาร', 'ตามวัย'],
  },
  tracheostomy_suction: {
    code: 'tracheostomy_suction',
    title_th: 'เจาะคอ / ดูดเสมหะ',
    short_label_th: 'เจาะคอ/ดูดเสมหะ',
    description_th: 'การดูแลท่อช่วยหายใจทางคอ ดูดเสมหะด้วยเครื่องดูดปลอดเชื้อ และพ่นยา',
    category: 'medical',
    keywords: ['เจาะคอ', 'ดูดเสมหะ', 'suction', 'ท่อเจาะคอ', 'เสมหะเหนียว', 'พ่นยา'],
  },
  physical_therapy: {
    code: 'physical_therapy',
    title_th: 'กายภาพบำบัด / ออกกำลังกายฟื้นฟู',
    short_label_th: 'กายภาพ',
    description_th: 'ยืดเหยียดกล้ามเนื้อ ฝึกขยับข้อต่อ ป้องกันข้อยึดติด และฝึกก้าวเดิน',
    category: 'rehab',
    keywords: ['กายภาพ', 'กายภาพบำบัด', 'ยืดเหยียด', 'ข้อยึด', 'ดัดข้อ', 'ฝึกเดิน', 'ฟื้นฟูกล้ามเนื้อ'],
  },
  diabetes_insulin: {
    code: 'diabetes_insulin',
    title_th: 'เบาหวาน / ฉีดอินซูลิน',
    short_label_th: 'เบาหวาน/ฉีดอินซูลิน',
    description_th: 'เจาะน้ำตาลปลายนิ้ว คุมอาหารเบาหวาน และฉีดยาอินซูลินตามเวลา',
    category: 'medical',
    keywords: ['เบาหวาน', 'อินซูลิน', 'ฉีดอินซูลิน', 'เจาะน้ำตาล', 'DTX', 'คุมน้ำตาล'],
  },
  palliative_care: {
    code: 'palliative_care',
    title_th: 'ระยะประคับประคอง (Palliative Care)',
    short_label_th: 'ระยะประคับประคอง',
    description_th: 'ดูแลด้านความสุขสบาย ลดความเจ็บปวด ดูแลจิตใจผู้ป่วยและครอบครัว',
    category: 'medical',
    keywords: ['ประคับประคอง', 'palliative', 'ระยะสุดท้าย', 'ลดความปวด', 'ดูแลจิตใจ', 'สุขสบาย'],
  },
};

export const CARE_ROLES_META: Record<CareRole, { label_th: string; desc_th: string; abbr: string }> = {
  caregiver: {
    label_th: 'ผู้ดูแลผู้สูงอายุ (Caregiver)',
    desc_th: 'ผ่านการอบรมการดูแลผู้สูงอายุขั้นพื้นฐาน ช่วยเหลือกิจวัตรประจำวัน',
    abbr: 'CG',
  },
  nurse_aide: {
    label_th: 'พนักงานช่วยการพยาบาล (NA)',
    desc_th: 'ผ่านหลักสูตรประกาศนียบัตร NA ช่วยเหลือหัตถการทางการพยาบาลเบื้องต้น',
    abbr: 'NA',
  },
  practical_nurse: {
    label_th: 'ผู้ช่วยพยาบาล (PN)',
    desc_th: 'ผ่านหลักสูตรประกาศนียบัตร PN 1 ปี มีความชำนาญหัตถการทางการแพทย์',
    abbr: 'PN',
  },
  informal: {
    label_th: 'ผู้ดูแลที่มีประสบการณ์ (Home Caregiver)',
    desc_th: 'มีประสบการณ์ดูแลคนในครอบครัวหรือผ่านงานดูแลผู้ป่วยจริง',
    abbr: 'HC',
  },
};

export const COMFORT_LEVEL_META: Record<ComfortLevel, { label_th: string; is_qualified: boolean; color: string }> = {
  experienced: {
    label_th: 'เคยทำจริง',
    is_qualified: true,
    color: 'bg-emerald-100 text-emerald-900 border-emerald-900',
  },
  trained: {
    label_th: 'ผ่านการอบรม',
    is_qualified: true,
    color: 'bg-sky-100 text-sky-900 border-sky-900',
  },
  willing_to_learn: {
    label_th: 'พร้อมเรียนรู้',
    is_qualified: false,
    color: 'bg-amber-100 text-amber-900 border-amber-900',
  },
  not_comfortable: {
    label_th: 'ไม่สะดวก',
    is_qualified: false,
    color: 'bg-stone-200 text-stone-600 border-stone-400',
  },
};

// Database Tables

export interface Profile {
  id: string; // uuid
  role: UserRole;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface ContactDetails {
  user_id: string;
  phone: string;
  line_id: string | null;
  line_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaregiverDetails {
  caregiver_id: string;
  care_roles: CareRole[];
  work_arrangements: WorkArrangement[];
  years_experience: number;
  expected_wage_min: number;
  expected_wage_max: number;
  wage_unit: WageUnit;
  home_province: string;
  home_district: string;
  max_travel_km: number;
  extra_answers: Record<string, unknown>;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaregiverLocation {
  caregiver_id: string;
  address_text: string; // private
  lat: number | null; // private
  lng: number | null; // private
  created_at: string;
  updated_at: string;
}

export interface CaregiverCaseSkill {
  id: string;
  caregiver_id: string;
  case_type: CaseTypeCode;
  comfort_level: ComfortLevel;
  created_at?: string;
  updated_at?: string;
}

export interface Certificate {
  id: string;
  caregiver_id: string;
  file_path: string; // <caregiver_id>/<uuid>.<ext>
  file_name: string;
  verification_status: VerificationStatus;
  cert_type: string;
  issued_by: string | null;
  preview_url?: string;
  created_at: string;
}

export interface JobPost {
  id: string;
  family_id: string;
  patient_description: string;
  work_arrangement: WorkArrangement;
  province: string;
  district: string;
  preferred_caregiver_gender: CaregiverGenderPreference;
  expected_wage: number | null;
  wage_unit: WageUnit;
  start_date: string | null;
  extra_answers: Record<string, unknown>;
  status: JobStatus;
  expires_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPostLocation {
  job_post_id: string;
  address_text: string; // private
  lat: number | null; // private
  lng: number | null; // private
  created_at: string;
  updated_at: string;
}

export interface JobPostCaseNeed {
  id: string;
  job_post_id: string;
  case_type: CaseTypeCode;
  is_required: boolean;
  created_at?: string;
}

export interface JobPostPhoto {
  id: string;
  job_post_id: string;
  file_path: string;
  caption: string | null;
  created_at: string;
}

export interface MatchRow {
  id: string;
  job_post_id: string;
  caregiver_id: string;
  caregiver_decision: SwipeDecision | null;
  family_decision: SwipeDecision | null;
  caregiver_decided_at: string | null;
  family_decided_at: string | null;
  matched_at: string | null;
  created_at: string;
}

export interface FavoriteRow {
  id: string;
  family_id: string;
  caregiver_id: string;
  created_at: string;
}

export interface AIWorkerProfile {
  id: string;
  caregiver_id: string;
  profile_text: string; // Thai narrative composed by AI
  summary_headline: string;
  key_strengths: string[];
  is_active: boolean;
  prompt_version: string;
  input_hash: string;
  created_at: string;
}

export interface AIApplicantSummary {
  id: string;
  job_post_id: string;
  caregiver_id: string;
  summary_text: string;
  fit_score: number;
  fit_rationale: {
    pros: string[];
    to_verify: string[];
  };
  is_active: boolean;
  created_at: string;
}

export interface FeedbackCorrection {
  id: string;
  user_id: string;
  original_ai_text: string;
  corrected_text: string;
  correction_type: 'worker_profile' | 'applicant_summary';
  rating: number | null;
  created_at: string;
}

export interface PlatformReview {
  id: string;
  user_id: string;
  ease_of_use_score: number; // 1-5
  clarity_score: number; // 1-5
  recommendation_score: number; // 1-5
  comment: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link_url: string | null;
  read_at: string | null;
  line_sent_at: string | null;
  created_at: string;
}

// RPC Return Types

export interface CandidateCaregiverCard {
  caregiver_id: string;
  display_name: string;
  care_roles: CareRole[];
  work_arrangements: WorkArrangement[];
  years_experience: number;
  home_province: string;
  home_district: string;
  expected_wage_min: number;
  expected_wage_max: number;
  wage_unit: WageUnit;
  distance_km: number;
  needs_met: number;
  needs_required: number;
  matched_cases: CaseTypeCode[];
  missing_cases: CaseTypeCode[];
  caregiver_liked: boolean;
  is_favorite: boolean;
  has_certificates: boolean;
  fit_score: number;
  ai_summary: string;
  pros: string[];
  to_verify: string[];
  certificates: Certificate[];
  skills: { case_type: CaseTypeCode; comfort_level: ComfortLevel }[];
}

export interface JobFeedCard {
  job_post_id: string;
  family_id: string;
  patient_description: string;
  work_arrangement: WorkArrangement;
  province: string;
  district: string;
  preferred_caregiver_gender: CaregiverGenderPreference;
  expected_wage: number | null;
  wage_unit: WageUnit;
  distance_km: number;
  needs_i_can_do: number;
  needs_required: number;
  family_liked: boolean;
  required_cases: CaseTypeCode[];
  status: JobStatus;
  created_at: string;
}

export interface MatchContactInfo {
  match_id: string;
  other_user_id: string;
  role: UserRole;
  display_name: string;
  phone: string;
  line_id: string | null;
  matched_at: string;
  job_title_or_patient: string;
  province_district: string;
}
