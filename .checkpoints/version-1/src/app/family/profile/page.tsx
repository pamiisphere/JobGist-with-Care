'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  getCurrentUser,
  getFamilyProfileBundle,
  updateFamilyJobPostText,
  publishFamilyJobPost,
  saveFamilyDraft,
  logout,
  initSeedData,
  getNameInitial,
} from '@/services/api';
import {
  SparklesIcon,
  CheckIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  BriefcaseIcon,
  UserIcon,
} from '@/components/Icons';
import { CASE_TYPES_V3 } from '@/types/database';

export default function FamilyProfilePage() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  React.useEffect(() => {
    initSeedData();
    const reload = () => {
      const cur = getCurrentUser();
      const id = cur.role === 'family' ? cur.id : 'fam-1-wanwimon';
      const b = getFamilyProfileBundle(id);
      const activeBundle = b.jobPost ? b : getFamilyProfileBundle('fam-1-wanwimon');
      setBundle(activeBundle);
      if (activeBundle.jobPost) {
        setCurrentText(activeBundle.jobPost.patient_description || '');
      }
    };
    reload();

    window.addEventListener('jg_user_changed', reload);
    window.addEventListener('jg_profile_updated', reload);
    window.addEventListener('jg_data_reset', reload);
    return () => {
      window.removeEventListener('jg_user_changed', reload);
      window.removeEventListener('jg_profile_updated', reload);
      window.removeEventListener('jg_data_reset', reload);
    };
  }, []);

  const [familyId] = useState(() => {
    const cur = getCurrentUser();
    return cur.role === 'family' ? cur.id : 'fam-1-wanwimon';
  });

  const [bundle, setBundle] = useState<ReturnType<typeof getFamilyProfileBundle> | null>(() => {
    initSeedData();
    const cur = getCurrentUser();
    const id = cur.role === 'family' ? cur.id : 'fam-1-wanwimon';
    const b = getFamilyProfileBundle(id);
    return b.jobPost ? b : getFamilyProfileBundle('fam-1-wanwimon');
  });

  // Editable description text state
  const [isEditingText, setIsEditingText] = useState(false);
  const [currentText, setCurrentText] = useState(() => {
    const cur = getCurrentUser();
    const id = cur.role === 'family' ? cur.id : 'fam-1-wanwimon';
    const b = getFamilyProfileBundle(id);
    const active = b.jobPost ? b : getFamilyProfileBundle('fam-1-wanwimon');
    return active.jobPost?.patient_description || '';
  });
  const [hasEdited, setHasEdited] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handleSaveTextEdit = () => {
    if (!bundle?.jobPost || !currentText.trim()) return;
    updateFamilyJobPostText(
      bundle.jobPost.id,
      currentText,
      bundle.jobPost.patient_description,
      familyId
    );
    setHasEdited(true);
    setIsEditingText(false);
  };

  const handlePublish = () => {
    if (!bundle?.jobPost) return;
    publishFamilyJobPost(bundle.jobPost.id);
    setPublishSuccess(true);
    const updated = getFamilyProfileBundle(familyId);
    setBundle(updated);
  };

  if (!bundle || !bundle.jobPost) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
        <Topbar />
        <div className="flex-1 p-8 text-center font-mono">กำลังโหลดข้อมูลโปรไฟล์ครอบครัว...</div>
        <Footer />
      </div>
    );
  }

  const { profile, jobPost, location, caseNeeds } = bundle;
  const isPublished = jobPost.status === 'open' || publishSuccess;

  // Gender text formatting
  const genderText =
    jobPost.preferred_caregiver_gender === 'female'
      ? 'ต้องการผู้ดูแลเพศหญิง'
      : jobPost.preferred_caregiver_gender === 'male'
      ? 'ต้องการผู้ดูแลเพศชาย'
      : 'รับผู้ดูแลทุกเพศ';

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
                  AI FAMILY PROFILE
                </span>
                <span className="text-[11px] text-stone-500 hidden sm:inline">•</span>
                <p className="text-[11px] text-stone-600">
                  เรียบเรียงโดย AI จากข้อมูลอาการและเงื่อนไขของคุณ ตรวจสอบก่อนเผยแพร่
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
                  ร่างประกาศ
                </span>
              )}
            </div>
          </div>

          {/* Main Profile Card (Print Cover Style) */}
          <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-indigo-950 pb-6 gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                {/* Family Avatar / Initials */}
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-36 h-36 sm:w-48 sm:h-48 object-cover border-2 border-indigo-950 riso-shadow-md shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-48 sm:h-48 bg-indigo-950 text-white font-mono font-black text-4xl sm:text-5xl flex items-center justify-center border-2 border-indigo-950 riso-shadow-md shrink-0">
                    {getNameInitial(profile?.display_name, 'พ')}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                      {profile?.display_name || 'ครอบครัวผู้ว่าจ้าง'}
                    </h1>
                    <span className="px-2.5 py-0.5 bg-purple-100 text-[#735095] border border-indigo-950 text-xs font-mono font-bold">
                      ครอบครัวผู้ว่าจ้าง
                    </span>
                    {profile?.gender && profile.gender !== 'unspecified' && (
                      <span className="px-2.5 py-0.5 bg-stone-100 text-indigo-950 border border-indigo-950 text-xs font-mono font-bold">
                        {profile.gender === 'female' ? 'เพศหญิง' : 'เพศชาย'}
                      </span>
                    )}
                    {typeof getCurrentUser().age === 'number' && (getCurrentUser().age as number) > 0 ? (
                      <span className="px-2.5 py-0.5 bg-stone-100 text-indigo-950 border border-indigo-950 text-xs font-mono font-bold">
                        อายุ {getCurrentUser().age} ปี
                      </span>
                    ) : familyId === 'fam-1-wanwimon' ? (
                      <span className="px-2.5 py-0.5 bg-stone-100 text-indigo-950 border border-indigo-950 text-xs font-mono font-bold">
                        อายุ 45 ปี
                      </span>
                    ) : null}
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-900 text-xs font-bold flex items-center gap-1">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      ยืนยันตัวตนแล้ว
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-stone-700">
                    {genderText} • {jobPost.work_arrangement === 'live_in' ? 'พักอยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-600 pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="w-3.5 h-3.5 text-stone-500" />
                      เขต{jobPost.district}, {jobPost.province}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <BriefcaseIcon className="w-3.5 h-3.5 text-stone-500" />
                      เริ่มงาน {jobPost.start_date || 'ทันที'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wage Offer Box */}
              <div className="w-full sm:w-auto bg-[#FAF9F6] border-2 border-indigo-950 p-3.5 riso-shadow-sm text-right shrink-0">
                <span className="text-[11px] font-mono text-stone-500 block uppercase">งบประมาณค่าตอบแทน</span>
                <span className="text-lg sm:text-xl font-mono font-black text-[#D946EF] block">
                  ฿{jobPost.expected_wage ? jobPost.expected_wage.toLocaleString() : 'ตามตกลง'}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-950">
                  /{jobPost.wage_unit === 'month' ? 'เดือน' : jobPost.wage_unit === 'day' ? 'วัน' : 'ชม.'} (
                  {jobPost.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'})
                </span>
              </div>
            </div>

            {/* Patient Symptoms & Conditions Narrative */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-950">
                    อาการผู้ป่วยและรายละเอียดงาน (PATIENT & JOB DESCRIPTION)
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
                        setCurrentText(jobPost.patient_description || '');
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

            {/* Case Needs (ทักษะและหัตถการที่ผู้ป่วยต้องการ) */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                ทักษะการดูแลที่ต้องการ (REQUIRED CARE SKILLS)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {caseNeeds.map((need) => {
                  const meta = CASE_TYPES_V3[need.case_type];
                  return (
                    <div
                      key={need.id}
                      className="p-3 bg-[#FAF9F6] border border-indigo-950 flex items-center justify-between text-xs font-bold text-indigo-950 riso-shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{meta?.title_th || need.case_type}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-white border border-indigo-950 text-indigo-950">
                        {need.is_required ? 'จำเป็น' : 'ทักษะเสริม'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location & Extra Benefits Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                  สถานที่ปฏิบัติงาน
                </span>
                <p className="text-xs font-bold text-indigo-950">
                  {location?.address_text || `เขต${jobPost.district}, ${jobPost.province}`}
                </p>
                <p className="text-[11px] text-stone-500">
                  * ที่อยู่ละเอียดจะถูกส่งให้ผู้ดูแลเมื่อทั้งสองฝ่ายกดถูกใจตรงกันเท่านั้น
                </p>
              </div>

              <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                  สวัสดิการและสิ่งอำนวยความสะดวก
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-indigo-950">
                  {Boolean(jobPost.extra_answers?.room_provided) && (
                    <span className="px-2 py-1 bg-white border border-indigo-950">✓ ห้องนอนส่วนตัว</span>
                  )}
                  {Boolean(jobPost.extra_answers?.meals_included) && (
                    <span className="px-2 py-1 bg-white border border-indigo-950">✓ อาหาร 3 มื้อ</span>
                  )}
                  {Boolean(jobPost.extra_answers?.wifi) && (
                    <span className="px-2 py-1 bg-white border border-indigo-950">✓ Wi-Fi อินเทอร์เน็ต</span>
                  )}
                  {Boolean(jobPost.extra_answers?.weekend_off) && (
                    <span className="px-2 py-1 bg-white border border-indigo-950">✓ วันหยุดประจำสัปดาห์</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t-2 border-indigo-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  const draftData: Record<string, any> = {
                    patient_description: jobPost.patient_description,
                    work_arrangement: jobPost.work_arrangement,
                    province: jobPost.province,
                    district: jobPost.district,
                    address_text: location?.address_text || '',
                    preferred_caregiver_gender: jobPost.preferred_caregiver_gender,
                    expected_wage: jobPost.expected_wage,
                    wage_unit: jobPost.wage_unit,
                    start_date: jobPost.start_date || '',
                    cases: (caseNeeds || []).map((c) => ({
                      case_type: c.case_type,
                      is_required: c.is_required,
                    })),
                    status: jobPost.status === 'open' ? 'open' : 'draft',
                  };
                  if (profile?.display_name) {
                    draftData.display_name = profile.display_name;
                  }
                  if (profile?.gender) {
                    draftData.gender = profile.gender;
                  } else {
                    const cur = getCurrentUser();
                    if (cur.gender) draftData.gender = cur.gender;
                  }
                  const curUser = getCurrentUser();
                  if (typeof curUser.age === 'number' && curUser.age > 0) {
                    draftData.age = curUser.age;
                  } else if (familyId === 'fam-1-wanwimon') {
                    draftData.age = 45;
                  }
                  if (profile?.avatar_url) {
                    draftData.avatar_url = profile.avatar_url;
                  }
                  if (bundle?.contact?.phone) {
                    draftData.phone = bundle.contact.phone;
                  }
                  if (bundle?.contact?.line_id) {
                    draftData.line_id = bundle.contact.line_id;
                  }
                  saveFamilyDraft(draftData);
                  router.push('/family/onboarding?mode=edit');
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 border-2 border-indigo-950 font-bold text-xs sm:text-sm hover:bg-stone-100 flex items-center justify-center gap-1.5 cursor-pointer riso-btn-active bg-white text-indigo-950"
              >
                <span>แก้ไขโปรไฟล์</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!isPublished ? (
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 bg-[#D946EF] text-white border-2 border-indigo-950 font-black text-xs sm:text-sm hover:bg-[#c026d3] riso-shadow-lg flex items-center justify-center gap-2 riso-btn-active"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    <span>ยืนยันและเปิดรับสมัคร (Publish)</span>
                  </button>
                ) : (
                  <Link
                    href="/family/applicants"
                    className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 bg-indigo-950 text-white border-2 border-indigo-950 font-black text-xs sm:text-sm hover:bg-[#2E1065] riso-shadow-lg flex items-center justify-center gap-2 riso-btn-active"
                  >
                    <span>ไปดูผู้ดูแลที่เหมาะสม (Applicants)</span>
                    <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
                  </Link>
                )}
              </div>
            </div>

            {/* Logout Button (Bottom of Profile Card, Red Font) */}
            <div className="border-t border-dashed border-stone-300 pt-6 mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="inline-flex items-center justify-center min-h-[54px] w-full sm:w-auto px-10 py-3 bg-white text-red-600 hover:text-red-700 border-2 border-red-600 hover:border-red-700 font-black text-base sm:text-lg riso-shadow hover:bg-red-50 riso-btn-active cursor-pointer transition-all"
              >
                ออกจากระบบ
              </button>
            </div>
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
