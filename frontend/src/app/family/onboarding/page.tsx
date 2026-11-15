'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { ChevronRightIcon, ChevronLeftIcon } from '@/components/Icons';
import {
  getCurrentUser,
  setCurrentUser,
  getFamilyDraft,
  saveFamilyDraft,
} from '@/services/api';

export default function FamilyOnboardingPage() {
  const router = useRouter();

  // Contact & Location State
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    if (draft?.patient_description) {
      // check if user has custom name
    }
    const cur = getCurrentUser();
    return cur.role === 'family' && cur.display_name && cur.display_name !== 'ครอบครัววรรณวิมล' && cur.display_name !== 'ครอบครัวใหม่'
      ? cur.display_name
      : '';
  });

  const [phone, setPhone] = useState(() => {
    if (typeof window === 'undefined') return '';
    const cur = getCurrentUser();
    return cur.role === 'family' && cur.phone && cur.phone !== '082-999-1122' && cur.phone !== '081-000-0000'
      ? cur.phone
      : '';
  });

  const [lineId, setLineId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const cur = getCurrentUser();
    return cur.line_id || '';
  });

  const [province, setProvince] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    return draft?.province && draft.province !== 'กรุงเทพมหานคร' ? draft.province : '';
  });

  const [district, setDistrict] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    return draft?.district && draft.district !== 'ลาดพร้าว' ? draft.district : '';
  });

  const [addressText, setAddressText] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    return draft?.address_text || '';
  });

  // Validation: Required name, 10-digit phone, province, and district
  const canProceed =
    displayName.trim().length > 0 &&
    phone.length === 10 &&
    province.trim().length > 0 &&
    district.trim().length > 0;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return;

    // 1. Update or create Family User Session
    const cur = getCurrentUser();
    const familyId = cur.role === 'family' && cur.id ? cur.id : `fam-${Date.now()}`;
    setCurrentUser({
      id: familyId,
      role: 'family',
      display_name: displayName.trim(),
      phone: phone.trim(),
      line_id: lineId.trim() || null,
    });

    // 2. Save location to Family Draft so post-job can prefill it
    const existingDraft = getFamilyDraft() || {};
    saveFamilyDraft({
      ...existingDraft,
      province: province.trim(),
      district: district.trim(),
      address_text: addressText.trim(),
    });

    // 3. Navigate to post-job page
    router.push('/family/post-job');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      {/* Progress Track */}
      <div className="bg-white border-b-2 border-indigo-950 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs font-mono font-bold">
          <span className="px-2 py-0.5 bg-[#1E1B4B] text-white">
            STEP 1/2 ข้อมูลส่วนตัวครอบครัว & สถานที่ดูแล
          </span>
          <span className="text-stone-500">ขั้นตอนที่ 1 จาก 2</span>
        </div>
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-2 mt-2">
          <div className="h-1.5 bg-[#1E1B4B] border border-indigo-950" />
          <div className="h-1.5 bg-stone-200 border border-indigo-950" />
        </div>
      </div>

      <main className="flex-1 px-4 py-8 md:py-12 max-w-2xl mx-auto w-full">
        <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">
          {/* Header */}
          <div className="border-b-2 border-indigo-950 pb-4">
            <h1 className="text-xl sm:text-2xl font-black text-indigo-950">
              ข้อมูลส่วนตัวและสถานที่ดูแลผู้ป่วย
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              ผู้ดูแลจะเห็นเฉพาะชื่อ จังหวัด และเขต ส่วนเบอร์โทรและพิกัดบ้านจะถูกซ่อนไว้จนกว่าจะ Match
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 block">
                ชื่อ-นามสกุล หรือชื่อเรียกครอบครัวที่สะดวก <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="เช่น คุณวรรณวิมล หรือ ครอบครัวชื่นใจ"
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
              />
            </div>

            {/* Phone & LINE ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-indigo-950 mb-1 flex items-center justify-between">
                  <span>
                    เบอร์โทรศัพท์ <span className="text-rose-600">*</span>
                  </span>
                  <span
                    className={`text-[11px] font-mono ${
                      phone.length === 10 ? 'text-emerald-700 font-bold' : 'text-stone-500'
                    }`}
                  >
                    {phone.length}/10 หลัก
                  </span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => {
                    // Allow only digits (0-9) and max 10 characters
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(digitsOnly);
                  }}
                  placeholder="เช่น 0812345678"
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 font-mono placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                />
                {phone.length > 0 && phone.length < 10 ? (
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    กรุณากรอกตัวเลขให้ครบ 10 หลัก (ปัจจุบัน {phone.length} หลัก)
                  </p>
                ) : (
                  <span className="text-[10px] text-stone-500 font-mono block mt-1">
                    🔒 ปลอดภัย: เปิดเผยเฉพาะคู่ที่ Match แล้ว (กรอกเฉพาะตัวเลข 10 หลัก)
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-950 mb-1 block">LINE ID (ถ้ามี)</label>
                <input
                  type="text"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  placeholder="เช่น mylineid123 (ถ้ามี)"
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                />
              </div>
            </div>

            {/* Public Location: Province & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-indigo-950 mb-1 block">
                  จังหวัดที่พักอาศัย / สถานที่ดูแล (แสดงสาธารณะ) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="เช่น กรุงเทพมหานคร หรือ นนทบุรี"
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-950 mb-1 block">
                  อำเภอ / เขต (แสดงสาธารณะ) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="เช่น จตุจักร หรือ บางนา"
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                />
              </div>
            </div>

            {/* Private Address: House / Alley */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 block">
                ที่อยู่บ้านหรือซอยที่พักอาศัย (เก็บเป็นความลับ)
              </label>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="เช่น ซอยพหลโยธิน 34 (ใช้คำนวณระยะทางเท่านั้น บุคคลอื่นไม่เห็น)"
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
              />
            </div>

            {/* Privacy Notice Box */}
            <div className="p-3 bg-amber-50 border border-amber-900/30 text-xs text-amber-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 font-mono">
                🔒 ข้อกำหนดความปลอดภัยพิกัดบ้าน :
              </span>
              <p className="text-[11px] leading-relaxed">
                พิกัดละติจูด/ลองจิจูดของคุณจะถูกจัดเก็บใน <code>job_locations</code> และนำไปใช้คำนวณระยะทางแบบลับเท่านั้น บุคคลอื่นจะไม่สามารถเห็นที่อยู่จริงได้จนกว่าจะเกิดการจับคู่ตรงกัน (Mutual Match)
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 border-t-2 border-indigo-950 flex items-center justify-between gap-4">
              <Link
                href="/register"
                className="min-h-[44px] px-5 py-2.5 text-xs font-bold bg-white text-indigo-950 border-2 border-indigo-950 riso-shadow-sm hover:bg-stone-50 flex items-center gap-1.5 riso-btn-active"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </Link>

              <button
                type="submit"
                disabled={!canProceed}
                className={`min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-black border-2 border-indigo-950 flex items-center gap-2 transition-all riso-btn-active ${
                  canProceed
                    ? 'bg-indigo-950 text-white riso-shadow hover:bg-[#2E1065] cursor-pointer'
                    : 'bg-stone-200 text-stone-400 border-stone-300 cursor-not-allowed'
                }`}
              >
                <span>ถัดไป: ไปหน้าโพสต์งาน</span>
                <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

