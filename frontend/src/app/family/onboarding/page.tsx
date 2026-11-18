'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { ChevronRightIcon, ChevronLeftIcon, UploadIcon } from '@/components/Icons';
import {
  getCurrentUser,
  getFamilyDraft,
  saveFamilyDraft,
  isUserLoggedIn,
  stripKhunPrefix,
} from '@/services/api';
import { CaregiverGender } from '@/types/database';
import { THAI_PROVINCES, getDistrictsByProvince } from '@/data/thaiLocations';

function FamilyOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';

  // Contact & Location State
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft() as any;
    if (draft?.display_name) return stripKhunPrefix(draft.display_name);
    const cur = getCurrentUser();
    // Do NOT inherit mock/demo family names or previous sessions when registering fresh (unless already logged in or in edit mode)
    const logged = isUserLoggedIn();
    if (!logged && (cur.id === 'fam-1-wanwimon' || cur.id === 'cg-1-wimon')) return '';
    return cur.role === 'family' && cur.display_name && cur.display_name !== 'ครอบครัวใหม่'
      ? stripKhunPrefix(cur.display_name)
      : '';
  });

  const [gender, setGender] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft() as any;
    if (draft?.gender) return draft.gender;
    const cur = getCurrentUser();
    const logged = isUserLoggedIn();
    if (!logged && (cur.id === 'fam-1-wanwimon' || cur.id === 'cg-1-wimon')) return '';
    return cur.gender || '';
  });

  const [age, setAge] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft() as any;
    if (draft?.age) return String(draft.age);
    const cur = getCurrentUser();
    const logged = isUserLoggedIn();
    if (!logged && (cur.id === 'fam-1-wanwimon' || cur.id === 'cg-1-wimon')) return '';
    return typeof cur.age === 'number' && cur.age > 0 ? String(cur.age) : '';
  });

  const [phone, setPhone] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft() as any;
    if (draft?.phone) return draft.phone;
    const cur = getCurrentUser();
    const logged = isUserLoggedIn();
    if (!logged && (cur.id === 'fam-1-wanwimon' || cur.id === 'cg-1-wimon')) return '';
    return cur.role === 'family' && cur.phone
      ? cur.phone
      : '';
  });

  const [lineId, setLineId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft() as any;
    if (draft?.line_id) return draft.line_id;
    const cur = getCurrentUser();
    const logged = isUserLoggedIn();
    if (!logged && (cur.id === 'fam-1-wanwimon' || cur.id === 'cg-1-wimon')) return '';
    return cur.line_id || '';
  });

  const [province, setProvince] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    if (draft?.province) return draft.province;
    return '';
  });

  const [district, setDistrict] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    if (draft?.district) return draft.district;
    return '';
  });

  const [addressText, setAddressText] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft();
    return draft?.address_text || '';
  });

  const [avatarUrl, setAvatarUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    const draft = getFamilyDraft() as any;
    if (draft?.avatar_url) return draft.avatar_url;
    const cur = getCurrentUser();
    const logged = isUserLoggedIn();
    if (!logged && (cur.id === 'fam-1-wanwimon' || cur.id === 'cg-1-wimon')) return '';
    return cur.avatar_url || '';
  });

  // Validation: Required name, valid age, 10-digit phone, province, and district
  const canProceed =
    displayName.trim().length > 0 &&
    Boolean(gender) &&
    age.trim().length > 0 &&
    parseInt(age, 10) > 0 &&
    phone.length === 10 &&
    province.trim().length > 0 &&
    district.trim().length > 0;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return;

    // Save all personal & location info to Family Draft (do NOT overwrite live current user yet until publish)
    const existingDraft = getFamilyDraft() || {};
    saveFamilyDraft({
      ...existingDraft,
      display_name: displayName.trim(),
      phone: phone.trim(),
      line_id: lineId.trim() || undefined,
      province: province.trim(),
      district: district.trim(),
      address_text: addressText.trim(),
      gender,
      age: age.trim() ? parseInt(age, 10) : null,
      avatar_url: avatarUrl ? avatarUrl : '',
    } as any);

    // Navigate to post-job page
    router.push(isEditMode ? '/family/post-job?mode=edit' : '/family/post-job');
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

      <div className="flex-1 bg-[#735095] py-8 px-4">
        <main className="max-w-2xl mx-auto w-full">
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
            {/* Display Name, Gender & Age */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
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

              <div className="md:col-span-3">
                <label className="text-xs font-bold text-indigo-950 mb-1 block">
                  เพศ <span className="text-rose-600">*</span>
                </label>
                <select
                  value={gender}
                  required
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full min-h-[44px] px-3 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                >
                  <option value="" disabled>-- เลือกเพศ --</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="unspecified">ไม่ระบุ</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-bold text-indigo-950 mb-1 block">
                  อายุ (ปี) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  required
                  value={age}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAge(val);
                  }}
                  placeholder="เช่น 45"
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                />
              </div>
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
                <select
                  required
                  value={province}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    setProvince(newProv);
                    setDistrict('');
                  }}
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                >
                  <option value="">-- เลือกจังหวัด --</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-950 mb-1 block">
                  อำเภอ / เขต (แสดงสาธารณะ) <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!province}
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {province ? '-- เลือกอำเภอ / เขต --' : '-- กรุณาเลือกจังหวัดก่อน --'}
                  </option>
                  {getDistrictsByProvince(province).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
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

            {/* Profile Photo Upload (Dashed Dropzone Style) */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-indigo-950 mb-0.5 block">
                  รูปโปรไฟล์ครอบครัว (ไม่บังคับ)
                </label>
                <p className="text-[11px] text-stone-500">
                  แนบรูปถ่ายครอบครัว หรือรูปผู้ว่าจ้าง เพื่อสร้างความอบอุ่นและเป็นกันเองกับผู้ดูแล
                </p>
              </div>

              {!avatarUrl ? (
                <div className="border-2 border-dashed border-indigo-950 p-6 sm:p-8 bg-[#FAF9F6] text-center space-y-3">
                  <div className="w-12 h-12 mx-auto border-2 border-indigo-950 bg-white flex items-center justify-center text-indigo-950 riso-shadow-sm">
                    <UploadIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <label
                      htmlFor="family-avatar-upload"
                      className="inline-block min-h-[44px] px-5 py-2.5 bg-indigo-950 text-white font-bold text-xs cursor-pointer border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065] riso-btn-active leading-loose"
                    >
                      เลือกไฟล์รูปโปรไฟล์
                    </label>
                    <input
                      id="family-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            setAvatarUrl(base64);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <p className="text-[11px] text-stone-500 mt-2">
                      รองรับ JPEG, PNG, WebP (ไม่บังคับ สามารถข้ามได้)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-2 border-indigo-950 p-4 riso-shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl}
                      alt="Profile Preview"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover border-2 border-indigo-950 bg-stone-50 shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-800 block w-fit">
                        ✓ อัปโหลดรูปโปรไฟล์แล้ว
                      </span>
                      <p className="text-xs text-stone-600">รูปภาพนี้จะแสดงบนโปรไฟล์ของครอบครัว</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      htmlFor="family-avatar-change"
                      className="px-3 py-1.5 text-xs font-bold bg-white text-indigo-950 border border-indigo-950 hover:bg-stone-50 cursor-pointer riso-btn-active text-center"
                    >
                      เปลี่ยนรูป
                    </label>
                    <input
                      id="family-avatar-change"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            setAvatarUrl(base64);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 riso-btn-active"
                    >
                      ลบรูป
                    </button>
                  </div>
                </div>
              )}
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
                href={isEditMode ? '/family/profile' : '/register'}
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
      </div>

      <Footer />
    </div>
  );
}

export default function FamilyOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
        <Topbar />
        <div className="flex-1 p-8 text-center font-mono">กำลังโหลด...</div>
        <Footer />
      </div>
    }>
      <FamilyOnboardingForm />
    </Suspense>
  );
}

