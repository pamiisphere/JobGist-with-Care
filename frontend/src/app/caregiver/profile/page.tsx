'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  getCurrentUser,
  getCaregiverProfileBundle,
  updateCaregiverProfileText,
  publishCaregiverProfile,
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
  const [caregiverId] = useState(() => {
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
        <div className="flex-1 p-8 text-center font-mono">กำลังโหลดข้อมูลโปรไฟล์...</div>
        <Footer />
      </div>
    );
  }

  const { detail, profile, skills, certificates, aiProfile } = bundle;
  const isPublished = detail.is_visible || publishSuccess;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Banner: AI Origin & Verification Gate */}
        <div className="bg-white border-2 border-indigo-950 p-4 riso-shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#D946EF] text-white flex items-center justify-center shrink-0 border border-indigo-950">
              <SparklesIcon className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                AI WORKER PROFILE • FASTAPI SYNTHESIZER
              </span>
              <p className="text-xs text-stone-600">
                ข้อความนี้เรียบเรียงโดย AI จากคำตอบ 5 ขั้นตอนของคุณ โปรดตรวจสอบความถูกต้องก่อนเผยแพร่
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPublished ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-950 border border-emerald-900 font-mono font-bold text-xs flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-emerald-700" />
                เผยแพร่แล้ว (Visible to Families)
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-950 border border-amber-900 font-mono font-bold text-xs">
                ร่างโปรไฟล์ (ยังไม่เผยแพร่)
              </span>
            )}
          </div>
        </div>

        {/* Main Profile Card (Print Cover Style) */}
        <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-indigo-950 pb-6 gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-950 text-white font-mono font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-indigo-950 riso-shadow shrink-0">
                {profile?.display_name.slice(0, 2) || 'ผด'}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                    {profile?.display_name || 'ผู้ดูแล'}
                  </h1>
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
            <Link
              href="/caregiver/onboarding"
              className="min-h-[48px] px-4 py-2.5 bg-white text-indigo-950 border-2 border-indigo-950 font-bold text-xs sm:text-sm hover:bg-stone-50 riso-shadow-sm text-center flex items-center justify-center gap-1.5 riso-btn-active"
            >
              <span>← ย้อนกลับไปแก้ไขคำตอบ</span>
            </Link>

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
        </div>
      </main>

      <Footer />
    </div>
  );
}
