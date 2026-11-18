'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  CaseTypeCode,
  WorkArrangement,
  WageUnit,
  CaregiverGenderPreference,
  CASE_TYPES_V3,
} from '@/types/database';
import {
  saveFamilyDraft,
  getFamilyDraft,
  createJobPost,
  detectCasesFromText,
  getFamilyProfileBundle,
  getCurrentUser,
  PostJobPayload,
} from '@/services/api';
import {
  SparklesIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
} from '@/components/Icons';
import { THAI_PROVINCES, getDistrictsByProvince } from '@/data/thaiLocations';

const SAMPLE_TEXTS = [
  {
    title: 'ตัวอย่าง 1: ผู้ป่วยสโตรกติดเตียง (สายยาง + แผลกดทับ)',
    text: 'คุณแม่วัย 78 ปี เป็นสโตรกหลอดเลือดสมอง อ่อนแรงซีกขวา นอนติดเตียง ต้องการคนช่วยพลิกตัวทุก 2 ชั่วโมง ให้อาหารทางสายยาง NG tube 4 มื้อ ล้างแผลกดทับที่สะโพก และช่วยทำกายภาพยืดเหยียดแขนขา มีภาวะเบาหวานต้องเจาะน้ำตาลปลายนิ้วและควบคุมอาหาร อยากได้คนใจเย็น มีประสบการณ์ดูแลผู้ป่วยติดเตียง พักอยู่ประจำกับคุณแม่ได้',
  },
  {
    title: 'ตัวอย่าง 2: ผู้สูงอายุสมองเสื่อม / อัลไซเมอร์ (ไป-กลับ)',
    text: 'คุณพ่ออายุ 82 ปี เป็นอัลไซเมอร์ระยะแรก ความจำเริ่มสับสน ชอบเดินออกจากบ้านถ้าไม่มีคนเฝ้า ร่างกายยังเดินได้แข็งแรง ต้องการผู้ดูแลไป-กลับ 8:00 - 17:00 น. วันจันทร์-ศุกร์ ช่วยดูแลเรื่องยา จัดอาหาร พาเดินออกกำลังกายในหมู่บ้าน และพาไปพบแพทย์ตามนัดที่โรงพยาบาลรามาฯ เดือนละ 1-2 ครั้ง',
  },
  {
    title: 'ตัวอย่าง 3: ฟื้นฟูหลังผ่าตัดข้อสะโพก',
    text: 'คุณยายวัย 85 ปี เพิ่งผ่าตัดเปลี่ยนข้อสะโพกกลับมาพักฟื้นที่บ้าน ต้องการคนช่วยพยุงลุกนั่ง ทำแผลผ่าตัดปลอดเชื้อ และทำกายภาพบำบัดฝึกก้าวเดินระวังหกล้ม รับงานไป-กลับช่วงกลางวัน',
  },
];

// Helper to get initial data from draft or fallback to existing family job post
function getInitialFamilyJobData(): Partial<PostJobPayload> | null {
  if (typeof window === 'undefined') return null;
  const draft = getFamilyDraft();
  if (draft && draft.patient_description) return draft;

  const cur = getCurrentUser();
  // Do NOT prefill mock job data if creating fresh account
  if (cur.id !== 'fam-1-wanwimon') {
    return null;
  }

  const familyId = 'fam-1-wanwimon';
  const bundle = getFamilyProfileBundle(familyId);
  const activeJob = bundle.jobPost || getFamilyProfileBundle('fam-1-wanwimon').jobPost;

  if (activeJob) {
    const loc = bundle.location || getFamilyProfileBundle('fam-1-wanwimon').location;
    const needs = bundle.caseNeeds?.length ? bundle.caseNeeds : getFamilyProfileBundle('fam-1-wanwimon').caseNeeds;
    return {
      patient_description: activeJob.patient_description || '',
      work_arrangement: activeJob.work_arrangement || 'live_in',
      province: activeJob.province || '',
      district: activeJob.district || '',
      address_text: loc?.address_text || '',
      preferred_caregiver_gender: activeJob.preferred_caregiver_gender || 'female',
      expected_wage: activeJob.expected_wage ?? 25000,
      wage_unit: activeJob.wage_unit || 'month',
      start_date: activeJob.start_date || '',
      cases: (needs || []).map((c) => ({ case_type: c.case_type, is_required: c.is_required })),
      status: activeJob.status === 'open' ? 'open' : 'draft',
    };
  }
  return null;
}

export default function FamilyPostJobPage() {
  const router = useRouter();

  // Natural Language Input
  const [patientDescription, setPatientDescription] = useState(() => {
    return getInitialFamilyJobData()?.patient_description || '';
  });
  const [detectedCases, setDetectedCases] = useState<CaseTypeCode[]>(() => {
    const init = getInitialFamilyJobData();
    if (init?.cases && init.cases.length > 0) {
      return init.cases.map((c) => c.case_type);
    }
    return [];
  });
  // Manual additions / removals so debouncer doesn't overwrite manual edits
  const [manualAdditions, setManualAdditions] = useState<CaseTypeCode[]>(() => {
    const init = getInitialFamilyJobData();
    if (init?.cases && init.cases.length > 0) {
      return init.cases.map((c) => c.case_type);
    }
    return [];
  });
  const [manualRemovals, setManualRemovals] = useState<CaseTypeCode[]>([]);
  const [requiredMap, setRequiredMap] = useState<Record<CaseTypeCode, boolean>>(() => {
    const baseMap: Record<CaseTypeCode, boolean> = {
      bedridden: true,
      tube_feeding: true,
      dementia: true,
      stroke: true,
      post_surgery: true,
      wound_care: true,
      hospital_escort: true,
      general_elderly: true,
      tracheostomy_suction: true,
      physical_therapy: false,
      diabetes_insulin: true,
      palliative_care: true,
    };
    const init = getInitialFamilyJobData();
    if (init?.cases) {
      init.cases.forEach((c) => {
        baseMap[c.case_type] = c.is_required;
      });
    }
    return baseMap;
  });

  // Settings
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>(() => {
    return getInitialFamilyJobData()?.work_arrangement || 'live_in';
  });
  const [preferredGender, setPreferredGender] = useState<CaregiverGenderPreference>(() => {
    return getInitialFamilyJobData()?.preferred_caregiver_gender || 'female';
  });
  const [province, setProvince] = useState(() => {
    return getInitialFamilyJobData()?.province || '';
  });
  const [district, setDistrict] = useState(() => {
    return getInitialFamilyJobData()?.district || '';
  });
  const [addressText, setAddressText] = useState(() => {
    return getInitialFamilyJobData()?.address_text || '';
  });
  const [expectedWage, setExpectedWage] = useState<number | ''>(() => {
    const w = getInitialFamilyJobData()?.expected_wage;
    return typeof w === 'number' ? w : 25000;
  });
  const [wageUnit, setWageUnit] = useState<WageUnit>(() => {
    return getInitialFamilyJobData()?.wage_unit || 'month';
  });
  const [startDate, setStartDate] = useState(() => {
    return getInitialFamilyJobData()?.start_date || '';
  });
  const [autoSaveToast, setAutoSaveToast] = useState(false);

  // Debounce ref for 250ms keyword extraction
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Combined Active Cases (Auto + Manual Additions - Manual Removals)
  const getActiveCases = useCallback((): CaseTypeCode[] => {
    const set = new Set<CaseTypeCode>();
    detectedCases.forEach((c) => {
      if (!manualRemovals.includes(c)) set.add(c);
    });
    manualAdditions.forEach((c) => set.add(c));
    return Array.from(set);
  }, [detectedCases, manualRemovals, manualAdditions]);

  // 250ms Debounced Keyword Detector
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const auto = detectCasesFromText(patientDescription);
      setDetectedCases(auto);

      // Auto-save draft
      const active = Array.from(
        new Set([
          ...auto.filter((c) => !manualRemovals.includes(c)),
          ...manualAdditions,
        ])
      );

      const existingDraft = getFamilyDraft() || {};
      saveFamilyDraft({
        ...existingDraft,
        patient_description: patientDescription,
        work_arrangement: workArrangement,
        province,
        district,
        address_text: addressText,
        preferred_caregiver_gender: preferredGender,
        expected_wage: expectedWage === '' ? null : Number(expectedWage),
        wage_unit: wageUnit,
        start_date: startDate || null,
        cases: active.map((c) => ({
          case_type: c,
          is_required: requiredMap[c] ?? true,
        })),
        status: 'draft',
      });
      setAutoSaveToast(true);
      setTimeout(() => setAutoSaveToast(false), 1200);
    }, 250);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [
    patientDescription,
    workArrangement,
    province,
    district,
    addressText,
    expectedWage,
    wageUnit,
    preferredGender,
    startDate,
    requiredMap,
    manualRemovals,
    manualAdditions,
  ]);

  const handleToggleCaseChip = (code: CaseTypeCode) => {
    const active = getActiveCases();
    if (active.includes(code)) {
      // Remove
      setManualRemovals([...manualRemovals, code]);
      setManualAdditions(manualAdditions.filter((c) => c !== code));
    } else {
      // Add
      setManualAdditions([...manualAdditions, code]);
      setManualRemovals(manualRemovals.filter((c) => c !== code));
    }
  };

  const toggleRequired = (code: CaseTypeCode, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequiredMap({
      ...requiredMap,
      [code]: !requiredMap[code],
    });
  };

  const handleLoadSample = (sample: string) => {
    setPatientDescription(sample);
    setManualAdditions([]);
    setManualRemovals([]);
  };

  const handleSubmit = (status: 'draft' | 'open') => {
    if (!patientDescription.trim()) {
      alert('กรุณากรอกอาการและความต้องการของผู้ป่วย');
      return;
    }

    const active = getActiveCases();
    if (active.length === 0) {
      alert('กรุณาเลือกเคสการดูแลที่ต้องการอย่างน้อย 1 รายการ');
      return;
    }

    const draft = getFamilyDraft() as any;
    const payload: PostJobPayload = {
      patient_description: patientDescription,
      work_arrangement: workArrangement,
      province,
      district,
      address_text: addressText,
      preferred_caregiver_gender: preferredGender,
      expected_wage: expectedWage === '' ? null : Number(expectedWage),
      wage_unit: wageUnit,
      start_date: startDate || null,
      cases: active.map((c) => ({
        case_type: c,
        is_required: requiredMap[c] ?? true,
      })),
      status,
      display_name: draft?.display_name,
      phone: draft?.phone,
      line_id: draft?.line_id,
      gender: draft?.gender,
      age: draft?.age,
      avatar_url: draft?.avatar_url,
    };

    const { jobId } = createJobPost(payload);
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'edit') {
      router.push('/family/profile');
    } else {
      router.push(`/family/applicants?jobId=${jobId}`);
    }
  };

  const activeCasesList = getActiveCases();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <div className="flex-1 bg-[#735095] py-8 px-4">
        <main className="max-w-4xl mx-auto w-full space-y-6">
          <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-indigo-950 pb-5 gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
                FAMILY JOB CREATION • DEBOUNCED NLP EXTRACTOR
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                โพสต์ประกาศหาผู้ดูแล
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                เล่าอาการคนป่วยด้วยภาษาพูดตามสบาย ระบบจะตรวจจับเคสและจับคู่ผู้ดูแลที่เหมาะสมที่สุดให้
              </p>
            </div>

            {autoSaveToast && (
              <span className="text-xs font-mono text-emerald-700 font-bold px-2 py-1 bg-emerald-50 border border-emerald-900 animate-pulse shrink-0">
                ✓ บันทึกร่างอัตโนมัติ
              </span>
            )}
          </div>

          {/* Sample Text Loaders */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-stone-500 uppercase block">
              หรือกดเลือกข้อความตัวอย่างเพื่อทดลองระบบ:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TEXTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadSample(sample.text)}
                  className="min-h-[38px] px-3 py-1.5 bg-[#FAF9F6] hover:bg-stone-100 border border-indigo-950 text-xs font-bold text-indigo-950 riso-shadow-sm riso-btn-active"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Large Conversational Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
              <span>อาการและสิ่งที่ต้องการให้ช่วยดูแล (ภาษาพูด) <span className="text-rose-600">*</span></span>
              <span className="text-[11px] font-mono text-stone-500">
                ตรวจจับคีย์เวิร์ดอัตโนมัติ (250ms debounce)
              </span>
            </label>
            <textarea
              rows={6}
              required
              value={patientDescription}
              onChange={(e) => setPatientDescription(e.target.value)}
              placeholder="พิมพ์เล่าอาการ เช่น คุณแม่เป็นสโตรก นอนติดเตียง ช่วยพลิกตัวและฟีดอาหารทางสายยาง NG tube ล้างแผลกดทับ และช่วยทำกายภาพ..."
              className="w-full p-4 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] leading-relaxed"
            />
          </div>

          {/* Live Detected Case Needs Chips */}
          <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-[#D946EF]" />
                เคสที่ตรวจพบ ({activeCasesList.length} เคส)
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                แตะเพื่อเพิ่ม/ลบ • สลับ &ldquo;จำเป็น/ไม่จำเป็น&rdquo; ได้
              </span>
            </div>

            {/* Active Chips */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CASE_TYPES_V3) as CaseTypeCode[]).map((code) => {
                const item = CASE_TYPES_V3[code];
                const isActive = activeCasesList.includes(code);
                const isReq = requiredMap[code] ?? true;

                return (
                  <div
                    key={code}
                    onClick={() => handleToggleCaseChip(code)}
                    className={`min-h-[44px] px-3 py-1.5 text-xs font-bold border-2 border-indigo-950 flex items-center gap-2 cursor-pointer select-none transition-all riso-btn-active ${
                      isActive
                        ? 'bg-[#1E1B4B] text-white riso-shadow-sm'
                        : 'bg-white text-stone-500 opacity-60 hover:opacity-100 hover:bg-stone-50'
                    }`}
                  >
                    <span>{item.short_label_th}</span>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={(e) => toggleRequired(code, e)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold border ${
                          isReq
                            ? 'bg-[#D946EF] text-white border-white'
                            : 'bg-stone-200 text-stone-700 border-stone-400'
                        }`}
                      >
                        {isReq ? 'จำเป็น' : 'ทางเลือก'}
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Work Arrangement */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 block">
                รูปแบบการทำงาน (work_arrangement)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWorkArrangement('live_in')}
                  className={`min-h-[44px] text-xs font-bold border-2 border-indigo-950 ${
                    workArrangement === 'live_in'
                      ? 'bg-indigo-950 text-white riso-shadow-sm'
                      : 'bg-white text-indigo-950 hover:bg-stone-50'
                  }`}
                >
                  อยู่ประจำ (Live-in)
                </button>
                <button
                  type="button"
                  onClick={() => setWorkArrangement('daily')}
                  className={`min-h-[44px] text-xs font-bold border-2 border-indigo-950 ${
                    workArrangement === 'daily'
                      ? 'bg-indigo-950 text-white riso-shadow-sm'
                      : 'bg-white text-indigo-950 hover:bg-stone-50'
                  }`}
                >
                  ไป-กลับ (Daily)
                </button>
              </div>
            </div>

            {/* Gender Preference */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 block">
                เพศผู้ดูแลที่ต้องการ
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'female', label: 'ผู้หญิง' },
                  { value: 'male', label: 'ผู้ชาย' },
                  { value: 'any', label: 'ไม่จำกัด' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setPreferredGender(g.value as CaregiverGenderPreference)}
                    className={`min-h-[44px] text-xs font-bold border-2 border-indigo-950 ${
                      preferredGender === g.value
                        ? 'bg-indigo-950 text-white riso-shadow-sm'
                        : 'bg-white text-indigo-950 hover:bg-stone-50'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Public Location */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 block">จังหวัด</label>
              <select
                value={province}
                onChange={(e) => {
                  const newProv = e.target.value;
                  setProvince(newProv);
                  setDistrict('');
                }}
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none"
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
              <label className="text-xs font-bold text-indigo-950 mb-1 block">อำเภอ / เขต</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!province}
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
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

            {/* Budget & Wage Unit */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 flex items-center justify-between">
                <span>งบประมาณที่ตั้งไว้ (บาท)</span>
                <span className="font-mono text-[11px] text-stone-500">
                  {wageUnit === 'month' ? 'ต่อเดือน' : wageUnit === 'day' ? 'ต่อวัน' : 'ต่อชม.'}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={expectedWage}
                  onChange={(e) =>
                    setExpectedWage(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="25000"
                  className="w-full min-h-[44px] px-3.5 text-sm font-mono bg-white border-2 border-indigo-950 focus:outline-none"
                />
                <select
                  value={wageUnit}
                  onChange={(e) => setWageUnit(e.target.value as WageUnit)}
                  className="min-h-[44px] px-2 text-xs font-mono font-bold bg-white border-2 border-indigo-950"
                >
                  <option value="month">/เดือน</option>
                  <option value="day">/วัน</option>
                  <option value="hour">/ชม.</option>
                </select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs font-bold text-indigo-950 mb-1 block">วันที่ต้องการให้เริ่มงาน</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 text-sm font-mono bg-white border-2 border-indigo-950 focus:outline-none"
              />
            </div>
          </div>

          {/* Private Exact Address (Owner-Only) */}
          <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-indigo-950" />
              <label className="text-xs font-bold text-indigo-950">
                ที่อยู่และซอยบ้านอย่างละเอียด (job_post_locations - ข้อมูลส่วนบุคคล)
              </label>
            </div>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="เช่น บ้านเลขที่ 12/34 ซอยลาดพร้าว 71 ถนนลาดพร้าว (เก็บเป็นความลับ)"
              className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none"
            />
            <p className="text-[11px] text-stone-500 font-mono">
              🔒 RLS Policy: ข้อมูลที่อยู่นี้จะไม่มีผู้ดูแลคนใดมองเห็น ระบบใช้พิกัดเพื่อคำนวณระยะทาง (distance_km) เท่านั้น
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t-2 border-indigo-950 pt-6">
            <button
              type="button"
              onClick={() => handleSubmit('open')}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-[#1E1B4B] text-white font-black text-sm border-2 border-indigo-950 riso-shadow-lg hover:bg-[#2E1065] flex items-center justify-center gap-2 riso-btn-active"
            >
              <span>โพสต์ประกาศและค้นหาผู้สมัครทันที</span>
              <ChevronRightIcon className="w-5 h-5 text-[#D946EF]" />
            </button>
          </div>
        </div>
      </main>
      </div>

      <Footer />
    </div>
  );
}
