'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  getCurrentUser,
  getCaregiverProfileBundle,
  updateCaregiverProfileText,
  publishCaregiverProfile,
  LIVE,
  getLastLiveError,
  saveCaregiverDraft,
  logout,
  getNameInitial,
  ensureKhunPrefix,
  stripKhunPrefix,
} from '@/services/api';
import {
  SparklesIcon,
  CheckIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  BriefcaseIcon,
} from '@/components/Icons';
import { CASE_TYPES_V3, CARE_ROLES_META, COMFORT_LEVEL_META } from '@/types/database';

export default function CaregiverProfilePage() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [caregiverId, setCaregiverId] = useState(() => {
    const cur = getCurrentUser();
    return cur.role === 'caregiver' ? cur.id : 'cg-1-wimon';
  });

  const [bundle, setBundle] = useState<ReturnType<typeof getCaregiverProfileBundle> | null>(() => {
    const cur = getCurrentUser();
    const id = cur.role === 'caregiver' ? cur.id : 'cg-1-wimon';
    const b = getCaregiverProfileBundle(id);
    return b.profile && b.detail ? b : getCaregiverProfileBundle('cg-1-wimon');
  });

  // Editable text state
  const [isEditingText, setIsEditingText] = useState(false);
  const [currentText, setCurrentText] = useState(() => {
    const cur = getCurrentUser();
    const id = cur.role === 'caregiver' ? cur.id : 'cg-1-wimon';
    const b = getCaregiverProfileBundle(id);
    const active = b.profile && b.detail ? b : getCaregiverProfileBundle('cg-1-wimon');
    return active.aiProfile?.profile_text || '';
  });

  // Always refresh latest data on mount or when user updates
  React.useEffect(() => {
    const refreshData = () => {
      const cur = getCurrentUser();
      const id = cur.role === 'caregiver' ? cur.id : 'cg-1-wimon';
      setCaregiverId(id);
      const b = getCaregiverProfileBundle(id);
      const active = b.profile && b.detail ? b : getCaregiverProfileBundle('cg-1-wimon');
      setBundle(active);
      if (active.aiProfile?.profile_text) {
        setCurrentText(active.aiProfile.profile_text);
      }
    };

    refreshData();
    window.addEventListener('jg_user_changed', refreshData);
    return () => {
      window.removeEventListener('jg_user_changed', refreshData);
    };
  }, []);
  const [hasEdited, setHasEdited] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handleSaveTextEdit = () => {
    if (!bundle?.aiProfile || !currentText.trim()) return;
    updateCaregiverProfileText(
      caregiverId,
      currentText,
      bundle.aiProfile.profile_text
    );
    setHasEdited(true);
    setIsEditingText(false);
  };

  const handlePublish = () => {
    publishCaregiverProfile(caregiverId);
    setPublishSuccess(true);
    // Refresh bundle
    const updated = getCaregiverProfileBundle(caregiverId);
    setBundle(updated);
  };

  if (!bundle || !bundle.detail) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
        <Topbar />
        {LIVE ? (
          <div className="flex-1 p-8 max-w-xl mx-auto text-center space-y-4">
            <p className="font-bold text-indigo-950">ยังไม่พบข้อมูลโปรไฟล์ผู้ดูแลของบัญชีนี้ในระบบ</p>
            <p className="text-sm text-stone-600">บัญชี: {getCurrentUser().email || getCurrentUser().id || 'ยังไม่ได้เข้าสู่ระบบ'}</p>
            {getLastLiveError() && (
              <p className="text-xs text-left bg-rose-50 border-2 border-rose-700 text-rose-900 p-3 break-words">
                ข้อผิดพลาดล่าสุด: {getLastLiveError()}
              </p>
            )}
            <button
              onClick={() => router.push('/caregiver/onboarding')}
              className="px-4 py-2 bg-indigo-950 text-white font-bold"
            >
              กรอกโปรไฟล์อีกครั้ง
            </button>
          </div>
        ) : (
          <div className="flex-1 p-8 text-center font-mono">กำลังโหลดข้อมูลโปรไฟล์...</div>
        )}
        <Footer />
      </div>
    );
  }

  const { detail, profile, skills, certificates, aiProfile } = bundle;
  const isPublished = detail.is_visible || publishSuccess;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <div className="flex-1 bg-[#735095] py-8 px-4">
        <main className="max-w-4xl mx-auto w-full space-y-6">
          {/* Banner: AI Origin & Verification Gate */}
        <div className="bg-white border-2 border-indigo-950 px-4 py-2.5 riso-shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#D946EF] text-white flex items-center justify-center shrink-0 border border-indigo-950">
              <SparklesIcon className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-950">
                AI WORKER PROFILE
              </span>
              <span className="text-[11px] text-stone-500 hidden sm:inline">•</span>
              <p className="text-[11px] text-stone-600">
                เรียบเรียงโดย AI จาก 5 ขั้นตอนของคุณ ตรวจสอบก่อนเผยแพร่
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPublished ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-900 font-mono font-bold text-[11px] flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                เผยแพร่แล้ว
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 border border-amber-900 font-mono font-bold text-[11px]">
                ร่างโปรไฟล์
              </span>
            )}
          </div>
        </div>

        {/* Main Profile Card (Print Cover Style) */}
        <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-indigo-950 pb-6 gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {profile?.avatar_url || detail.avatar_url ? (
                <img
                  src={profile?.avatar_url || detail.avatar_url || ''}
                  alt={profile?.display_name || 'รูปโปรไฟล์'}
                  className="w-36 h-36 sm:w-48 sm:h-48 object-cover border-2 border-indigo-950 riso-shadow-md shrink-0 bg-white"
                />
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 bg-indigo-950 text-white font-mono font-black text-4xl sm:text-5xl flex items-center justify-center border-2 border-indigo-950 riso-shadow-md shrink-0">
                  {getNameInitial(profile?.display_name, 'ผ')}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                    {ensureKhunPrefix(profile?.display_name) || 'ผู้ดูแล'}
                  </h1>
                  {detail.gender && detail.gender !== 'unspecified' && (
                    <span className="px-2.5 py-0.5 bg-stone-100 text-indigo-950 border border-indigo-950 text-xs font-mono font-bold">
                      {detail.gender === 'female' ? 'เพศหญิง' : 'เพศชาย'}
                    </span>
                  )}
                  {typeof detail.age === 'number' && detail.age > 0 && (
                    <span className="px-2.5 py-0.5 bg-stone-100 text-indigo-950 border border-indigo-950 text-xs font-mono font-bold">
                      อายุ {detail.age} ปี
                    </span>
                  )}
                  {certificates.length > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-900 text-xs font-bold flex items-center gap-1">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      มีใบรับรอง ({certificates.length})
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-bold text-stone-700">
                  {detail.care_roles.map((r) => CARE_ROLES_META[r]?.label_th || r).join(' • ')}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-600 pt-0.5">
                  <span className="flex items-center gap-1">
                    <BriefcaseIcon className="w-3.5 h-3.5 text-stone-500" />
                    ประสบการณ์ {detail.years_experience} ปี
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5 text-stone-500" />
                    {detail.home_district}, {detail.home_province} (รัศมี {detail.max_travel_km} กม.)
                  </span>
                </div>
              </div>
            </div>

            {/* Wage & Work Arrangement Box */}
            <div className="w-full sm:w-auto bg-[#FAF9F6] border-2 border-indigo-950 p-3.5 riso-shadow-sm text-right shrink-0">
              <span className="text-[11px] font-mono text-stone-500 block uppercase">อัตราค่าบริการ</span>
              <span className="text-lg sm:text-xl font-mono font-black text-[#D946EF] block">
                ฿{detail.expected_wage_min.toLocaleString()} - {detail.expected_wage_max.toLocaleString()}
              </span>
              <span className="text-xs font-mono font-bold text-indigo-950">
                /{detail.wage_unit === 'month' ? 'เดือน' : detail.wage_unit === 'day' ? 'วัน' : 'ชม.'} (
                {detail.work_arrangements.map((a) => (a === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ')).join('/')})
              </span>
            </div>
          </div>

          {/* AI Narrative Section ("เกี่ยวกับฉัน") */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-950">
                  เกี่ยวกับฉัน (AI NARRATIVE)
                </span>
                {hasEdited && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-900 border border-amber-900 font-mono">
                    แก้ไขแล้ว (Edited)
                  </span>
                )}
              </div>

              {!isEditingText && (
                <button
                  type="button"
                  onClick={() => setIsEditingText(true)}
                  className="min-h-[36px] px-3 py-1 text-xs font-bold bg-white text-indigo-950 border border-indigo-950 hover:bg-stone-50 riso-shadow-sm"
                >
                  ✎ แก้ไขข้อความ
                </button>
              )}
            </div>

            {isEditingText ? (
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  className="w-full p-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentText(aiProfile?.profile_text || '');
                      setIsEditingText(false);
                    }}
                    className="min-h-[40px] px-4 py-1.5 text-xs font-bold border border-indigo-950 bg-white hover:bg-stone-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTextEdit}
                    className="min-h-[40px] px-4 py-1.5 text-xs font-bold bg-indigo-950 text-white border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065]"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 text-sm leading-relaxed text-stone-800">
                {currentText}
              </div>
            )}
          </div>

          {/* AI Key Strengths */}
          {aiProfile?.key_strengths && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                จุดเด่นความเชี่ยวชาญ (Key Strengths)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiProfile.key_strengths.map((str, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-indigo-950 text-xs flex items-start gap-2 riso-shadow-sm"
                  >
                    <CheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span className="text-stone-800">{str}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12-Case Skills Matrix Breakdown */}
          <div className="space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
              ทักษะและความคุ้นเคย 12 เคส (Schema v3)
            </span>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => {
                const meta = COMFORT_LEVEL_META[s.comfort_level];
                const caseMeta = CASE_TYPES_V3[s.case_type];
                return (
                  <div
                    key={s.case_type}
                    className="px-2.5 py-1.5 bg-white border border-indigo-950 text-xs flex items-center gap-1.5 riso-shadow-sm"
                  >
                    <span className="font-bold text-indigo-950">
                      {caseMeta?.title_th || s.case_type}
                    </span>
                    <span className={`px-1.5 py-0.2 text-[10px] font-bold border ${meta?.color}`}>
                      {meta?.label_th}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certificates Gallery (Signed URLs) */}
          <div className="space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
              เอกสารและใบรับรอง (Certificates via Signed URLs)
            </span>
            {certificates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-[#FAF9F6] border-2 border-indigo-950 p-3 riso-shadow-sm flex items-center gap-3"
                  >
                    {cert.preview_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cert.preview_url}
                        alt={cert.file_name}
                        className="w-16 h-16 object-cover border border-indigo-950 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate text-indigo-950">{cert.file_name}</p>
                      <p className="text-[11px] text-stone-500 font-mono truncate">{cert.cert_type}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-900">
                        ✓ {cert.verification_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-stone-50 border border-indigo-950 text-xs text-stone-500">
                ยังไม่ได้แนบใบรับรองในขณะนี้ (สามารถแก้ไขและแนบเพิ่มเติมได้ตลอดเวลา)
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-amber-50 border border-amber-900/40 text-xs text-amber-950 flex items-start gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <strong>การคุ้มครองข้อมูลติดต่อ:</strong> เบอร์โทรศัพท์และ LINE ID ของคุณจะไม่แสดงต่อสาธารณะ
              ครอบครัวจะสามารถเปิดดูได้เฉพาะเมื่อทั้งสองฝ่ายกดถูกใจตรงกันแล้วเท่านั้น
            </div>
          </div>

          {/* Action Gate Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t-2 border-indigo-950 pt-6">
            <button
              type="button"
              onClick={() => {
                if (bundle) {
                  const { profile: p, detail: d, contact: c, skills: s, certificates: certs } = bundle;
                  saveCaregiverDraft({
                    display_name: stripKhunPrefix(p?.display_name || ''),
                    phone: (c?.phone || '').replace(/\D/g, '').slice(0, 10),
                    line_id: c?.line_id || '',
                    avatar_url: p?.avatar_url || d.avatar_url || null,
                    gender: d.gender || p?.gender || 'unspecified',
                    age: typeof d.age === 'number' ? d.age : null,
                    home_province: d.home_province || '',
                    home_district: d.home_district || '',
                    address_text: '',
                    max_travel_km: d.max_travel_km || 20,
                    care_roles: d.care_roles || ['caregiver'],
                    years_experience: d.years_experience || 1,
                    expected_wage_min: d.expected_wage_min || 20000,
                    expected_wage_max: d.expected_wage_max || 25000,
                    wage_unit: d.wage_unit || 'month',
                    work_arrangements: d.work_arrangements || ['daily'],
                    skills: (s || []).map((sk) => ({
                      case_type: sk.case_type,
                      comfort_level: sk.comfort_level,
                    })),
                    certificates: (certs || []).map((cr) => ({
                      file_name: cr.file_name,
                      cert_type: cr.cert_type,
                      preview_url: cr.preview_url || '',
                    })),
                    no_certificates: !certs || certs.length === 0,
                  });
                }
                router.push('/caregiver/onboarding?mode=edit');
              }}
              className="min-h-[48px] px-5 py-2.5 bg-white text-indigo-950 border-2 border-indigo-950 font-bold text-xs sm:text-sm hover:bg-stone-50 riso-shadow-sm text-center flex items-center justify-center gap-1.5 cursor-pointer riso-btn-active"
            >
              <span>แก้ไขโปรไฟล์</span>
            </button>

            <div className="flex items-center gap-3">
              {!isPublished ? (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 bg-[#D946EF] text-white border-2 border-indigo-950 font-black text-xs sm:text-sm hover:bg-[#c026d3] riso-shadow-lg flex items-center justify-center gap-2 riso-btn-active"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>ยืนยันและเผยแพร่โปรไฟล์ (Publish)</span>
                </button>
              ) : (
                <Link
                  href="/caregiver/jobs"
                  className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 bg-indigo-950 text-white border-2 border-indigo-950 font-black text-xs sm:text-sm hover:bg-[#2E1065] riso-shadow-lg flex items-center justify-center gap-2 riso-btn-active"
                >
                  <span>ไปดูฟีดงานสำหรับคุณ (Swipe UI)</span>
                  <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
                </Link>
              )}
            </div>
          </div>

          {/* Logout Button (Bottom of Profile Card, Red Font) - Only show after profile is published */}
          {isPublished && (
            <div className="border-t border-dashed border-stone-300 pt-6 mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="inline-flex items-center justify-center min-h-[54px] w-full sm:w-auto px-10 py-3 bg-white text-red-600 hover:text-red-700 border-2 border-red-600 hover:border-red-700 font-black text-base sm:text-lg riso-shadow hover:bg-red-50 riso-btn-active cursor-pointer transition-all"
              >
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Confirmation Modal for Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white border-4 border-indigo-950 p-6 sm:p-7 max-w-sm w-full riso-shadow-xl space-y-6 text-center">
            <h3 className="text-base sm:text-lg font-black text-indigo-950 pt-2">
              คุณแน่ใจใช่ไหมที่จะออกจากระบบ
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="min-h-[44px] px-4 py-2 bg-white text-stone-700 border-2 border-indigo-950 font-bold text-sm hover:bg-stone-50 riso-shadow-sm riso-btn-active cursor-pointer"
              >
                ไม่
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setShowLogoutModal(false);
                  router.push('/');
                }}
                className="min-h-[44px] px-4 py-2 bg-white text-indigo-950 border-2 border-indigo-950 font-bold text-sm hover:bg-stone-50 riso-shadow-sm riso-btn-active cursor-pointer"
              >
                ใช่
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
