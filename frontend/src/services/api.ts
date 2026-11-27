
export const FAMILY_AVATARS: Record<string, string> = {
  'fam-1-wanwimon': '/families/fam-female-1.jpg',
  'fam-2-thanapol': '/families/fam-thanapol-v2.jpg',
  'fam-3-jiraporn': '/families/fam-female-3.jpg',
  'fam-4-prasert': '/families/fam-male-2.jpg',
  'fam-5-natthaya': '/families/fam-natthaya.jpg',
  'fam-6-sompot': '/families/fam-female-5.jpg',
  'fam-7-penporn': '/families/fam-female-2.jpg',
  'fam-8-kittichai': '/families/fam-male-1.png',
  'fam-9-siriporn': '/families/fam-female-6.jpg',
  'fam-10-boonsong': '/families/fam-male-4.jpg',
};

/**
 * JobGist with Care - Unified API & Service Layer
 * 
 * Complies strictly with Schema v3:
 * - Client directly talks to Supabase (anon key + user JWT) or falls back to local storage Mock Mode
 * - Private locations (lat, lng, address_text) are never leaked in feed responses
 * - Contact details (phone, LINE ID) are strictly concealed until mutual match (matched_at is set)
 * - AI generation can call FastAPI backend or use the rich Thai template engine with simulated delay
 */

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
  FeedbackCorrection,
  PlatformReview,
  NotificationRow,
  CandidateCaregiverCard,
  JobFeedCard,
  MatchContactInfo,
  CaseTypeCode,
  UserRole,
  CareRole,
  WorkArrangement,
  WageUnit,
  ComfortLevel,
  SwipeDecision,
  CASE_TYPES_V3,
  CaregiverGender,
} from '@/types/database';

import * as Mock from '@/lib/mockData';
import * as Live from './live';
import { approxLatLng } from './geo';

// LIVE = Supabase configured. Then nothing from mockData is ever shown:
// the localStorage keys below become a cache filled from Supabase by hydrateLive().
export const LIVE = Live.LIVE;
const MOCK_PROFILES: Profile[] = LIVE ? [] : Mock.MOCK_PROFILES;
const MOCK_CONTACTS: Record<string, ContactDetails> = LIVE ? {} : Mock.MOCK_CONTACTS;
const MOCK_CAREGIVER_DETAILS: Record<string, CaregiverDetails> = LIVE ? {} : Mock.MOCK_CAREGIVER_DETAILS;
const MOCK_CAREGIVER_LOCATIONS: Record<string, CaregiverLocation> = LIVE ? {} : Mock.MOCK_CAREGIVER_LOCATIONS;
const MOCK_CAREGIVER_SKILLS: Record<string, CaregiverCaseSkill[]> = LIVE ? {} : Mock.MOCK_CAREGIVER_SKILLS;
const MOCK_CERTIFICATES: Record<string, Certificate[]> = LIVE ? {} : Mock.MOCK_CERTIFICATES;
const MOCK_JOB_POSTS: JobPost[] = LIVE ? [] : Mock.MOCK_JOB_POSTS;
const MOCK_JOB_LOCATIONS: Record<string, JobPostLocation> = LIVE ? {} : Mock.MOCK_JOB_LOCATIONS;
const MOCK_JOB_CASE_NEEDS: Record<string, JobPostCaseNeed[]> = LIVE ? {} : Mock.MOCK_JOB_CASE_NEEDS;
const MOCK_MATCHES: MatchRow[] = LIVE ? [] : Mock.MOCK_MATCHES;
const MOCK_FAVORITES: FavoriteRow[] = LIVE ? [] : Mock.MOCK_FAVORITES;
const MOCK_NOTIFICATIONS: NotificationRow[] = LIVE ? [] : Mock.MOCK_NOTIFICATIONS;
const MOCK_REVIEWS: PlatformReview[] = LIVE ? [] : Mock.MOCK_REVIEWS;
const MOCK_AI_WORKER_PROFILES: Record<string, AIWorkerProfile> = LIVE ? {} : Mock.MOCK_AI_WORKER_PROFILES;
const MOCK_AI_APPLICANT_SUMMARIES: Record<string, AIApplicantSummary> = LIVE ? {} : Mock.MOCK_AI_APPLICANT_SUMMARIES;

const STORAGE_KEYS = {
  CURRENT_USER: 'jg_current_user_v3',
  PROFILES: 'jg_profiles_v3',
  CONTACTS: 'jg_contacts_v3',
  CAREGIVER_DETAILS: 'jg_caregiver_details_v3',
  CAREGIVER_LOCATIONS: 'jg_caregiver_locations_v3',
  CAREGIVER_SKILLS: 'jg_caregiver_skills_v3',
  CERTIFICATES: 'jg_certificates_v3',
  JOB_POSTS: 'jg_job_posts_v3',
  JOB_LOCATIONS: 'jg_job_locations_v3',
  JOB_CASE_NEEDS: 'jg_job_case_needs_v3',
  MATCHES: 'jg_matches_v3',
  FAVORITES: 'jg_favorites_v3',
  AI_PROFILES: 'jg_ai_profiles_v3',
  AI_SUMMARIES: 'jg_ai_summaries_v3',
  FEEDBACK: 'jg_feedback_v3',
  REVIEWS: 'jg_reviews_v3',
  NOTIFICATIONS: 'jg_notifications_v3',
  CAREGIVER_DRAFT: 'jg_caregiver_draft_v3',
  FAMILY_DRAFT: 'jg_family_draft_v3',
  IS_LOGGED_IN: 'jg_is_logged_in_v3',
  REGISTERED_ACCOUNTS: 'jg_registered_accounts_v3',
  LIVE_DISTANCES: 'jg_live_distances_v1',
  LIVE_CANDIDATES: 'jg_live_candidates_v1',
  JOB_FAVORITES: 'jg_job_favorites_v1',
};

// Universal Cross-Tab and Same-Window Event Broadcaster
export function broadcastAppEvent(eventName: string, payload?: any): void {
  if (typeof window === 'undefined') return;

  // 1. Same-window event dispatch
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  } catch (e) {
    window.dispatchEvent(new Event(eventName));
  }

  // 2. BroadcastChannel for instant cross-tab / cross-window sync
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('jobgist_sync_channel');
      bc.postMessage({ type: eventName, payload, timestamp: Date.now() });
      bc.close();
    }
  } catch (e) { }

  // 3. LocalStorage ping to guarantee standard 'storage' event fires across all open tabs
  try {
    localStorage.setItem('jg_event_ping', JSON.stringify({ type: eventName, timestamp: Date.now() }));
  } catch (e) { }
}

// Safe LocalStorage helpers
export function getNameInitial(name?: string | null, defaultChar = 'ผ'): string {
  if (!name || typeof name !== 'string') return defaultChar;
  let cleaned = name.trim();
  const prefixes = [
    'ครอบครัวคุณ',
    'ครอบครัว',
    'คุณหมอ',
    'คุณพยาบาล',
    'คุณ',
    'นายแพทย์',
    'แพทย์หญิง',
    'พยาบาล',
    'นาย',
    'นางสาว',
    'นาง',
    'พี่',
    'น้อง',
    'ป้า',
    'น้า',
    'ลุง',
    'หมอ',
  ];
  for (const p of prefixes) {
    if (cleaned.startsWith(p)) {
      cleaned = cleaned.slice(p.length).trim();
      break;
    }
  }
  const leadingVowels = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ']);
  for (const ch of cleaned) {
    if (leadingVowels.has(ch)) continue;
    // Thai consonants ก - ฮ
    if (ch >= '\u0E01' && ch <= '\u0E2E') return ch;
    // English alphabets A - Z
    if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  }
  return cleaned[0] || defaultChar;
}

function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return defaultValue;
  }
}

// Drop huge inline images (old uncompressed avatars) so the ~5 MB localStorage never fills up.
function shrinkForStorage(value: unknown): unknown {
  if (typeof value === 'string') return value.startsWith('data:') && value.length > 150_000 ? null : value;
  if (Array.isArray(value)) return value.map(shrinkForStorage);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shrinkForStorage(v)]));
  }
  return value;
}

// Keys only the old offline demo used; safe to drop when space runs out.
const DISPOSABLE_KEYS = [
  'jg_registered_accounts_v3', 'jg_reviews_v3', 'jg_feedback_v3', 'jg_caregiver_draft_v3',
  'jg_family_draft_v3', 'jg_event_ping',
];

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(shrinkForStorage(value));
  try {
    localStorage.setItem(key, raw);
  } catch (err) {
    // quota full: free space from disposable/legacy keys, then retry once
    DISPOSABLE_KEYS.filter((k) => k !== key).forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage).filter((k) => k.startsWith('jg_seed_version')).forEach((k) => localStorage.removeItem(k));
    try {
      localStorage.setItem(key, raw);
    } catch (err2) {
      console.error(`Error writing ${key} to localStorage`, err2);
    }
  }
}

// Initialize seed data if not present (or if mock data was expanded / updated with avatars)
const SEED_VERSION_KEY = 'jg_seed_version_v15';

export function initSeedData(force = false): void {
  if (typeof window === 'undefined' || LIVE) return;

  const currentVersion = localStorage.getItem(SEED_VERSION_KEY);
  const currentProfiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const storedNotifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const hasLegacyWimonNotif = storedNotifs.some((n) => n.id === 'notif-2');

  const needsRefresh = force || !currentProfiles.length || currentVersion !== SEED_VERSION_KEY || hasLegacyWimonNotif;

  // Auto clean legacy default match if user hasn't actively swiped like yet
  const storedMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, []);
  const filteredMatches = storedMatches.filter((m) => m.id !== 'match-1-wanwimon-wimon');

  // Ensure Thanapol and Kittichai have liked Wimon (so when Wimon swipes right, it matches instantly!)
  const idxThanapol = filteredMatches.findIndex((m) => m.id === 'match-wimon-thanapol');
  if (idxThanapol >= 0) {
    if (!filteredMatches[idxThanapol].matched_at && filteredMatches[idxThanapol].caregiver_decision !== 'pass') {
      filteredMatches[idxThanapol].family_decision = 'like';
      filteredMatches[idxThanapol].family_decided_at = '2026-11-07T09:00:00Z';
    }
  } else {
    filteredMatches.push({
      id: 'match-wimon-thanapol',
      job_post_id: 'job-2-thanapol',
      caregiver_id: 'cg-1-wimon',
      caregiver_decision: null,
      family_decision: 'like',
      caregiver_decided_at: null,
      family_decided_at: '2026-11-07T09:00:00Z',
      matched_at: null,
      created_at: '2026-11-07T09:00:00Z',
    });
  }




  const idxKittichai = filteredMatches.findIndex((m) => m.id === 'match-wimon-kittichai');
  if (idxKittichai >= 0) {
    if (!filteredMatches[idxKittichai].matched_at && filteredMatches[idxKittichai].caregiver_decision !== 'pass') {
      filteredMatches[idxKittichai].family_decision = 'like';
      filteredMatches[idxKittichai].family_decided_at = '2026-11-07T09:30:00Z';
    }
  } else {
    filteredMatches.push({
      id: 'match-wimon-kittichai',
      job_post_id: 'job-8-kittichai',
      caregiver_id: 'cg-1-wimon',
      caregiver_decision: null,
      family_decision: 'like',
      caregiver_decided_at: null,
      family_decided_at: '2026-11-07T09:30:00Z',
      matched_at: null,
      created_at: '2026-11-07T09:30:00Z',
    });
  }




  const idxSiriporn = filteredMatches.findIndex((m) => m.id === 'match-wimon-siriporn');
  if (idxSiriporn >= 0) {
    if (!filteredMatches[idxSiriporn].matched_at && filteredMatches[idxSiriporn].caregiver_decision !== 'pass') {
      filteredMatches[idxSiriporn].family_decision = 'like';
      filteredMatches[idxSiriporn].family_decided_at = '2026-11-07T10:00:00Z';
    }
  } else {
    filteredMatches.push({
      id: 'match-wimon-siriporn',
      job_post_id: 'job-9-siriporn',
      caregiver_id: 'cg-1-wimon',
      caregiver_decision: null,
      family_decision: 'like',
      caregiver_decided_at: null,
      family_decided_at: '2026-11-07T10:00:00Z',
      matched_at: null,
      created_at: '2026-11-07T10:00:00Z',
    });
  }

  const idxMichael = filteredMatches.findIndex((m) => m.id === 'match-wanwimon-michael');
  if (idxMichael >= 0) {
    if (!filteredMatches[idxMichael].matched_at && filteredMatches[idxMichael].family_decision !== 'pass') {
      filteredMatches[idxMichael].caregiver_decision = 'like';
      filteredMatches[idxMichael].caregiver_decided_at = '2026-11-07T11:00:00Z';
    }
  } else {
    filteredMatches.push({
      id: 'match-wanwimon-michael',
      job_post_id: 'job-1-wanwimon',
      caregiver_id: 'cg-9-pranee',
      caregiver_decision: 'like',
      family_decision: null,
      caregiver_decided_at: '2026-11-07T11:00:00Z',
      family_decided_at: null,
      matched_at: null,
      created_at: '2026-11-07T11:00:00Z',
    });
  }

  const idxChalerm = filteredMatches.findIndex((m) => m.id === 'match-wanwimon-chalerm');
  if (idxChalerm >= 0) {
    if (!filteredMatches[idxChalerm].matched_at && filteredMatches[idxChalerm].family_decision !== 'pass') {
      filteredMatches[idxChalerm].caregiver_decision = 'like';
      filteredMatches[idxChalerm].caregiver_decided_at = '2026-11-07T11:30:00Z';
    }
  } else {
    filteredMatches.push({
      id: 'match-wanwimon-chalerm',
      job_post_id: 'job-1-wanwimon',
      caregiver_id: 'cg-7-chalerm',
      caregiver_decision: 'like',
      family_decision: null,
      caregiver_decided_at: '2026-11-07T11:30:00Z',
      family_decided_at: null,
      matched_at: null,
      created_at: '2026-11-07T11:30:00Z',
    });
  }








  if (filteredMatches.length !== storedMatches.length) {
    setStored(STORAGE_KEYS.MATCHES, filteredMatches);
  }

  // Ensure notifications for Wimon include Thanapol, Kittichai, and Siriporn
  const currentNotifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  let notifsUpdated = false;
  const ensureNotif = (notif: NotificationRow) => {
    if (!currentNotifs.some((n) => n.id === notif.id)) {
      currentNotifs.unshift(notif);
      notifsUpdated = true;
    }
  };
  ensureNotif({
    id: 'notif-thanapol-wimon',
    user_id: 'cg-1-wimon',
    title: 'มีครอบครัวสนใจโปรไฟล์ของคุณ: คุณธนพล ศิริสมบัติ',
    message: 'คุณธนพลสนใจโปรไฟล์ของคุณและกดปัดขวาไว้แล้ว หากคุณสนใจงานนี้สามารถกดปัดขวาเพื่อเริ่มงานได้ทันที',
    link_url: '/caregiver/jobs?jobId=job-2-thanapol',
    read_at: null,
    line_sent_at: '2026-11-07T09:00:00Z',
    created_at: '2026-11-07T09:00:00Z',
  });
  ensureNotif({
    id: 'notif-kittichai-wimon',
    user_id: 'cg-1-wimon',
    title: 'มีครอบครัวสนใจโปรไฟล์ของคุณ: คุณกิตติชัย เจริญผล',
    message: 'คุณกิตติชัยสนใจโปรไฟล์ของคุณและกดปัดขวาไว้แล้ว หากคุณสนใจงานนี้สามารถกดปัดขวาเพื่อเริ่มงานได้ทันที',
    link_url: '/caregiver/jobs?jobId=job-8-kittichai',
    read_at: null,
    line_sent_at: '2026-11-07T09:30:00Z',
    created_at: '2026-11-07T09:30:00Z',
  });
  ensureNotif({
    id: 'notif-siriporn-wimon',
    user_id: 'cg-1-wimon',
    title: 'มีครอบครัวสนใจโปรไฟล์ของคุณ: คุณศิริพร อัมพรสุข',
    message: 'คุณศิริพรสนใจโปรไฟล์ของคุณและกดปัดขวาไว้แล้ว หากคุณสนใจงานนี้สามารถกดปัดขวาเพื่อเริ่มงานได้ทันที',
    link_url: '/caregiver/jobs?jobId=job-9-siriporn',
    read_at: null,
    line_sent_at: '2026-11-07T10:00:00Z',
    created_at: '2026-11-07T10:00:00Z',
  });
  if (notifsUpdated) {
    setStored(STORAGE_KEYS.NOTIFICATIONS, currentNotifs);
  }

  // Auto clean legacy notif-2 if present
  if (hasLegacyWimonNotif) {
    const cleanedNotifs = storedNotifs.filter((n) => n.id !== 'notif-2' && n.id !== 'notif-1');
    setStored(STORAGE_KEYS.NOTIFICATIONS, cleanedNotifs);
  }

  if (needsRefresh) {
    setStored(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
    setStored(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
    setStored(STORAGE_KEYS.CAREGIVER_DETAILS, MOCK_CAREGIVER_DETAILS);
    setStored(STORAGE_KEYS.CAREGIVER_LOCATIONS, MOCK_CAREGIVER_LOCATIONS);
    setStored(STORAGE_KEYS.CAREGIVER_SKILLS, MOCK_CAREGIVER_SKILLS);
    setStored(STORAGE_KEYS.CERTIFICATES, MOCK_CERTIFICATES);
    setStored(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
    setStored(STORAGE_KEYS.JOB_LOCATIONS, MOCK_JOB_LOCATIONS);
    setStored(STORAGE_KEYS.JOB_CASE_NEEDS, MOCK_JOB_CASE_NEEDS);
    setStored(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
    // Only initialize favorites if none exist yet, never wipe user favorites on refresh
    if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
      setStored(STORAGE_KEYS.FAVORITES, MOCK_FAVORITES);
    }
    setStored(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
    setStored(STORAGE_KEYS.REVIEWS, MOCK_REVIEWS);
    setStored(STORAGE_KEYS.AI_PROFILES, MOCK_AI_WORKER_PROFILES);
    setStored(STORAGE_KEYS.AI_SUMMARIES, MOCK_AI_APPLICANT_SUMMARIES);
    if (!localStorage.getItem(STORAGE_KEYS.FEEDBACK)) {
      setStored(STORAGE_KEYS.FEEDBACK, []);
    }

    // Seed mock registered accounts
    if (!localStorage.getItem(STORAGE_KEYS.REGISTERED_ACCOUNTS)) {
      setStored(STORAGE_KEYS.REGISTERED_ACCOUNTS, INITIAL_REGISTERED_ACCOUNTS);
    }

    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION_KEY);

    // Default current user to family-1 for demo exploration
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      setStored(STORAGE_KEYS.CURRENT_USER, {
        id: 'fam-1-wanwimon',
        role: 'family',
        display_name: 'คุณวรรณวิมล วัฒนกุล',
        phone: '0829991122',
        email: 'wanwimon@jobgist.care',
        gender: 'female',
        age: 45,
      });
    }
  }
}

// Current User State Management
export interface CurrentUserSession {
  id: string;
  role: UserRole | null;
  display_name: string;
  phone: string;
  line_id?: string | null;
  email?: string;
  avatar_url?: string | null;
  gender?: CaregiverGender;
  age?: number | null;
}

export interface RegisteredAccount {
  id: string;
  email: string;
  password?: string;
  display_name: string;
  phone: string;
  line_id?: string | null;
  role: UserRole | null; // null if haven't chosen side yet!
  avatar_url?: string | null;
  gender?: CaregiverGender;
  age?: number | null;
  created_at: string;
}

export const INITIAL_REGISTERED_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'cg-1-wimon',
    email: 'wimon@jobgist.care',
    display_name: 'คุณวิมล ชัยชนะ (PN)',
    phone: '0814567890',
    line_id: 'wimon_care_pn',
    role: 'caregiver',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fam-1-wanwimon',
    email: 'wanwimon@jobgist.care',
    display_name: 'คุณวรรณวิมล วัฒนกุล',
    phone: '0829991122',
    line_id: 'wanwimon_family',
    role: 'family',
    created_at: '2026-01-01T00:00:00Z',
  },
];

export function getRegisteredAccounts(): RegisteredAccount[] {
  return getStored<RegisteredAccount[]>(STORAGE_KEYS.REGISTERED_ACCOUNTS, INITIAL_REGISTERED_ACCOUNTS);
}

export function saveRegisteredAccount(account: RegisteredAccount): void {
  const accounts = getRegisteredAccounts();
  const idx = accounts.findIndex(
    (a) =>
      a.id === account.id ||
      (account.email && a.email.toLowerCase() === account.email.toLowerCase())
  );
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...account };
  } else {
    accounts.push(account);
  }
  setStored(STORAGE_KEYS.REGISTERED_ACCOUNTS, accounts);
}

export function findAccountByEmail(email: string): RegisteredAccount | null {
  const accounts = getRegisteredAccounts();
  const normalized = email.trim().toLowerCase();
  return accounts.find((a) => a.email.toLowerCase() === normalized) || null;
}

export function updateUserAccountRole(userId: string, role: UserRole): void {
  const accounts = getRegisteredAccounts();
  const acc = accounts.find((a) => a.id === userId);
  if (acc) {
    acc.role = role;
    setStored(STORAGE_KEYS.REGISTERED_ACCOUNTS, accounts);
  }
  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    setCurrentUser({
      ...cur,
      role,
    });
  }



}

export function isProfilePublishedForUser(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  // If caregiver
  const allDetails = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  if (allDetails[userId]) {
    return Boolean(allDetails[userId].is_visible);
  }
  // If family
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  return jobPosts.some((j) => j.family_id === userId && j.status === 'open');
}

export function checkCaregiverOnboardingCompleted(userId: string): boolean {
  const allDetails = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  const details = allDetails[userId];
  const allSkills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  const skills = allSkills[userId];
  return Boolean(details && details.care_roles?.length > 0 && skills && skills.length > 0);
}

export function checkFamilyHasJobPost(userId: string): boolean {
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  return jobPosts.some((j) => j.family_id === userId);
}

export function checkFamilyOnboardingCompleted(userId: string): boolean {
  const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
  return Boolean(contacts[userId]?.phone);
}

/**
 * กำหนดเส้นทางหลังเข้าสู่ระบบ (Post-Login Navigation) ตามสถานะบัญชีจริง
 */
export function getPostLoginRedirect(session: CurrentUserSession): {
  path: string;
  reason: string;
} {
  // 1. ถ้ายังไม่ได้เลือกฝั่งเลย (role == null) -> บังคับไปหน้าเลือกฝั่ง
  if (!session.role) {
    return {
      path: '/register',
      reason: 'ยังไม่ได้เลือกฝั่งผู้ใช้งาน กำลังนำท่านไปเลือกบทบาทการใช้งาน...',
    };
  }

  // 2. ถ้าเลือกฝั่งเป็น ผู้ดูแล (caregiver)
  if (session.role === 'caregiver') {
    const isCompleted = checkCaregiverOnboardingCompleted(session.id);
    if (!isCompleted) {
      return {
        path: '/caregiver/onboarding',
        reason: 'ยังกรอกข้อมูลโปรไฟล์ไม่สมบูรณ์ กำลังนำท่านไปกรอกโปรไฟล์ผู้ดูแลต่อ...',
      };
    }
    // ถ้าเสร็จแล้ว -> แนะนำไปหน้าฟีดงาน / Swipe UI ค้นหางานที่ตรงกับทักษะ
    return {
      path: '/caregiver/jobs',
      reason: 'เข้าสู่หน้าฟีดงานและ Swipe ค้นหางานที่ตรงกับคุณ',
    };
  }

  // 3. ถ้าเลือกฝั่งเป็น ครอบครัว (family)
  if (session.role === 'family') {
    const hasJob = checkFamilyHasJobPost(session.id);
    if (!hasJob) {
      const hasOnboarding = checkFamilyOnboardingCompleted(session.id);
      if (!hasOnboarding) {
        return {
          path: '/family/onboarding',
          reason: 'ยังไม่ได้ระบุข้อมูลติดต่อและสถานที่ กำลังนำท่านไปกรอกข้อมูลเบื้องต้น...',
        };
      }
      return {
        path: '/family/post-job',
        reason: 'ยังไม่ได้โพสต์ประกาศหาผู้ดูแล กำลังนำท่านไปโพสต์ประกาศงาน...',
      };
    }
    // ถ้าโพสต์หาผู้ดูแลแล้ว -> แนะนำไปหน้า ดูผู้สมัครและเปรียบเทียบ AI Fit Score เพื่อรอ Match
    return {
      path: '/family/applicants',
      reason: 'เข้าสู่หน้าดูผู้สมัครสำหรับงานของคุณ (Applicants Feed)',
    };
  }

  return { path: '/register', reason: 'นำท่านไปหน้าเลือกบทบาท' };
}

const GUEST: CurrentUserSession = { id: '', role: null, display_name: '', phone: '' };

export function getCurrentUser(): CurrentUserSession {
  if (LIVE) {
    return getStored<CurrentUserSession>(STORAGE_KEYS.CURRENT_USER, GUEST);
  }
  if (typeof window === 'undefined') {
    return {
      id: 'fam-1-wanwimon',
      role: 'family',
      display_name: 'คุณวรรณวิมล วัฒนกุล',
      phone: '0829991122',
      gender: 'female',
      age: 45,
    };
  }
  initSeedData();
  return getStored<CurrentUserSession>(STORAGE_KEYS.CURRENT_USER, {
    id: 'fam-1-wanwimon',
    role: 'family',
    display_name: 'คุณวรรณวิมล วัฒนกุล',
    phone: '0829991122',
    gender: 'female',
    age: 45,
  });
}

export function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
}

export function setUserLoggedIn(loggedIn: boolean): void {
  if (typeof window === 'undefined') return;
  if (loggedIn) {
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
  }
  broadcastAppEvent('jg_auth_changed');
}

export function logout(): void {
  if (LIVE) {
    void Live.signOut();
    clearLiveCache();
  }
  setUserLoggedIn(false);
}

export function setCurrentUser(session: CurrentUserSession): void {
  setStored(STORAGE_KEYS.CURRENT_USER, session);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    broadcastAppEvent('jg_user_changed');
    broadcastAppEvent('jg_auth_changed');
  }
}

export function switchPersona(role: UserRole): void {
  if (LIVE) return;
  if (role === 'caregiver') {
    setCurrentUser({
      id: 'cg-1-wimon',
      role: 'caregiver',
      display_name: 'คุณวิมล ชัยชนะ',
      phone: '0814567890',
      line_id: 'wimon_care_pn',
    });
  } else {
    setCurrentUser({
      id: 'fam-1-wanwimon',
      role: 'family',
      display_name: 'คุณวรรณวิมล วัฒนกุล',
      phone: '0829991122',
      line_id: 'wanwimon_family',
    });
  }
}

export function resetPlatformData(): void {
  if (typeof window === 'undefined') return;
  if (LIVE) {
    logout();
    broadcastAppEvent('jg_data_reset');
    broadcastAppEvent('jg_user_changed');
    return;
  }
  localStorage.clear();
  initSeedData(true);
  logout();
  broadcastAppEvent('jg_data_reset');
  broadcastAppEvent('jg_auth_changed');
  broadcastAppEvent('jg_user_changed');
}

/**
 * Restores a demo test account (cg-1-wimon or fam-1-wanwimon) to its original pristine mock data.
 * This guarantees that when clicking "บัญชีทดสอบด่วน", the profile displays official demo data
 * rather than any previously typed/drafted test values in localStorage.
 */
export function restoreDemoAccount(id: 'cg-1-wimon' | 'fam-1-wanwimon'): void {
  if (typeof window === 'undefined' || LIVE) return;

  if (id === 'cg-1-wimon') {
    // Restore caregiver profile & details
    const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
    const pIdx = profiles.findIndex((p) => p.id === 'cg-1-wimon');
    const mockP = MOCK_PROFILES.find((p) => p.id === 'cg-1-wimon');
    if (mockP) {
      if (pIdx !== -1) profiles[pIdx] = { ...mockP };
      else profiles.unshift({ ...mockP });
      setStored(STORAGE_KEYS.PROFILES, profiles);
    }

    const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
    contacts['cg-1-wimon'] = { ...MOCK_CONTACTS['cg-1-wimon'] };
    setStored(STORAGE_KEYS.CONTACTS, contacts);

    const details = getStored<Record<string, CaregiverDetails>>(STORAGE_KEYS.CAREGIVER_DETAILS, MOCK_CAREGIVER_DETAILS);
    details['cg-1-wimon'] = { ...MOCK_CAREGIVER_DETAILS['cg-1-wimon'] };
    setStored(STORAGE_KEYS.CAREGIVER_DETAILS, details);

    const skills = getStored<Record<string, CaregiverCaseSkill[]>>(STORAGE_KEYS.CAREGIVER_SKILLS, MOCK_CAREGIVER_SKILLS);
    skills['cg-1-wimon'] = [...MOCK_CAREGIVER_SKILLS['cg-1-wimon']];
    setStored(STORAGE_KEYS.CAREGIVER_SKILLS, skills);

    const certs = getStored<Record<string, Certificate[]>>(STORAGE_KEYS.CERTIFICATES, MOCK_CERTIFICATES);
    certs['cg-1-wimon'] = [...MOCK_CERTIFICATES['cg-1-wimon']];
    setStored(STORAGE_KEYS.CERTIFICATES, certs);

    const aiProfiles = getStored<Record<string, AIWorkerProfile>>(STORAGE_KEYS.AI_PROFILES, MOCK_AI_WORKER_PROFILES);
    aiProfiles['cg-1-wimon'] = { ...MOCK_AI_WORKER_PROFILES['cg-1-wimon'] };
    setStored(STORAGE_KEYS.AI_PROFILES, aiProfiles);

    clearCaregiverDraft();
  } else if (id === 'fam-1-wanwimon') {
    // Restore family profile, job post, locations, and case needs
    const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
    const pIdx = profiles.findIndex((p) => p.id === 'fam-1-wanwimon');
    const mockP = MOCK_PROFILES.find((p) => p.id === 'fam-1-wanwimon');
    if (mockP) {
      if (pIdx !== -1) profiles[pIdx] = { ...mockP };
      else profiles.unshift({ ...mockP });
      setStored(STORAGE_KEYS.PROFILES, profiles);
    }

    const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
    contacts['fam-1-wanwimon'] = { ...MOCK_CONTACTS['fam-1-wanwimon'] };
    setStored(STORAGE_KEYS.CONTACTS, contacts);

    // Filter out any user-created temporary job posts for fam-1-wanwimon, keeping/restoring only standard job-1-wanwimon
    const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS).filter(
      (j) => j.family_id !== 'fam-1-wanwimon' || j.id === 'job-1-wanwimon'
    );
    const jIdx = jobPosts.findIndex((j) => j.id === 'job-1-wanwimon');
    const mockJ = MOCK_JOB_POSTS.find((j) => j.id === 'job-1-wanwimon');
    if (mockJ) {
      if (jIdx !== -1) jobPosts[jIdx] = { ...mockJ };
      else jobPosts.unshift({ ...mockJ });
    }
    setStored(STORAGE_KEYS.JOB_POSTS, jobPosts);

    const locs = getStored<Record<string, JobPostLocation>>(STORAGE_KEYS.JOB_LOCATIONS, MOCK_JOB_LOCATIONS);
    locs['job-1-wanwimon'] = { ...MOCK_JOB_LOCATIONS['job-1-wanwimon'] };
    setStored(STORAGE_KEYS.JOB_LOCATIONS, locs);

    const needs = getStored<Record<string, JobPostCaseNeed[]>>(STORAGE_KEYS.JOB_CASE_NEEDS, MOCK_JOB_CASE_NEEDS);
    needs['job-1-wanwimon'] = [...MOCK_JOB_CASE_NEEDS['job-1-wanwimon']];
    setStored(STORAGE_KEYS.JOB_CASE_NEEDS, needs);

    // Also reset matches & favorites for fam-1-wanwimon to mock state
    const matches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
    const mIdx = matches.findIndex((m) => m.id === 'match-1-wanwimon-wimon');
    const mockM = MOCK_MATCHES.find((m) => m.id === 'match-1-wanwimon-wimon');
    if (mockM) {
      if (mIdx !== -1) matches[mIdx] = { ...mockM };
      else matches.unshift({ ...mockM });
      setStored(STORAGE_KEYS.MATCHES, matches);
    }

    clearFamilyDraft();
  }

  broadcastAppEvent('jg_data_reset');
  broadcastAppEvent('jg_favorites_changed');
}

/**
 * Prepares a fresh guest session for newly registered users or users clicking "สร้างบัญชี",
 * ensuring all onboarding input forms start empty and do not inherit demo account data.
 */
export function startFreshRegistration(role?: UserRole): void {
  clearCaregiverDraft();
  clearFamilyDraft();
  if (LIVE) {
    // a real account picks its role at sign-up; signed-out users go through /auth
    if (!isUserLoggedIn()) clearLiveCache();
    return;
  }
  logout(); // Ensure user is marked as unauthenticated guest until onboarding finishes
  const freshUserId = `user-${Date.now()}`;
  setStored(STORAGE_KEYS.CURRENT_USER, {
    id: freshUserId,
    role: role || null,
    display_name: '',
    phone: '',
    line_id: '',
    email: '',
    avatar_url: null,
    gender: 'unspecified',
    age: null,
  });
  if (typeof window !== 'undefined') {
    broadcastAppEvent('jg_user_changed');
  }
}

// ----------------------------------------------------------------------------
// CAREGIVER SERVICES
// ----------------------------------------------------------------------------

export interface CaregiverOnboardingPayload {
  display_name: string;
  phone: string;
  line_id?: string;
  avatar_url?: string | null;
  gender?: CaregiverGender;
  age?: number | null;
  home_province: string;
  home_district: string;
  address_text?: string;
  lat?: number;
  lng?: number;
  max_travel_km: number;
  care_roles: CareRole[];
  years_experience: number;
  expected_wage_min: number;
  expected_wage_max: number;
  wage_unit: WageUnit;
  work_arrangements: WorkArrangement[];
  skills: { case_type: CaseTypeCode; comfort_level: ComfortLevel }[];
  certificates: { file_name: string; cert_type: string; preview_url: string }[];
  no_certificates?: boolean;
  custom_tags?: string[];
}

export function saveCaregiverDraft(data: Partial<CaregiverOnboardingPayload>): void {
  const cleaned = { ...data };
  if (cleaned.display_name) {
    cleaned.display_name = stripKhunPrefix(cleaned.display_name);
  }
  setStored(STORAGE_KEYS.CAREGIVER_DRAFT, cleaned);
}

export function getCaregiverDraft(): Partial<CaregiverOnboardingPayload> | null {
  return getStored<Partial<CaregiverOnboardingPayload> | null>(STORAGE_KEYS.CAREGIVER_DRAFT, null);
}

export function clearCaregiverDraft(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.CAREGIVER_DRAFT);
  }
}

/**
 * Generate AI Thai Worker Profile
 * Calls FastAPI backend if configured, else applies advanced template synthesizer.
 */
export async function generateAIWorkerProfile(
  caregiverId: string,
  payload: CaregiverOnboardingPayload
): Promise<AIWorkerProfile> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;

  if (LIVE) {
    await pendingWrites;
    try {
      const profile = await Live.generateWorkerProfile(caregiverId);
      const all = getStored<Record<string, AIWorkerProfile>>(STORAGE_KEYS.AI_PROFILES, {});
      all[caregiverId] = profile;
      setStored(STORAGE_KEYS.AI_PROFILES, all);
      refreshLive();
      return profile;
    } catch (e) {
      reportLiveError(e);
      return {
        id: '', caregiver_id: caregiverId,
        profile_text: 'ระบบ AI ยังสร้างโปรไฟล์ไม่สำเร็จ กรุณากดสร้างใหม่อีกครั้งในภายหลัง',
        summary_headline: '', key_strengths: [], is_active: false, prompt_version: '', input_hash: '',
        created_at: new Date().toISOString(),
      };
    }
  }

  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/profiles/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caregiver_id: caregiverId, ...payload }),
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (e) {
      console.warn('FastAPI generate profile failed, falling back to local synthesizer', e);
    }
  }

  // Realistic artificial latency for AI processing tactile experience
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const roleLabels = payload.care_roles
    .map((r) => {
      if (r === 'practical_nurse') return 'ผู้ช่วยพยาบาล (PN)';
      if (r === 'nurse_aide') return 'พนักงานช่วยการพยาบาล (NA)';
      if (r === 'caregiver') return 'ผู้ดูแลผู้สูงอายุ (Caregiver)';
      return 'ผู้ดูแลที่มีประสบการณ์ (Home Caregiver)';
    })
    .join(' และ ');

  const experiencedCases = payload.skills
    .filter((s) => s.comfort_level === 'experienced')
    .map((s) => CASE_TYPES_V3[s.case_type].short_label_th);

  const trainedCases = payload.skills
    .filter((s) => s.comfort_level === 'trained')
    .map((s) => CASE_TYPES_V3[s.case_type].short_label_th);

  const arrangements = payload.work_arrangements
    .map((a) => (a === 'live_in' ? 'อยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'))
    .join(' หรือ ');

  const wageDisplay = `${payload.expected_wage_min.toLocaleString()} - ${payload.expected_wage_max.toLocaleString()} บาท/${payload.wage_unit === 'month' ? 'เดือน' : payload.wage_unit === 'day' ? 'วัน' : 'ชม.'
    }`;

  const topSkills = [...experiencedCases, ...trainedCases].slice(0, 4).join(', ');

  const displayNameFormatted = ensureKhunPrefix(payload.display_name);
  const narrative = `ดิฉันชื่อ ${displayNameFormatted} ปฏิบัติงานในฐานะ${roleLabels} มีประสบการณ์ดูแลจริง ${payload.years_experience
    } ปี มีความชำนาญและความคุ้นเคยในการดูแลเคส${topSkills ? topSkills : 'ผู้สูงอายุทั่วไป'
    } สามารถทำงานรูปแบบ${arrangements} ในโซน ${payload.home_district} ${payload.home_province
    } และรัศมีเดินทาง ${payload.max_travel_km} กม. ค่าบริการที่คาดหวัง ${wageDisplay} มีความพร้อมและใจรักในการบริการด้วยความนุ่มนวลและตรงต่อเวลา`;

  const headline = `${roleLabels} ${payload.years_experience} ปี • ถนัด ${topSkills || 'ดูแลผู้สูงอายุทั่วไป'}`;

  const keyStrengths = [
    `ประสบการณ์สายงานดูแลโดยตรง ${payload.years_experience} ปี ในบทบาท ${roleLabels}`,
    experiencedCases.length > 0
      ? `หัตถการที่ทำจริงได้คล่อง: ${experiencedCases.join(', ')}`
      : 'ดูแลกิจวัตรประจำวัน อาบน้ำ พยุงเดิน และอาหารอย่างรอบคอบ',
    `มีพื้นที่ทำงานสะดวกโซน ${payload.home_district} ${payload.home_province} (รัศมี ${payload.max_travel_km} กม.)`,
    `พร้อมปฏิบัติงานรูปแบบ ${arrangements}`,
  ];

  const profile: AIWorkerProfile = {
    id: `ai-wp-${Date.now()}`,
    caregiver_id: caregiverId,
    profile_text: narrative,
    summary_headline: headline,
    key_strengths: keyStrengths,
    is_active: true,
    prompt_version: 'v3.2_thai_natural',
    input_hash: `hash_${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  // Save to stored AI profiles
  const allProfiles = getStored<Record<string, AIWorkerProfile>>(STORAGE_KEYS.AI_PROFILES, {});
  allProfiles[caregiverId] = profile;
  setStored(STORAGE_KEYS.AI_PROFILES, allProfiles);

  return profile;
}

export function submitCaregiverOnboarding(payload: CaregiverOnboardingPayload): {
  caregiverId: string;
} {
  const currentUser = getCurrentUser();
  const caregiverId = currentUser.role === 'caregiver' ? currentUser.id : `cg-user-${Date.now()}`;

  // 1. Update Profile
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const existingIdx = profiles.findIndex((p) => p.id === caregiverId);
  const formattedDisplayName = ensureKhunPrefix(payload.display_name);
  const profileRecord: Profile = {
    id: caregiverId,
    role: 'caregiver',
    display_name: formattedDisplayName,
    avatar_url: payload.avatar_url || null,
    gender: payload.gender || 'unspecified',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    profiles[existingIdx] = profileRecord;
  } else {
    profiles.push(profileRecord);
  }
  setStored(STORAGE_KEYS.PROFILES, profiles);

  // 2. Update Contacts
  const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
  contacts[caregiverId] = {
    user_id: caregiverId,
    phone: payload.phone,
    line_id: payload.line_id || null,
    line_user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  setStored(STORAGE_KEYS.CONTACTS, contacts);

  // 3. Update Caregiver Details
  const allDetails = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  allDetails[caregiverId] = {
    caregiver_id: caregiverId,
    care_roles: payload.care_roles,
    work_arrangements: payload.work_arrangements,
    years_experience: payload.years_experience,
    expected_wage_min: payload.expected_wage_min,
    expected_wage_max: payload.expected_wage_max,
    wage_unit: payload.wage_unit,
    home_province: payload.home_province,
    home_district: payload.home_district,
    max_travel_km: payload.max_travel_km,
    gender: payload.gender || 'unspecified',
    age: typeof payload.age === 'number' ? payload.age : null,
    avatar_url: payload.avatar_url || null,
    extra_answers: { custom_tags: payload.custom_tags || [] },
    is_visible: false, // Remains false until confirmed on profile page
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  setStored(STORAGE_KEYS.CAREGIVER_DETAILS, allDetails);

  // 4. Update Location (Private)
  const allLocations = getStored<Record<string, CaregiverLocation>>(
    STORAGE_KEYS.CAREGIVER_LOCATIONS,
    MOCK_CAREGIVER_LOCATIONS
  );
  allLocations[caregiverId] = {
    caregiver_id: caregiverId,
    address_text: payload.address_text || `${payload.home_district} ${payload.home_province}`,
    lat: payload.lat || (LIVE ? approxLatLng(payload.home_province, payload.home_district)?.lat ?? null : 13.7563),
    lng: payload.lng || (LIVE ? approxLatLng(payload.home_province, payload.home_district)?.lng ?? null : 100.5018),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  setStored(STORAGE_KEYS.CAREGIVER_LOCATIONS, allLocations);

  // 5. Update Skills
  const allSkills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  allSkills[caregiverId] = payload.skills.map((s, idx) => ({
    id: `skill-${caregiverId}-${idx}`,
    caregiver_id: caregiverId,
    case_type: s.case_type,
    comfort_level: s.comfort_level,
  }));
  setStored(STORAGE_KEYS.CAREGIVER_SKILLS, allSkills);

  // 6. Update Certificates
  const allCerts = getStored<Record<string, Certificate[]>>(
    STORAGE_KEYS.CERTIFICATES,
    MOCK_CERTIFICATES
  );
  allCerts[caregiverId] = payload.certificates.map((c, idx) => ({
    id: `cert-${caregiverId}-${idx}`,
    caregiver_id: caregiverId,
    file_path: `${caregiverId}/cert-${idx}.jpg`,
    file_name: c.file_name,
    verification_status: 'verified',
    cert_type: c.cert_type,
    issued_by: 'สถาบันที่ผ่านการรับรอง',
    preview_url: c.preview_url,
    created_at: new Date().toISOString(),
  }));
  setStored(STORAGE_KEYS.CERTIFICATES, allCerts);

  // Ensure current user is synced
  setCurrentUser({
    id: caregiverId,
    role: 'caregiver',
    display_name: payload.display_name,
    phone: payload.phone,
    line_id: payload.line_id,
    avatar_url: payload.avatar_url || null,
    gender: payload.gender || 'unspecified',
    age: typeof payload.age === 'number' ? payload.age : null,
  });

  clearCaregiverDraft();
  if (LIVE) {
    track(Live.saveCaregiver(caregiverId, payload).then(() => Live.markTaskDone(caregiverId, 'caregiver', 'onboarding_form')));
  }
  return { caregiverId };
}

export function getCaregiverProfileBundle(caregiverId: string) {
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const profile = profiles.find((p) => p.id === caregiverId);
  const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
  const details = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  const skills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  const certs = getStored<Record<string, Certificate[]>>(
    STORAGE_KEYS.CERTIFICATES,
    MOCK_CERTIFICATES
  );
  const aiProfiles = getStored<Record<string, AIWorkerProfile>>(
    STORAGE_KEYS.AI_PROFILES,
    MOCK_AI_WORKER_PROFILES
  );

  return {
    profile: profile || null,
    contact: contacts[caregiverId] || null,
    detail: details[caregiverId] || null,
    skills: skills[caregiverId] || [],
    certificates: certs[caregiverId] || [],
    aiProfile: aiProfiles[caregiverId] || null,
  };
}

export function updateCaregiverProfileText(
  caregiverId: string,
  newText: string,
  originalText: string
): void {
  // Save immutable feedback correction
  const feedbacks = getStored<FeedbackCorrection[]>(STORAGE_KEYS.FEEDBACK, []);
  feedbacks.push({
    id: `fb-${Date.now()}`,
    user_id: caregiverId,
    original_ai_text: originalText,
    corrected_text: newText,
    correction_type: 'worker_profile',
    rating: null,
    created_at: new Date().toISOString(),
  });
  setStored(STORAGE_KEYS.FEEDBACK, feedbacks);

  // Update active profile text
  const allProfiles = getStored<Record<string, AIWorkerProfile>>(
    STORAGE_KEYS.AI_PROFILES,
    MOCK_AI_WORKER_PROFILES
  );
  if (allProfiles[caregiverId]) {
    allProfiles[caregiverId].profile_text = newText;
    setStored(STORAGE_KEYS.AI_PROFILES, allProfiles);
  }
  if (LIVE) {
    track(Live.saveProfileTextEdit(caregiverId, allProfiles[caregiverId]?.id || '', newText, originalText));
  }
}

export function publishCaregiverProfile(caregiverId: string): void {
  const allDetails = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  if (allDetails[caregiverId]) {
    allDetails[caregiverId].is_visible = true;
    allDetails[caregiverId].updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.CAREGIVER_DETAILS, allDetails);
  }
  if (LIVE) track(Live.setCaregiverVisible(caregiverId, true));
  if (typeof window !== 'undefined') {
    broadcastAppEvent('jg_user_changed');
    broadcastAppEvent('jg_auth_changed');
  }
}

// ----------------------------------------------------------------------------
// FAMILY PROFILE & JOB BUNDLE
// ----------------------------------------------------------------------------

export function getFamilyProfileBundle(familyId: string) {
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const profile = profiles.find((p) => p.id === familyId) || null;
  const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
  const contact = contacts[familyId] || null;

  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  // Find family's active or latest job post (prioritize the one belonging to familyId, or fallback to job-1-wanwimon)
  const jobPost =
    jobPosts.find((j) => j.family_id === familyId && j.id !== 'job-1-wanwimon') ||
    jobPosts.find((j) => j.family_id === familyId) ||
    jobPosts.find((j) => j.id === 'job-1-wanwimon') ||
    null;

  const allLocations = getStored<Record<string, JobPostLocation>>(
    STORAGE_KEYS.JOB_LOCATIONS,
    MOCK_JOB_LOCATIONS
  );
  const location = jobPost ? allLocations[jobPost.id] || null : null;

  const allNeeds = getStored<Record<string, JobPostCaseNeed[]>>(
    STORAGE_KEYS.JOB_CASE_NEEDS,
    MOCK_JOB_CASE_NEEDS
  );
  const caseNeeds = jobPost ? allNeeds[jobPost.id] || [] : [];

  return {
    profile,
    contact,
    jobPost,
    location,
    caseNeeds,
  };
}

export function updateFamilyJobPostText(
  jobPostId: string,
  newText: string,
  originalText: string,
  familyId: string
): void {
  // Save feedback correction
  const feedbacks = getStored<FeedbackCorrection[]>(STORAGE_KEYS.FEEDBACK, []);
  feedbacks.push({
    id: `fb-${Date.now()}`,
    user_id: familyId,
    original_ai_text: originalText,
    corrected_text: newText,
    correction_type: 'job_post',
    rating: null,
    created_at: new Date().toISOString(),
  });
  setStored(STORAGE_KEYS.FEEDBACK, feedbacks);

  // Update active job post description
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const idx = jobPosts.findIndex((j) => j.id === jobPostId);
  if (idx !== -1) {
    jobPosts[idx].patient_description = newText;
    jobPosts[idx].updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.JOB_POSTS, jobPosts);
  }
  if (LIVE) track(Live.updateJob(jobPostId, { patient_description: newText }));
}

export function publishFamilyJobPost(jobPostId: string): void {
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const idx = jobPosts.findIndex((j) => j.id === jobPostId);
  if (idx !== -1) {
    jobPosts[idx].status = 'open';
    jobPosts[idx].updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.JOB_POSTS, jobPosts);
  }
  if (LIVE) track(Live.updateJob(jobPostId, { status: 'open' }));
  if (typeof window !== 'undefined') {
    broadcastAppEvent('jg_user_changed');
    broadcastAppEvent('jg_auth_changed');
  }
}


export function ensureKhunPrefix(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();
  // If already starts with คุณ, พี่, ป้า, น้า, ลุง, ยาย, ตา, หมอ, ครู, พว., etc.
  if (/^(คุณ|พี่|ป้า|น้า|ลุง|ยาย|ตา|หมอ|ครู|อาจารย์|ผช\.|พว\.)/.test(trimmed)) {
    return trimmed;
  }
  return `คุณ${trimmed}`;
}

export function stripKhunPrefix(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();
  // Remove leading "คุณ" or "คุณ " so in editing/input fields it shows only the raw name
  return trimmed.replace(/^คุณ\s*/, '');
}

export function formatFamilyDisplayName(name?: string | null, defaultDistrict?: string): string {
  let familyName = name || (defaultDistrict ? `คุณ (เขต${defaultDistrict})` : 'คุณผู้ว่าจ้าง');
  if (familyName.startsWith('ครอบครัว')) {
    familyName = familyName.replace(/^ครอบครัว(คุณ)?\s*/, 'คุณ');
  } else if (!familyName.startsWith('คุณ')) {
    familyName = ensureKhunPrefix(familyName);
  }
  return familyName;
}

// ----------------------------------------------------------------------------
// CAREGIVER JOB FEED (RPC job_feed_for_me)
// ----------------------------------------------------------------------------

export function toggleFavoriteJob(caregiverId: string, jobId: string): boolean {
  const allFavorites = getStored<FavoriteRow[]>(STORAGE_KEYS.FAVORITES, MOCK_FAVORITES);
  const idx = allFavorites.findIndex((f) => f.caregiver_id === jobId);

  if (idx >= 0) {
    allFavorites.splice(idx, 1);
    setStored(STORAGE_KEYS.FAVORITES, allFavorites);
    if (typeof window !== 'undefined') {
      broadcastAppEvent('jg_favorites_changed');
    }
    return false;
  } else {
    allFavorites.push({
      id: `fav-job-${jobId}`,
      family_id: caregiverId,
      caregiver_id: jobId,
      created_at: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.FAVORITES, allFavorites);
    if (typeof window !== 'undefined') {
      broadcastAppEvent('jg_favorites_changed');
    }
    return true;
  }
}

export function jobFeedForMe(
  caregiverId: string,
  maxKm = 50,
  priorityJobId?: string
): JobFeedCard[] {
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const allNeeds = getStored<Record<string, JobPostCaseNeed[]>>(
    STORAGE_KEYS.JOB_CASE_NEEDS,
    MOCK_JOB_CASE_NEEDS
  );
  const allSkills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  const details = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const allFavorites = getStored<FavoriteRow[]>(STORAGE_KEYS.FAVORITES, MOCK_FAVORITES);
  const allCerts = getStored<Record<string, Certificate[]>>(STORAGE_KEYS.CERTIFICATES, MOCK_CERTIFICATES);

  const caregiverDetail = details[caregiverId];
  const caregiverSkills = allSkills[caregiverId] || [];
  const qualifiedSkills = new Set(
    caregiverSkills
      .filter((s) => s.comfort_level === 'experienced' || s.comfort_level === 'trained')
      .map((s) => s.case_type)
  );

  // Return jobs where status is open (LIVE: only what job_feed_for_me() returned)
  const liveDist = getStored<Record<string, number | null>>(STORAGE_KEYS.LIVE_DISTANCES, {});
  const availableJobs = jobPosts.filter((job) => job.status === 'open' &&
    (!LIVE || job.id in liveDist || job.id === priorityJobId));

  const cards: JobFeedCard[] = [];

  for (const job of availableJobs) {
    const existingMatch = allMatches.find(
      (m) => m.job_post_id === job.id && m.caregiver_id === caregiverId
    );

    // If mutually matched, do not show in swipe feed
    if (existingMatch?.matched_at) {
      continue;
    }

    // If caregiver already passed, exclude from feed (unless explicitly requested via priorityJobId)
    const isPriority = priorityJobId && job.id === priorityJobId;
    if (existingMatch?.caregiver_decision === 'pass' && !isPriority) {
      continue;
    }

    const needs = allNeeds[job.id] || [];
    const requiredNeeds = needs.filter((n) => n.is_required).map((n) => n.case_type);
    const iCanDoCount = requiredNeeds.filter((n) => qualifiedSkills.has(n)).length;

    // Simulated distance calculation based on district
    let distanceKm = 8.5;
    if (caregiverDetail) {
      if (caregiverDetail.home_district === job.district) {
        distanceKm = 3.2;
      } else if (caregiverDetail.home_province === job.province) {
        distanceKm = 11.4;
      } else {
        distanceKm = 24.0;
      }
    }

    const realKm = LIVE ? liveDist[job.id] : undefined;
    if (typeof realKm === 'number') distanceKm = Math.round(realKm * 10) / 10;
    if (distanceKm > maxKm) continue;

    const famUser = profiles.find((u) => u.id === job.family_id);
    let familyName = famUser?.display_name || `คุณ (เขต${job.district})`;
    if (familyName.startsWith('ครอบครัว')) {
      familyName = familyName.replace(/^ครอบครัว(คุณ)?\s*/, 'คุณ');
    } else if (!familyName.startsWith('คุณ')) {
      familyName = `คุณ${familyName}`;
    }
    const familyAvatar = famUser?.avatar_url || FAMILY_AVATARS[job.family_id] || null;
    const isFav = allFavorites.some((f) => f.caregiver_id === job.id);

    // Parse patient gender and age from description or metadata
    let pGender: string | null = null;
    const desc = job.patient_description || '';
    if (desc.includes('คุณแม่') || desc.includes('คุณยาย') || desc.includes('เพศหญิง') || desc.includes('หญิง')) {
      pGender = 'หญิง';
    } else if (desc.includes('คุณพ่อ') || desc.includes('คุณตา') || desc.includes('คุณลุง') || desc.includes('เพศชาย') || desc.includes('ชาย')) {
      pGender = 'ชาย';
    } else if (famUser?.gender === 'female') {
      pGender = 'หญิง';
    } else if (famUser?.gender === 'male') {
      pGender = 'ชาย';
    }

    let pAge: number | null = null;
    const ageMatch = desc.match(/(?:อายุ|วัย)\s*(\d+)\s*ปี/) || desc.match(/(\d+)\s*ปี/);
    if (ageMatch && ageMatch[1]) {
      pAge = parseInt(ageMatch[1], 10);
    } else if ((famUser as any)?.age) {
      pAge = (famUser as any).age;
    }

    // Multi-factor Fit Score formula (out of 99):
    // 60% skills + 20% arrangement + 10% distance + 5% certs + 5% exp
    const caseRatio = (requiredNeeds.length || needs.length) > 0 ? iCanDoCount / (requiredNeeds.length || needs.length) : 0.8;
    let score = Math.round(caseRatio * 60);

    const arrangementMatch = caregiverDetail ? caregiverDetail.work_arrangements.includes(job.work_arrangement) : true;
    score += arrangementMatch ? 20 : 6;

    if (distanceKm < 10) score += 10;
    else if (distanceKm < 25) score += 7;
    else score += 3;

    const certs = allCerts[caregiverId] || [];
    if (certs.length > 0) score += 5;

    const exp = caregiverDetail ? caregiverDetail.years_experience : 3;
    score += Math.round(Math.min(exp, 10) * 0.5);

    let fitScore = Math.min(Math.max(score, 50), 98);
    if (LIVE) fitScore = liveFitScore(job, caregiverId, typeof realKm === 'number' ? realKm : null);

    cards.push({
      job_post_id: job.id,
      family_id: job.family_id,
      family_name: familyName,
      family_avatar_url: familyAvatar,
      patient_description: job.patient_description,
      patient_gender: pGender,
      patient_age: pAge,
      work_arrangement: job.work_arrangement,
      province: job.province,
      district: job.district,
      preferred_caregiver_gender: job.preferred_caregiver_gender,
      expected_wage: job.expected_wage,
      wage_unit: job.wage_unit,
      distance_km: distanceKm,
      needs_i_can_do: iCanDoCount,
      needs_required: requiredNeeds.length || needs.length,
      fit_score: fitScore,
      family_liked: existingMatch?.family_decision === 'like',
      is_favorite: isFav,
      required_cases: requiredNeeds,
      status: job.status,
      created_at: job.created_at,
    });
  }




  // Sort: if priorityJobId is set, place that job first
  // Otherwise: family liked first, then high needs_i_can_do, then closest
  return cards.sort((a, b) => {
    if (priorityJobId) {
      if (a.job_post_id === priorityJobId) return -1;
      if (b.job_post_id === priorityJobId) return 1;
    }
    if (a.family_liked !== b.family_liked) return a.family_liked ? -1 : 1;
    if (a.needs_i_can_do !== b.needs_i_can_do) return b.needs_i_can_do - a.needs_i_can_do;
    return a.distance_km - b.distance_km;
  });
}

// ----------------------------------------------------------------------------
// FAMILY SERVICES & JOB POSTING
// ----------------------------------------------------------------------------

export function detectCasesFromText(text: string): CaseTypeCode[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const detected: CaseTypeCode[] = [];

  for (const [code, meta] of Object.entries(CASE_TYPES_V3)) {
    const matched = meta.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    if (matched) {
      detected.push(code as CaseTypeCode);
    }
  }

  return detected;
}

export interface PostJobPayload {
  patient_description: string;
  work_arrangement: WorkArrangement;
  province: string;
  district: string;
  address_text?: string;
  lat?: number;
  lng?: number;
  preferred_caregiver_gender: 'any' | 'female' | 'male';
  expected_wage: number | null;
  wage_unit: WageUnit;
  start_date: string | null;
  cases: { case_type: CaseTypeCode; is_required: boolean }[];
  status: 'draft' | 'open';
  display_name?: string;
  phone?: string;
  line_id?: string;
  gender?: CaregiverGender;
  age?: number | null;
  avatar_url?: string | null;
  custom_tags?: string[];
}

export function saveFamilyDraft(data: Partial<PostJobPayload>): void {
  const cleaned = { ...data };
  if (cleaned.display_name) {
    cleaned.display_name = stripKhunPrefix(cleaned.display_name);
  }
  setStored(STORAGE_KEYS.FAMILY_DRAFT, cleaned);
}

export function getFamilyDraft(): Partial<PostJobPayload> | null {
  return getStored<Partial<PostJobPayload> | null>(STORAGE_KEYS.FAMILY_DRAFT, null);
}

export function clearFamilyDraft(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.FAMILY_DRAFT);
  }
}

export function createJobPost(payload: PostJobPayload): { jobId: string } {
  const currentUser = getCurrentUser();
  const familyId = currentUser.role === 'family' ? currentUser.id : `fam-user-${Date.now()}`;
  const existingLiveJob = LIVE
    ? getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, []).find(
        (j) => j.family_id === familyId && (j.status === 'open' || j.status === 'draft'))
    : undefined;
  const jobId = LIVE ? existingLiveJob?.id || Live.newId() : `job-${Date.now()}`;

  const jobPost: JobPost = {
    id: jobId,
    family_id: familyId,
    patient_description: payload.patient_description,
    work_arrangement: payload.work_arrangement,
    province: payload.province,
    district: payload.district,
    preferred_caregiver_gender: payload.preferred_caregiver_gender,
    expected_wage: payload.expected_wage,
    wage_unit: payload.wage_unit,
    start_date: payload.start_date,
    extra_answers: { custom_tags: payload.custom_tags || [] },
    status: payload.status,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    closed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS).filter((j) => j.id !== jobId);
  jobPosts.unshift(jobPost);
  // Also update existing job-1-wanwimon if current user is fam-1-wanwimon so profile page reflects it immediately
  if (familyId === 'fam-1-wanwimon') {
    const defaultJobIdx = jobPosts.findIndex((j) => j.id === 'job-1-wanwimon');
    if (defaultJobIdx >= 0) {
      jobPosts[defaultJobIdx] = {
        ...jobPosts[defaultJobIdx],
        patient_description: payload.patient_description,
        work_arrangement: payload.work_arrangement,
        province: payload.province,
        district: payload.district,
        preferred_caregiver_gender: payload.preferred_caregiver_gender,
        expected_wage: payload.expected_wage,
        wage_unit: payload.wage_unit,
        start_date: payload.start_date,
        status: payload.status,
        updated_at: new Date().toISOString(),
      };
    }
  }
  setStored(STORAGE_KEYS.JOB_POSTS, jobPosts);

  // Private location
  const allJobLocs = getStored<Record<string, JobPostLocation>>(
    STORAGE_KEYS.JOB_LOCATIONS,
    MOCK_JOB_LOCATIONS
  );
  allJobLocs[jobId] = {
    job_post_id: jobId,
    address_text: payload.address_text || `${payload.district} ${payload.province}`,
    lat: payload.lat || (LIVE ? approxLatLng(payload.province, payload.district)?.lat ?? null : 13.8),
    lng: payload.lng || (LIVE ? approxLatLng(payload.province, payload.district)?.lng ?? null : 100.55),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Also update standard job-1-wanwimon location if current user is fam-1-wanwimon
  if (familyId === 'fam-1-wanwimon') {
    allJobLocs['job-1-wanwimon'] = {
      ...allJobLocs['job-1-wanwimon'],
      address_text: payload.address_text || `${payload.district} ${payload.province}`,
      updated_at: new Date().toISOString(),
    };
  }
  setStored(STORAGE_KEYS.JOB_LOCATIONS, allJobLocs);

  // Case needs
  const allNeeds = getStored<Record<string, JobPostCaseNeed[]>>(
    STORAGE_KEYS.JOB_CASE_NEEDS,
    MOCK_JOB_CASE_NEEDS
  );
  allNeeds[jobId] = payload.cases.map((c, i) => ({
    id: `need-${jobId}-${i}`,
    job_post_id: jobId,
    case_type: c.case_type,
    is_required: c.is_required,
  }));
  if (familyId === 'fam-1-wanwimon') {
    allNeeds['job-1-wanwimon'] = payload.cases.map((c, i) => ({
      id: `need-job-1-wanwimon-${i}`,
      job_post_id: 'job-1-wanwimon',
      case_type: c.case_type,
      is_required: c.is_required,
    }));
  }
  setStored(STORAGE_KEYS.JOB_CASE_NEEDS, allNeeds);

  // Sync family profile details from payload/draft if provided
  const draft = getFamilyDraft() as any;
  const rawName = payload.display_name !== undefined ? payload.display_name : draft?.display_name;
  const newName = rawName ? ensureKhunPrefix(rawName) : undefined;
  const newPhone = payload.phone !== undefined ? payload.phone : draft?.phone;
  const newLine = payload.line_id !== undefined ? payload.line_id : draft?.line_id;
  const newGender = payload.gender !== undefined ? payload.gender : draft?.gender;
  const newAge = payload.age !== undefined ? payload.age : draft?.age;
  const newAvatar = payload.avatar_url !== undefined ? payload.avatar_url : draft?.avatar_url;

  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const pIdx = profiles.findIndex((p) => p.id === familyId);
  if (pIdx >= 0) {
    if (newName) profiles[pIdx].display_name = newName;
    if (newAvatar !== undefined) profiles[pIdx].avatar_url = newAvatar || null;
    if (newGender) profiles[pIdx].gender = newGender;
    profiles[pIdx].updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.PROFILES, profiles);
  } else {
    profiles.unshift({
      id: familyId,
      role: 'family',
      display_name: newName || 'ครอบครัวผู้ว่าจ้าง',
      avatar_url: newAvatar || null,
      gender: newGender || 'unspecified',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.PROFILES, profiles);
  }

  if (newPhone) {
    const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
    contacts[familyId] = {
      user_id: familyId,
      phone: newPhone,
      line_id: newLine || null,
      line_user_id: null,
      created_at: contacts[familyId]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.CONTACTS, contacts);
  }

  // Update current user session on publish
  const cur = getCurrentUser();
  if (cur.id === familyId || cur.role === 'family') {
    setCurrentUser({
      ...cur,
      id: familyId,
      role: 'family',
      display_name: newName || cur.display_name,
      phone: newPhone || cur.phone,
      line_id: newLine !== undefined ? newLine : cur.line_id,
      gender: newGender || cur.gender,
      age: typeof newAge === 'number' ? newAge : cur.age,
      avatar_url: newAvatar !== undefined ? (newAvatar || null) : cur.avatar_url,
    });
  }




  clearFamilyDraft();
  setUserLoggedIn(true);
  broadcastAppEvent('jg_profile_updated');
  if (LIVE) {
    track(Live.saveJob(familyId, {
      ...payload,
      id: jobId,
      display_name: newName,
      phone: newPhone,
      line_id: newLine,
      avatar_url: newAvatar,
    }, Boolean(existingLiveJob)).then(() => {
      if (!existingLiveJob) return Live.markTaskDone(familyId, 'family', 'post_job');
    }));
  }
  return { jobId };
}

export function getEffectiveFamilyJob(userId?: string): { id: string; family_id: string } {
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  if (userId) {
    const userJob = jobPosts.find((j) => j.family_id === userId);
    if (userJob) return { id: userJob.id, family_id: userJob.family_id };
  }
  const defaultJob = jobPosts[0] || { id: 'job-1-wanwimon', family_id: 'fam-1-wanwimon' };
  return { id: defaultJob.id, family_id: defaultJob.family_id };
}

// ----------------------------------------------------------------------------
// CANDIDATE CAREGIVERS RPC (candidate_caregivers)
// ----------------------------------------------------------------------------

export function candidateCaregivers(
  jobPostId: string,
  maxKm = 50,
  priorityCaregiverId?: string
): CandidateCaregiverCard[] {
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const targetJob = jobPosts.find((j) => j.id === jobPostId) || jobPosts[0];

  const allNeeds = getStored<Record<string, JobPostCaseNeed[]>>(
    STORAGE_KEYS.JOB_CASE_NEEDS,
    MOCK_JOB_CASE_NEEDS
  );
  const jobNeeds = (targetJob ? allNeeds[targetJob.id] : []) || [];
  const requiredCases = jobNeeds.filter((n) => n.is_required).map((n) => n.case_type);

  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const details = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  const allSkills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  const allCerts = getStored<Record<string, Certificate[]>>(
    STORAGE_KEYS.CERTIFICATES,
    MOCK_CERTIFICATES
  );
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  const allFavorites = getStored<FavoriteRow[]>(STORAGE_KEYS.FAVORITES, MOCK_FAVORITES);
  const allSummaries = getStored<Record<string, AIApplicantSummary>>(
    STORAGE_KEYS.AI_SUMMARIES,
    MOCK_AI_APPLICANT_SUMMARIES
  );

  const results: CandidateCaregiverCard[] = [];

  const liveCands = getStored<Record<string, string[]>>(STORAGE_KEYS.LIVE_CANDIDATES, {});
  const liveDistCg = getStored<Record<string, number | null>>(STORAGE_KEYS.LIVE_DISTANCES, {});
  const allowed = LIVE ? new Set(liveCands[targetJob?.id || ''] || []) : null;

  for (const p of profiles) {
    if (p.role !== 'caregiver') continue;
    if (allowed && !allowed.has(p.id) && p.id !== priorityCaregiverId) continue;

    const detail = details[p.id];
    // RLS: caregiver must be visible to family
    if (!detail || !detail.is_visible) continue;

    const existingMatch = allMatches.find(
      (m) => m.job_post_id === (targetJob?.id || '') && m.caregiver_id === p.id
    );

    // If already mutually matched, do not show in swipe feed
    if (existingMatch?.matched_at) {
      continue;
    }

    // Check if family already passed this caregiver (unless explicitly priority requested)
    const isPriority = priorityCaregiverId && p.id === priorityCaregiverId;
    if ((existingMatch?.family_decision === 'pass' || (LIVE && existingMatch?.family_decision === 'like')) && !isPriority) {
      continue;
    }

    const skills = allSkills[p.id] || [];
    const qualifiedSkillCodes = new Set(
      skills
        .filter((s) => s.comfort_level === 'experienced' || s.comfort_level === 'trained')
        .map((s) => s.case_type)
    );

    const matchedCases = requiredCases.filter((c) => qualifiedSkillCodes.has(c));
    const missingCases = requiredCases.filter((c) => !qualifiedSkillCodes.has(c));

    // Distance calculation
    let dist = 5.2;
    if (targetJob) {
      if (detail.home_district === targetJob.district) dist = 2.8;
      else if (detail.home_province === targetJob.province) dist = 9.4;
      else dist = 22.0;
    }
    const realCgKm = LIVE ? liveDistCg[p.id] : undefined;
    if (typeof realCgKm === 'number') dist = Math.round(realCgKm * 10) / 10;
    if (dist > maxKm) continue;

    // Fit Score calculation (Schema v3 & PRD formula out of 99)
    // 60% matched cases + 20% arrangement + 10% distance + 5% certs + 5% exp
    const caseRatio = requiredCases.length > 0 ? matchedCases.length / requiredCases.length : 0.8;
    let score = Math.round(caseRatio * 60);

    const arrangementMatch = targetJob
      ? detail.work_arrangements.includes(targetJob.work_arrangement)
      : true;
    score += arrangementMatch ? 20 : 6;

    if (dist < 10) score += 10;
    else if (dist < 25) score += 7;
    else score += 3;

    const certs = allCerts[p.id] || [];
    if (certs.length > 0) score += 5;

    const expBonus = Math.min(detail.years_experience, 10) * 0.5;
    score += Math.round(expBonus);

    // AI Summary lookup or synthesis
    const summaryKey = `${targetJob?.id || 'job-1'}:${p.id}`;
    const preSummary = allSummaries[summaryKey];

    if (LIVE) {
      score = preSummary ? Math.round(preSummary.fit_score)
        : targetJob ? liveFitScore(targetJob, p.id, typeof realCgKm === 'number' ? realCgKm : null) : score;
    }
    const aiSummaryText = LIVE
      ? preSummary?.summary_text || 'AI กำลังสรุปความเหมาะสมของผู้ดูแลคนนี้...'
      : preSummary?.summary_text ||
      `${p.display_name} มีประสบการณ์ ${detail.years_experience} ปี ตรงกับความต้องการเคส ${matchedCases.length}/${requiredCases.length} ข้อ ${arrangementMatch ? 'พร้อมทำงานตามรูปแบบที่ต้องการ' : 'ควรสอบถามเรื่องรูปแบบเวลาทำงานเพิ่มเติม'
      }`;

    const pros = preSummary?.fit_rationale?.pros || [
      `ตรงกับเคสที่ต้องการ: ${matchedCases.map((c) => CASE_TYPES_V3[c].short_label_th).join(', ') || 'ผู้สูงอายุทั่วไป'}`,
      detail.years_experience >= 5 ? `ประสบการณ์สูง ${detail.years_experience} ปี` : `มีความกระตือรือร้นและเรียนรู้ไว`,
      certs.length > 0 ? 'มีเอกสารใบรับรองผ่านการอบรม' : 'ผ่านงานจริงมาหลายเคส',
    ];

    const toVerify = preSummary?.fit_rationale?.to_verify || [
      missingCases.length > 0
        ? `ทักษะที่ยังไม่ระบุความชำนาญ: ${missingCases.map((c) => CASE_TYPES_V3[c].short_label_th).join(', ')}`
        : 'ควรสอบถามวันเริ่มงานและรายละเอียดการเดินทาง',
    ];

    const isFav = allFavorites.some((f) => f.caregiver_id === p.id);

    results.push({
      caregiver_id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url || detail.avatar_url || null,
      gender: p.gender || detail.gender || 'unspecified',
      age: typeof detail.age === 'number' ? detail.age : null,
      care_roles: detail.care_roles,
      work_arrangements: detail.work_arrangements,
      years_experience: detail.years_experience,
      home_province: detail.home_province,
      home_district: detail.home_district,
      expected_wage_min: detail.expected_wage_min,
      expected_wage_max: detail.expected_wage_max,
      wage_unit: detail.wage_unit,
      distance_km: dist,
      needs_met: matchedCases.length,
      needs_required: requiredCases.length || 1,
      matched_cases: matchedCases,
      missing_cases: missingCases,
      caregiver_liked: existingMatch?.caregiver_decision === 'like',
      is_favorite: isFav,
      has_certificates: certs.length > 0,
      fit_score: Math.min(score, 99),
      ai_summary: aiSummaryText,
      pros,
      to_verify: toVerify,
      certificates: certs,
      skills: skills.map((s) => ({ case_type: s.case_type, comfort_level: s.comfort_level })),
    });
  }




  // Sort: if priorityCaregiverId is set, place that caregiver first
  // Otherwise: caregiver liked first, then fit_score desc
  return results.sort((a, b) => {
    if (priorityCaregiverId) {
      if (a.caregiver_id === priorityCaregiverId) return -1;
      if (b.caregiver_id === priorityCaregiverId) return 1;
    }
    if (a.caregiver_liked !== b.caregiver_liked) return a.caregiver_liked ? -1 : 1;
    return b.fit_score - a.fit_score;
  });
}

// ----------------------------------------------------------------------------
// SWIPE MATCHING & MUTUAL MATCH ENGINE
// ----------------------------------------------------------------------------

export function swipeJob(
  jobPostId: string,
  caregiverId: string,
  decision: SwipeDecision
): { isMatch: boolean; matchId: string } {
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  let match = allMatches.find(
    (m) => m.job_post_id === jobPostId && m.caregiver_id === caregiverId
  );

  const now = new Date().toISOString();

  if (!match) {
    match = {
      id: `match-${jobPostId}-${caregiverId}`,
      job_post_id: jobPostId,
      caregiver_id: caregiverId,
      caregiver_decision: decision,
      family_decision: null,
      caregiver_decided_at: now,
      family_decided_at: null,
      matched_at: null,
      created_at: now,
    };
    allMatches.push(match);
  } else {
    // If already matched, cannot alter
    if (match.matched_at) {
      return { isMatch: true, matchId: match.id };
    }
    match.caregiver_decision = decision;
    match.caregiver_decided_at = now;
  }

  // Check mutual like (LIVE: the DB trigger sets matched_at and writes notifications)
  let isMutual = false;
  if (match.caregiver_decision === 'like' && match.family_decision === 'like') {
    match.matched_at = now;
    isMutual = true;
    if (!LIVE) notifyMutualMatch(match);
  } else if (decision === 'like' && !LIVE) {
    notifyFamilyCaregiverLiked(match);
  }
  if (LIVE) track(Live.swipe(jobPostId, caregiverId, 'caregiver', decision));

  setStored(STORAGE_KEYS.MATCHES, allMatches);
  if (typeof window !== 'undefined') {
    broadcastAppEvent('jg_matches_changed');
    broadcastAppEvent('jg_data_reset');
  }
  return { isMatch: isMutual, matchId: match.id };
}

export function swipeCaregiver(
  jobPostId: string,
  caregiverId: string,
  decision: SwipeDecision
): { isMatch: boolean; matchId: string } {
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  let match = allMatches.find(
    (m) => m.job_post_id === jobPostId && m.caregiver_id === caregiverId
  );

  const now = new Date().toISOString();

  if (!match) {
    match = {
      id: `match-${jobPostId}-${caregiverId}`,
      job_post_id: jobPostId,
      caregiver_id: caregiverId,
      caregiver_decision: null,
      family_decision: decision,
      caregiver_decided_at: null,
      family_decided_at: now,
      matched_at: null,
      created_at: now,
    };
    allMatches.push(match);
  } else {
    if (match.matched_at) {
      return { isMatch: true, matchId: match.id };
    }
    match.family_decision = decision;
    match.family_decided_at = now;
  }

  let isMutual = false;
  if (match.caregiver_decision === 'like' && match.family_decision === 'like') {
    match.matched_at = now;
    isMutual = true;
    if (!LIVE) notifyMutualMatch(match);
  }
  if (LIVE) track(Live.swipe(jobPostId, caregiverId, 'family', decision));

  setStored(STORAGE_KEYS.MATCHES, allMatches);
  if (typeof window !== 'undefined') {
    broadcastAppEvent('jg_matches_changed');
    broadcastAppEvent('jg_data_reset');
  }
  return { isMatch: isMutual, matchId: match.id };
}

function notifyMutualMatch(match: MatchRow) {
  const notifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const jobs = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);

  const caregiver = profiles.find((p) => p.id === match.caregiver_id);
  const job = jobs.find((j) => j.id === match.job_post_id);
  const family = profiles.find((p) => p.id === job?.family_id);

  const now = new Date().toISOString();

  // Caregiver notification
  notifs.unshift({
    id: `notif-${Date.now()}-1`,
    user_id: match.caregiver_id,
    title: `จับคู่สำเร็จกับ ${family?.display_name || 'ครอบครัวผู้ว่าจ้าง'}!`,
    message: `คุณและ ${family?.display_name || 'ครอบครัวผู้ว่าจ้าง'} แสดงความสนใจตรงกันแล้ว สามารถเปิดดูเบอร์และ LINE เพื่อติดต่อได้เลย`,
    link_url: '/matches',
    read_at: null,
    line_sent_at: now,
    created_at: now,
  });

  // Family notification
  if (job?.family_id) {
    notifs.unshift({
      id: `notif-${Date.now()}-2`,
      user_id: job.family_id,
      title: `จับคู่สำเร็จกับ ${caregiver?.display_name || 'ผู้ดูแล'}!`,
      message: `คุณและ ${caregiver?.display_name || 'ผู้ดูแล'} แสดงความสนใจตรงกันแล้ว เปิดดูข้อมูลติดต่อเพื่อตกลงเริ่มงานได้ทันที`,
      link_url: '/matches',
      read_at: null,
      line_sent_at: now,
      created_at: now,
    });
  }




  setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
}

function notifyFamilyCaregiverLiked(match: MatchRow) {
  const notifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const jobs = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);

  const caregiver = profiles.find((p) => p.id === match.caregiver_id);
  const job = jobs.find((j) => j.id === match.job_post_id);

  if (job?.family_id) {
    const now = new Date().toISOString();
    notifs.unshift({
      id: `notif-${Date.now()}-3`,
      user_id: job.family_id,
      title: `มีผู้ดูแลสนใจงานของคุณ: ${caregiver?.display_name}`,
      message: `${caregiver?.display_name} ได้กดถูกใจงานของคุณ เข้ามาดูโปรไฟล์และตัดสินใจได้เลย`,
      link_url: '/family/applicants',
      read_at: null,
      line_sent_at: now,
      created_at: now,
    });
    setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }
}

// ----------------------------------------------------------------------------
// CONTACT DETAILS REVELATION RPC (get_match_contact)
// ----------------------------------------------------------------------------

export function getMatchContact(matchId: string, requestingUserId: string): MatchContactInfo | null {
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  const match = allMatches.find((m) => m.id === matchId);

  // Privacy Rule: Contact details are strictly concealed until matched_at is populated!
  if (!match || !match.matched_at) {
    return null;
  }

  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const job = jobPosts.find((j) => j.id === match.job_post_id);
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);

  const isCaregiverRequest = requestingUserId === match.caregiver_id;
  const targetUserId = isCaregiverRequest ? job?.family_id : match.caregiver_id;

  if (!targetUserId) return null;

  const targetProfile = profiles.find((p) => p.id === targetUserId);
  const targetContact = contacts[targetUserId];

  // Deterministic realistic phone number fallback if contact details not explicitly set
  let phone = targetContact?.phone;
  if (LIVE) phone = phone || '';
  if (!LIVE && (!phone || phone.includes('X'))) {
    // Generate realistic phone from targetUserId
    if (targetUserId === 'fam-8-kittichai') phone = '0885678901';
    else if (targetUserId === 'fam-2-thanapol') phone = '0845554321';
    else if (targetUserId === 'fam-9-siriporn') phone = '0834445566';
    else if (targetUserId === 'fam-1-wanwimon') phone = '0829991122';
    else {
      // Numerical hash fallback
      const hash = targetUserId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      phone = `08${String(10000000 + (hash * 1234567) % 90000000).padStart(8, '0')}`;
    }
  }

  // Format phone to 10-digit standard display (e.g. 088-567-8901)
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10
    ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`
    : phone;

  return {
    match_id: match.id,
    other_user_id: targetUserId,
    role: targetProfile?.role || 'caregiver',
    display_name: targetProfile?.display_name || 'ผู้ใช้งาน',
    phone: formattedPhone,
    line_id: targetContact?.line_id || null,
    matched_at: match.matched_at,
    job_title_or_patient: job?.patient_description.slice(0, 50) + '...' || 'งานดูแลผู้ป่วย',
    province_district: job ? `${job.district}, ${job.province}` : '',
  };
}

export function getAllActiveMatchesForUser(userId: string) {
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const contacts = getStored<Record<string, ContactDetails>>(STORAGE_KEYS.CONTACTS, MOCK_CONTACTS);
  const caregiverDetails = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  const allSkills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  const allCerts = getStored<Record<string, Certificate[]>>(
    STORAGE_KEYS.CERTIFICATES,
    MOCK_CERTIFICATES
  );

  const allNeeds = getStored<Record<string, JobPostCaseNeed[]>>(
    STORAGE_KEYS.JOB_CASE_NEEDS,
    MOCK_JOB_CASE_NEEDS
  );

  const curProfile = profiles.find((p) => p.id === userId);
  const isCaregiverUser = curProfile?.role === 'caregiver' || userId.startsWith('cg-');

  // Find user's job or fallback to primary mock job
  const userJobs = jobPosts.filter((j) => j.family_id === userId);
  const primaryJob = userJobs[0] || jobPosts[0];
  const primaryJobFamilyId = primaryJob?.family_id || 'fam-1-wanwimon';

  const userMatches = allMatches.filter((m) => {
    if (isCaregiverUser) {
      if (m.caregiver_id === userId) return true;
      if (userId.startsWith('user-') && m.caregiver_id === 'cg-1-wimon') return true;
      return false;
    } else {
      const job = jobPosts.find((j) => j.id === m.job_post_id);
      if (job?.family_id === userId) return true;
      if (job?.family_id === primaryJobFamilyId || m.job_post_id === primaryJob?.id) return true;
      if (userId.startsWith('user-') && job?.family_id === 'fam-1-wanwimon') return true;
      return false;
    }
  });

  return userMatches.map((m) => {
    const job = jobPosts.find((j) => j.id === m.job_post_id);
    const isCaregiver = userId === m.caregiver_id;
    const otherUserId = isCaregiver ? job?.family_id : m.caregiver_id;
    const otherProfile = profiles.find((p) => p.id === otherUserId);
    const otherContact = contacts[otherUserId || ''];

    // Additional caregiver details & fit score if the other user or this user is caregiver
    const cgId = m.caregiver_id;
    const details = caregiverDetails[cgId];
    const skills = allSkills[cgId] || [];
    const certs = allCerts[cgId] || [];

    // Calculate Fit score for match
    let fitScore = 85;
    if (job && details) {
      const requiredCases = (allNeeds[job.id] || []).filter((n) => n.is_required).map((n) => n.case_type);
      const qualifiedSkillCodes = new Set(
        skills
          .filter((s) => s.comfort_level === 'experienced' || s.comfort_level === 'trained')
          .map((s) => s.case_type)
      );
      const matchedCases = requiredCases.filter((c) => qualifiedSkillCodes.has(c));
      const caseRatio = requiredCases.length > 0 ? matchedCases.length / requiredCases.length : 0.8;
      let score = Math.round(caseRatio * 60);

      const arrangementMatch = details.work_arrangements.includes(job.work_arrangement);
      score += arrangementMatch ? 20 : 6;

      let dist = 5.2;
      if (details.home_district === job.district) dist = 2.8;
      else if (details.home_province === job.province) dist = 9.4;
      else dist = 22.0;

      if (dist < 10) score += 10;
      else if (dist < 25) score += 7;
      else score += 3;

      if (certs.length > 0) score += 5;
      score += Math.round(Math.min(details.years_experience, 10) * 0.5);
      fitScore = Math.min(score, 99);
      if (LIVE) fitScore = liveFitScore(job, cgId, liveDistanceFor(job.id, cgId));
    }

    let displayAvatarUrl = otherProfile?.avatar_url || details?.avatar_url || null;
    let displayName = otherProfile?.display_name || 'คู่แมตช์';
    let familyGender: string | null = otherProfile?.gender && otherProfile.gender !== 'unspecified'
      ? (otherProfile.gender === 'female' ? 'หญิง' : 'ชาย')
      : null;
    let familyAge: number | null = (otherProfile as any)?.age || null;

    if (isCaregiver && job) {
      displayName = formatFamilyDisplayName(otherProfile?.display_name, job.district);
      if (!displayAvatarUrl && job.family_id && FAMILY_AVATARS[job.family_id]) {
        displayAvatarUrl = FAMILY_AVATARS[job.family_id];
      }
      const desc = job.patient_description || '';
      if (!familyGender) {
        if (desc.includes('คุณแม่') || desc.includes('คุณยาย') || desc.includes('เพศหญิง') || desc.includes('หญิง')) {
          familyGender = 'หญิง';
        } else if (desc.includes('คุณพ่อ') || desc.includes('คุณตา') || desc.includes('คุณลุง') || desc.includes('เพศชาย') || desc.includes('ชาย')) {
          familyGender = 'ชาย';
        }
      }
      if (!familyAge) {
        const ageMatch = desc.match(/(?:อายุ|วัย)\s*(\d+)\s*ปี/) || desc.match(/(\d+)\s*ปี/);
        if (ageMatch && ageMatch[1]) {
          familyAge = parseInt(ageMatch[1], 10);
        }
      }
    }

    return {
      match: m,
      job,
      otherProfile: otherProfile ? { ...otherProfile, display_name: displayName, avatar_url: displayAvatarUrl } : null,
      family_gender: familyGender,
      family_age: familyAge,
      details,
      skills,
      certs,
      fit_score: fitScore,
      // Reveal contact only if matched_at exists
      contact: m.matched_at ? otherContact : null,
      isMutual: !!m.matched_at,
    };
  });
}

/**
 * Cancel a pending interest / swipe right.
 * If the current user cancels:
 * - If the match was purely one-sided from the current user (the other side hasn't liked), delete the match row so it reappears in feed.
 * - If the other side previously liked, reset the current user's decision to null so it returns to being an incoming like.
 */
export function cancelPendingSwipe(matchId: string, userId: string): void {
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  const jobPosts = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const idx = allMatches.findIndex((m) => m.id === matchId);
  if (idx === -1) return;

  const match = allMatches[idx];
  const isCaregiver = match.caregiver_id === userId;
  const job = jobPosts.find((j) => j.id === match.job_post_id);
  const isFamily = job?.family_id === userId;
  if (LIVE && (isCaregiver || isFamily)) {
    // users cannot delete match rows: withdraw = null if the other side liked, else 'pass'
    const otherLiked = isCaregiver ? match.family_decision === 'like' : match.caregiver_decision === 'like';
    track(Live.swipe(match.job_post_id, match.caregiver_id, isCaregiver ? 'caregiver' : 'family', otherLiked ? null : 'pass'));
  }

  if (isCaregiver) {
    if (match.family_decision === 'like') {
      // Family had liked, caregiver cancels their own like
      match.caregiver_decision = null;
      match.caregiver_decided_at = null;
      match.matched_at = null;
      setStored(STORAGE_KEYS.MATCHES, allMatches);
    } else {
      // Caregiver was the sole liker, completely remove match record
      allMatches.splice(idx, 1);
      setStored(STORAGE_KEYS.MATCHES, allMatches);
    }
  } else if (isFamily) {
    if (match.caregiver_decision === 'like') {
      // Caregiver had liked, family cancels their own like
      match.family_decision = null;
      match.family_decided_at = null;
      match.matched_at = null;
      setStored(STORAGE_KEYS.MATCHES, allMatches);
    } else {
      // Family was the sole liker, completely remove match record
      allMatches.splice(idx, 1);
      setStored(STORAGE_KEYS.MATCHES, allMatches);
    }
  }

  if (typeof window !== 'undefined') {
    broadcastAppEvent('jg_matches_changed');
    broadcastAppEvent('jg_data_reset');
  }
}

// ----------------------------------------------------------------------------
// FAVORITES
// ----------------------------------------------------------------------------

export function toggleFavorite(familyId: string, caregiverId: string): boolean {
  const allFavorites = getStored<FavoriteRow[]>(STORAGE_KEYS.FAVORITES, MOCK_FAVORITES);
  const idx = allFavorites.findIndex((f) => f.caregiver_id === caregiverId);

  if (idx >= 0) {
    allFavorites.splice(idx, 1);
    setStored(STORAGE_KEYS.FAVORITES, allFavorites);
    if (LIVE) track(Live.setFavorite(familyId, caregiverId, false));
    if (typeof window !== 'undefined') {
      broadcastAppEvent('jg_favorites_changed');
    }
    return false;
  } else {
    allFavorites.push({
      id: `fav-${caregiverId}`,
      family_id: familyId,
      caregiver_id: caregiverId,
      created_at: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.FAVORITES, allFavorites);
    if (LIVE) track(Live.setFavorite(familyId, caregiverId, true));
    if (typeof window !== 'undefined') {
      broadcastAppEvent('jg_favorites_changed');
    }
    return true;
  }
}

export function getFavoritesForUser(userId: string) {
  const allFavorites = getStored<FavoriteRow[]>(STORAGE_KEYS.FAVORITES, MOCK_FAVORITES);
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, MOCK_PROFILES);
  const caregiverDetails = getStored<Record<string, CaregiverDetails>>(
    STORAGE_KEYS.CAREGIVER_DETAILS,
    MOCK_CAREGIVER_DETAILS
  );
  const allSkills = getStored<Record<string, CaregiverCaseSkill[]>>(
    STORAGE_KEYS.CAREGIVER_SKILLS,
    MOCK_CAREGIVER_SKILLS
  );
  const allCerts = getStored<Record<string, Certificate[]>>(
    STORAGE_KEYS.CERTIFICATES,
    MOCK_CERTIFICATES
  );
  const allMatches = getStored<MatchRow[]>(STORAGE_KEYS.MATCHES, MOCK_MATCHES);
  const jobs = getStored<JobPost[]>(STORAGE_KEYS.JOB_POSTS, MOCK_JOB_POSTS);
  const allNeeds = getStored<Record<string, JobPostCaseNeed[]>>(
    STORAGE_KEYS.JOB_CASE_NEEDS,
    MOCK_JOB_CASE_NEEDS
  );

  const curUser = profiles.find((p) => p.id === userId);
  const isCaregiver = curUser?.role === 'caregiver' || userId.startsWith('cg-');

  if (isCaregiver) {
    // Caregiver favorites (favorited job posts, starting with 'job-')
    const userFavs = allFavorites.filter((f) =>
      LIVE ? jobs.some((j) => j.id === f.caregiver_id) : f.caregiver_id.startsWith('job-'));
    const caregiverDetail = caregiverDetails[userId];
    const caregiverSkills = allSkills[userId] || [];
    const qualifiedSkills = new Set(
      caregiverSkills
        .filter((s) => s.comfort_level === 'experienced' || s.comfort_level === 'trained')
        .map((s) => s.case_type)
    );

    return userFavs.map((fav) => {
      const job = jobs.find((j) => j.id === fav.caregiver_id);
      const famUser = profiles.find((p) => p.id === job?.family_id);
      const familyName = formatFamilyDisplayName(famUser?.display_name, job?.district);
      const familyAvatar = famUser?.avatar_url || (job?.family_id ? FAMILY_AVATARS[job.family_id] : null) || null;

      const needs = job ? allNeeds[job.id] || [] : [];
      const requiredNeeds = needs.filter((n) => n.is_required).map((n) => n.case_type);
      const iCanDoCount = requiredNeeds.filter((n) => qualifiedSkills.has(n)).length;

      let dist = 8.5;
      if (caregiverDetail && job) {
        if (caregiverDetail.home_district === job.district) dist = 3.2;
        else if (caregiverDetail.home_province === job.province) dist = 11.4;
        else dist = 24.0;
      }

      // Check if mutually matched
      const existingMatch = allMatches.find(
        (m) => m.job_post_id === (job?.id || '') && m.caregiver_id === userId
      );
      const isMatched = !!existingMatch?.matched_at;

      // Multi-factor Fit Score formula (Schema v3 & PRD formula out of 99):
      // 60% skills + 20% arrangement + 10% distance + 5% certs + 5% exp
      const caseRatio = requiredNeeds.length > 0 ? iCanDoCount / requiredNeeds.length : 0.8;
      let score = Math.round(caseRatio * 60);

      const arrangementMatch = caregiverDetail && job ? caregiverDetail.work_arrangements.includes(job.work_arrangement) : true;
      score += arrangementMatch ? 20 : 6;

      if (dist < 10) score += 10;
      else if (dist < 25) score += 7;
      else score += 3;

      const certs = allCerts[userId] || [];
      if (certs.length > 0) score += 5;

      const exp = caregiverDetail ? caregiverDetail.years_experience : 3;
      score += Math.round(Math.min(exp, 10) * 0.5);

      let fitScore = Math.min(Math.max(score, 45), 98);
      if (LIVE && job) fitScore = liveFitScore(job, userId, liveDistanceFor(job.id, userId));

      // Parse patient gender and age from description or metadata
      let pGender: string | null = null;
      const desc = job?.patient_description || '';
      if (desc.includes('คุณแม่') || desc.includes('คุณยาย') || desc.includes('เพศหญิง') || desc.includes('หญิง')) {
        pGender = 'หญิง';
      } else if (desc.includes('คุณพ่อ') || desc.includes('คุณตา') || desc.includes('คุณลุง') || desc.includes('เพศชาย') || desc.includes('ชาย')) {
        pGender = 'ชาย';
      } else if (famUser?.gender === 'female') {
        pGender = 'หญิง';
      } else if (famUser?.gender === 'male') {
        pGender = 'ชาย';
      }

      let pAge: number | null = null;
      const ageMatch = desc.match(/(?:อายุ|วัย)\s*(\d+)\s*ปี/) || desc.match(/(\d+)\s*ปี/);
      if (ageMatch && ageMatch[1]) {
        pAge = parseInt(ageMatch[1], 10);
      } else if ((famUser as any)?.age) {
        pAge = (famUser as any).age;
      }

      return {
        favorite: fav,
        caregiver: null,
        details: null,
        skills: [],
        certs: [],
        job: job || null,
        family_name: familyName,
        family_avatar_url: familyAvatar,
        family_gender: pGender,
        family_age: pAge,
        distance_km: dist,
        needs_i_can_do: iCanDoCount,
        needs_required: requiredNeeds.length || 1,
        required_cases: requiredNeeds,
        fit_score: fitScore,
        is_matched: isMatched,
      };
    });
  }




  // Family favorites (favorited caregivers)
  const userJob = jobs.find((j) => j.family_id === userId) || jobs[0];
  const requiredCases = userJob ? (allNeeds[userJob.id] || []).filter((n) => n.is_required).map((n) => n.case_type) : [];

  // Return all favorited caregivers (starting with 'cg-')
  const userFavs = allFavorites.filter((f) =>
    LIVE ? Boolean(caregiverDetails[f.caregiver_id]) : f.caregiver_id.startsWith('cg-'));

  return userFavs.map((fav) => {
    const cgProfile = profiles.find((p) => p.id === fav.caregiver_id);
    const details = caregiverDetails[fav.caregiver_id];
    const skills = allSkills[fav.caregiver_id] || [];
    const certs = allCerts[fav.caregiver_id] || [];

    const existingMatch = allMatches.find(
      (m) => m.job_post_id === (userJob?.id || '') && m.caregiver_id === fav.caregiver_id
    );
    const isMatched = !!existingMatch?.matched_at;

    let fitScore = 85;
    if (details) {
      const qualifiedSkillCodes = new Set(
        skills
          .filter((s) => s.comfort_level === 'experienced' || s.comfort_level === 'trained')
          .map((s) => s.case_type)
      );
      const matchedCases = requiredCases.filter((c) => qualifiedSkillCodes.has(c));
      const caseRatio = requiredCases.length > 0 ? matchedCases.length / requiredCases.length : 0.8;
      let score = Math.round(caseRatio * 60);

      const arrangementMatch = userJob ? details.work_arrangements.includes(userJob.work_arrangement) : true;
      score += arrangementMatch ? 20 : 6;

      let dist = 5.2;
      if (userJob) {
        if (details.home_district === userJob.district) dist = 2.8;
        else if (details.home_province === userJob.province) dist = 9.4;
        else dist = 22.0;
      }
      if (dist < 10) score += 10;
      else if (dist < 25) score += 7;
      else score += 3;

      if (certs.length > 0) score += 5;
      score += Math.round(Math.min(details.years_experience, 10) * 0.5);
      fitScore = Math.min(score, 99);
      if (LIVE && userJob) fitScore = liveFitScore(userJob, fav.caregiver_id, liveDistanceFor(userJob.id, fav.caregiver_id));
    }

    return {
      favorite: fav,
      caregiver: cgProfile,
      details,
      skills,
      certs,
      job: userJob || null,
      family_name: undefined,
      family_avatar_url: undefined,
      distance_km: undefined,
      needs_i_can_do: undefined,
      needs_required: undefined,
      required_cases: undefined,
      fit_score: fitScore,
      is_matched: isMatched,
    };
  });
}

// ----------------------------------------------------------------------------
// PLATFORM REVIEWS & NOTIFICATIONS
// ----------------------------------------------------------------------------

/**
 * In-app feedback (Objective 1). Five single-topic questions, 1–5.
 * Q3 and Q4 are family-only and are null for caregivers.
 */
export function submitPlatformReview(payload: {
  user_id: string;
  role: UserRole;
  ease_of_use_score: number;
  profile_clarity_score: number;
  summary_accuracy_score: number | null;
  tag_usefulness_score: number | null;
  overall_satisfaction_score: number;
  comment: string | null;
}): PlatformReview {
  const reviews = getStored<PlatformReview[]>(STORAGE_KEYS.REVIEWS, MOCK_REVIEWS);
  const newReview: PlatformReview = {
    id: `rev-${Date.now()}`,
    user_id: payload.user_id,
    role: payload.role,
    ease_of_use_score: payload.ease_of_use_score,
    profile_clarity_score: payload.profile_clarity_score,
    summary_accuracy_score: payload.summary_accuracy_score,
    tag_usefulness_score: payload.tag_usefulness_score,
    overall_satisfaction_score: payload.overall_satisfaction_score,
    comment: payload.comment,
    created_at: new Date().toISOString(),
  };
  reviews.unshift(newReview);
  setStored(STORAGE_KEYS.REVIEWS, reviews);
  if (LIVE) {
    track(Live.savePlatformReview(payload.user_id, {
      role: payload.role,
      ease: payload.ease_of_use_score,
      profile_clarity: payload.profile_clarity_score,
      summary_accuracy: payload.summary_accuracy_score,
      tag_usefulness: payload.tag_usefulness_score,
      overall: payload.overall_satisfaction_score,
      comment: payload.comment,
    }));
  }
  return newReview;
}

/** Task timing for Objective 1 (no-op when not live). */
export function markTaskStart(step: Live.TaskStep) {
  if (LIVE) Live.markTaskStart(step);
}

export function getNotifications(userId: string): NotificationRow[] {
  const notifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  return notifs.filter((n) => n.user_id === userId);
}

export function markNotificationRead(notifId: string): void {
  const notifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  const target = notifs.find((n) => n.id === notifId);
  if (target) {
    target.read_at = new Date().toISOString();
    setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }
  if (LIVE) track(Live.markRead(notifId));
}

export function deleteNotification(notifId: string): void {
  const notifs = getStored<NotificationRow[]>(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  const filtered = notifs.filter((n) => n.id !== notifId);
  setStored(STORAGE_KEYS.NOTIFICATIONS, filtered);
}


// ============================================================================
// LIVE RUNTIME — Supabase hydration, write-through queue, auth helpers
// ============================================================================

let pendingWrites: Promise<unknown> = Promise.resolve();

function reportLiveError(e: unknown) {
  const msg = (e as Error)?.message || String(e);
  console.error('[live]', e);
  try { localStorage.setItem('jg_live_last_error', `${new Date().toLocaleTimeString()} — ${msg}`); } catch { /* ignore */ }
  broadcastAppEvent('jg_live_error', { message: msg });
}

/** Queue a write; writes run in order, then the cache is refreshed from Supabase. */
function track(p: Promise<unknown>) {
  pendingWrites = pendingWrites
    .then(() => p)
    .then(() => refreshLive())
    .catch(reportLiveError);
}

export function waitForLiveWrites(): Promise<unknown> {
  return pendingWrites;
}

const LIVE_CACHE_KEYS = [
  STORAGE_KEYS.CURRENT_USER, STORAGE_KEYS.PROFILES, STORAGE_KEYS.CONTACTS, STORAGE_KEYS.CAREGIVER_DETAILS,
  STORAGE_KEYS.CAREGIVER_LOCATIONS, STORAGE_KEYS.CAREGIVER_SKILLS, STORAGE_KEYS.CERTIFICATES,
  STORAGE_KEYS.JOB_POSTS, STORAGE_KEYS.JOB_LOCATIONS, STORAGE_KEYS.JOB_CASE_NEEDS, STORAGE_KEYS.MATCHES,
  STORAGE_KEYS.FAVORITES, STORAGE_KEYS.AI_PROFILES, STORAGE_KEYS.AI_SUMMARIES, STORAGE_KEYS.NOTIFICATIONS,
  STORAGE_KEYS.REVIEWS, STORAGE_KEYS.IS_LOGGED_IN, STORAGE_KEYS.LIVE_DISTANCES, STORAGE_KEYS.LIVE_CANDIDATES,
  STORAGE_KEYS.REGISTERED_ACCOUNTS,
];

export function clearLiveCache() {
  if (typeof window === 'undefined') return;
  LIVE_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
}

function liveDistanceFor(jobId: string, caregiverId: string): number | null {
  const d = getStored<Record<string, number | null>>(STORAGE_KEYS.LIVE_DISTANCES, {});
  const me = getCurrentUser();
  const v = me.role === 'caregiver' ? d[jobId] : d[caregiverId];
  return typeof v === 'number' ? v : null;
}

/** Fit score 0–100 from the thesis algorithm (live.scoreMatch = backend score.py). */
function liveFitScore(job: JobPost, caregiverId: string, distanceKm: number | null): number {
  const summaries = getStored<Record<string, AIApplicantSummary>>(STORAGE_KEYS.AI_SUMMARIES, {});
  const ai = summaries[`${job.id}:${caregiverId}`];
  if (ai) return Math.round(ai.fit_score);
  const needs = getStored<Record<string, JobPostCaseNeed[]>>(STORAGE_KEYS.JOB_CASE_NEEDS, {})[job.id] || [];
  const det = getStored<Record<string, CaregiverDetails>>(STORAGE_KEYS.CAREGIVER_DETAILS, {})[caregiverId];
  const skills = getStored<Record<string, CaregiverCaseSkill[]>>(STORAGE_KEYS.CAREGIVER_SKILLS, {})[caregiverId] || [];
  const certs = getStored<Record<string, Certificate[]>>(STORAGE_KEYS.CERTIFICATES, {})[caregiverId] || [];
  const r = Live.scoreMatch({
    needs: needs.filter((n) => n.is_required).map((n) => n.case_type),
    jobWageMax: job.expected_wage,
    jobWageUnit: job.wage_unit,
    distanceKm,
    skills,
    cgWageMin: det?.expected_wage_min || null,
    cgWageUnit: det?.wage_unit || null,
    yearsExperience: det?.years_experience || 0,
    hasVerifiedCert: certs.some((c) => c.verification_status === 'verified'),
  });
  return Math.round(r.total);
}

function applySnapshot(snap: Live.Snapshot) {
  const { me } = snap;
  setStored(STORAGE_KEYS.CURRENT_USER, {
    id: me.id,
    role: me.role,
    display_name: me.display_name,
    phone: snap.contact?.phone || '',
    line_id: snap.contact?.line_id || null,
    email: me.email,
    avatar_url: snap.profiles.find((p) => p.id === me.id)?.avatar_url || null,
    gender: snap.caregiverDetails[me.id]?.gender || 'unspecified',
    age: snap.caregiverDetails[me.id]?.age ?? null,
  } as CurrentUserSession);
  localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
  setStored(STORAGE_KEYS.PROFILES, snap.profiles);
  setStored(STORAGE_KEYS.CONTACTS, snap.contacts);
  setStored(STORAGE_KEYS.CAREGIVER_DETAILS, snap.caregiverDetails);
  setStored(STORAGE_KEYS.CAREGIVER_LOCATIONS, snap.caregiverLocations);
  setStored(STORAGE_KEYS.CAREGIVER_SKILLS, snap.caregiverSkills);
  setStored(STORAGE_KEYS.CERTIFICATES, snap.certificates);
  setStored(STORAGE_KEYS.JOB_POSTS, snap.jobPosts);
  setStored(STORAGE_KEYS.JOB_LOCATIONS, snap.jobLocations);
  setStored(STORAGE_KEYS.JOB_CASE_NEEDS, snap.jobNeeds);
  setStored(STORAGE_KEYS.MATCHES, snap.matches);
  // caregiver "saved jobs" have no table: keep them locally next to the DB favorites
  const localJobFavs = getStored<FavoriteRow[]>(STORAGE_KEYS.FAVORITES, [])
    .filter((f) => snap.jobPosts.some((j) => j.id === f.caregiver_id));
  setStored(STORAGE_KEYS.FAVORITES, [...snap.favorites, ...localJobFavs]);
  setStored(STORAGE_KEYS.AI_PROFILES, snap.aiProfiles);
  setStored(STORAGE_KEYS.AI_SUMMARIES, snap.aiSummaries);
  setStored(STORAGE_KEYS.NOTIFICATIONS, snap.notifications);
  setStored(STORAGE_KEYS.LIVE_DISTANCES, snap.distances);
  setStored(STORAGE_KEYS.LIVE_CANDIDATES, snap.candidates);
}

let hydrating: Promise<boolean> | null = null;

/** Load everything the signed-in user may see from Supabase into the cache. */
export function hydrateLive(): Promise<boolean> {
  if (!LIVE || typeof window === 'undefined') return Promise.resolve(false);
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      // leftovers from the offline demo (can be several MB of images)
      ['jg_registered_accounts_v3', 'jg_reviews_v3', 'jg_feedback_v3', 'jg_event_ping']
        .forEach((k) => localStorage.removeItem(k));
      Object.keys(localStorage).filter((k) => k.startsWith('jg_seed_version')).forEach((k) => localStorage.removeItem(k));
      const snap = await Live.fetchSnapshot();
      if (!snap) {
        clearLiveCache();
        return false;
      }
      applySnapshot(snap);
      broadcastAppEvent('jg_user_changed');
      broadcastAppEvent('jg_data_reset');
      if (snap.me.role === 'family') void refreshCandidateAI(snap);
      return true;
    } catch (e) {
      reportLiveError(e);
      return false;
    } finally {
      hydrating = null;
    }
  })();
  return hydrating;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
export function refreshLive() {
  if (!LIVE || typeof window === 'undefined') return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { void hydrateLive(); }, 300);
}

/** Family side: ask the backend for AI summaries + fit scores of the top candidates. */
async function refreshCandidateAI(snap: Live.Snapshot) {
  for (const [jobId, ids] of Object.entries(snap.candidates)) {
    const top = ids.slice(0, 20);
    if (!top.length || top.every((id) => snap.aiSummaries[`${jobId}:${id}`])) continue;
    try {
      const results = await Live.applicantSummaries(jobId, top);
      const all = getStored<Record<string, AIApplicantSummary>>(STORAGE_KEYS.AI_SUMMARIES, {});
      results.forEach((r) => {
        all[`${jobId}:${r.caregiver_id}`] = {
          id: `${jobId}:${r.caregiver_id}`,
          job_post_id: jobId,
          caregiver_id: r.caregiver_id,
          summary_text: r.summary_text || 'AI ไม่สามารถสรุปได้ในขณะนี้ — แสดงคะแนนจากเกณฑ์จับคู่',
          fit_score: r.fit_score,
          fit_rationale: {
            pros: Live.prosFromBreakdown(r.breakdown),
            to_verify: Live.toVerifyFromMissing([...r.missing_specialized, ...(r.missing_general || [])]),
          },
          is_active: true,
          created_at: new Date().toISOString(),
        };
      });
      setStored(STORAGE_KEYS.AI_SUMMARIES, all);
      broadcastAppEvent('jg_data_reset');
    } catch (e) {
      reportLiveError(e);
    }
  }
}

// ---- auth -------------------------------------------------------------------
const PENDING_SIGNUP_KEY = 'jg_pending_signup_v1';

export function savePendingSignup(p: Live.PendingSignup) {
  sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(p));
}

export function hasPendingSignup(): boolean {
  return typeof window !== 'undefined' && !!sessionStorage.getItem(PENDING_SIGNUP_KEY);
}

export async function liveSignIn(email: string, password: string): Promise<CurrentUserSession> {
  clearLiveCache();
  await Live.signIn(email, password);
  await hydrateLive();
  broadcastAppEvent('jg_auth_changed');
  return getCurrentUser();
}

export async function liveCompleteSignup(role: UserRole): Promise<CurrentUserSession> {
  const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) throw new Error('ไม่พบข้อมูลการสมัคร กรุณาสมัครใหม่อีกครั้ง');
  clearLiveCache();
  const me = await Live.signUp(JSON.parse(raw), role);
  sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  void Live.markTaskDone(me.id, role, 'signup');
  await hydrateLive();
  broadcastAppEvent('jg_auth_changed');
  return getCurrentUser();
}

export const LIVE_DEMO = { emails: Live.DEMO_EMAILS, password: Live.DEMO_PASSWORD };

export function getLastLiveError(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('jg_live_last_error') || '';
}
