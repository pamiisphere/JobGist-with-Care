'use client';

import { fileToSmallDataUrl } from '@/lib/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  CaseTypeCode,
  ComfortLevel,
  CareRole,
  WorkArrangement,
  WageUnit,
  CASE_TYPES_V3,
  CASE_CATEGORY_LABEL_TH,
  CaseType,
  CARE_ROLES_META,
  COMFORT_LEVEL_META,
} from '@/types/database';
import {
  saveCaregiverDraft,
  getCaregiverDraft,
  submitCaregiverOnboarding,
  generateAIWorkerProfile,
  getCurrentUser,
  getCaregiverProfileBundle,
  CaregiverOnboardingPayload,
  getNameInitial,
  stripKhunPrefix,
  markTaskStart,
} from '@/services/api';
import { CaregiverGender } from '@/types/database';
import CustomTagInput from '@/components/CustomTagInput';
import {
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  UploadIcon,
  CloseIcon,
} from '@/components/Icons';
import { THAI_PROVINCES, getDistrictsByProvince } from '@/data/thaiLocations';

// Helper to get initial caregiver data from draft or fallback to existing active bundle
function getInitialCaregiverData(): Partial<CaregiverOnboardingPayload> | null {
  if (typeof window === 'undefined') return null;
  const draft = getCaregiverDraft();
  if (draft && (draft.phone || draft.home_province || draft.skills?.length)) {
    return draft;
  }

  const cur = getCurrentUser();
  // Do NOT inherit demo/mock caregiver data when creating a fresh account
  if (cur.id !== 'cg-1-wimon') {
    return null;
  }

  const bundle = getCaregiverProfileBundle('cg-1-wimon');
  const activeBundle = bundle?.detail ? bundle : null;

  if (activeBundle && activeBundle.detail) {
    const { detail: d, profile: p, contact: c, skills: s, certificates: certs } = activeBundle;
    return {
      display_name: stripKhunPrefix(p?.display_name || cur.display_name || ''),
      phone: (c?.phone || '').replace(/\D/g, ''),
      line_id: c?.line_id || '',
      avatar_url: p?.avatar_url || d.avatar_url || cur.avatar_url || null,
      gender: d.gender || p?.gender || cur.gender || 'unspecified',
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
      custom_tags: (d.extra_answers?.custom_tags as string[] | undefined) || [],
    };
  }
  return null;
}

export default function CaregiverOnboardingPage() {
  const router = useRouter();
  useEffect(() => { markTaskStart('onboarding_form'); }, []);

  // Step state: 1 to 5
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoSaveToast, setAutoSaveToast] = useState(false);

  // Step 1: Contact & Location
  const [displayName, setDisplayName] = useState(() => {
    return stripKhunPrefix(getInitialCaregiverData()?.display_name || '');
  });
  const [phone, setPhone] = useState(() => {
    return (getInitialCaregiverData()?.phone || '').replace(/\D/g, '').slice(0, 10);
  });
  const [lineId, setLineId] = useState(() => {
    return getInitialCaregiverData()?.line_id || '';
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return getInitialCaregiverData()?.avatar_url || '';
  });
  const [gender, setGender] = useState<string>(() => {
    const g = getInitialCaregiverData()?.gender;
    if (g === 'male' || g === 'female' || g === 'unspecified') return g;
    return '';
  });
  const [age, setAge] = useState<string>(() => {
    const a = getInitialCaregiverData()?.age;
    return typeof a === 'number' && a > 0 ? String(a) : '';
  });
  const [homeProvince, setHomeProvince] = useState(() => {
    return getInitialCaregiverData()?.home_province || '';
  });
  const [homeDistrict, setHomeDistrict] = useState(() => {
    return getInitialCaregiverData()?.home_district || '';
  });
  const [addressText, setAddressText] = useState(() => {
    return getInitialCaregiverData()?.address_text || '';
  });
  const [maxTravelKm, setMaxTravelKm] = useState(() => {
    return getInitialCaregiverData()?.max_travel_km || 20;
  });

  // Step 2: Roles, Experience & Wages
  const [careRoles, setCareRoles] = useState<CareRole[]>(() => {
    return getInitialCaregiverData()?.care_roles || ['caregiver'];
  });
  const [yearsExperience, setYearsExperience] = useState(() => {
    const y = getInitialCaregiverData()?.years_experience;
    return typeof y === 'number' ? y : 3;
  });
  const [expectedWageMin, setExpectedWageMin] = useState(() => {
    return getInitialCaregiverData()?.expected_wage_min || 20000;
  });
  const [expectedWageMax, setExpectedWageMax] = useState(() => {
    return getInitialCaregiverData()?.expected_wage_max || 25000;
  });
  const [wageUnit, setWageUnit] = useState<WageUnit>(() => {
    return getInitialCaregiverData()?.wage_unit || 'month';
  });

  // Step 3: 12-Case Matrix & Work Arrangements
  const [workArrangements, setWorkArrangements] = useState<WorkArrangement[]>(() => {
    return getInitialCaregiverData()?.work_arrangements || ['daily'];
  });
  const [caseSkills, setCaseSkills] = useState<Record<CaseTypeCode, ComfortLevel>>(() => {
    const defaultSkills: Record<CaseTypeCode, ComfortLevel> = {
      bedridden: 'experienced',
      tube_feeding: 'willing_to_learn',
      dementia: 'experienced',
      stroke: 'trained',
      post_surgery: 'willing_to_learn',
      wound_care: 'trained',
      hospital_escort: 'experienced',
      general_elderly: 'experienced',
      tracheostomy_suction: 'not_comfortable',
      physical_therapy: 'trained',
      diabetes_insulin: 'trained',
      palliative_care: 'willing_to_learn',
      // tags added Nov 2026 start as "not comfortable" so nobody is over-claimed
      parkinson: 'not_comfortable',
      oxygen: 'not_comfortable',
      urinary_catheter: 'not_comfortable',
      medication: 'not_comfortable',
      mobility_assist: 'not_comfortable',
      fall_risk: 'not_comfortable',
      bathing_toileting: 'not_comfortable',
      night_watch: 'not_comfortable',
      meal_prep: 'not_comfortable',
      light_housework: 'not_comfortable',
    };
    const init = getInitialCaregiverData();
    if (init?.skills?.length) {
      init.skills.forEach((s) => {
        defaultSkills[s.case_type] = s.comfort_level;
      });
    }
    return defaultSkills;
  });

  // Step 4: Certificates
  const [certificates, setCertificates] = useState<
    { file_name: string; cert_type: string; preview_url: string }[]
  >(() => {
    return getInitialCaregiverData()?.certificates || [];
  });
  const [noCertificates, setNoCertificates] = useState(() => {
    return getInitialCaregiverData()?.no_certificates || false;
  });

  const [customTags, setCustomTags] = useState<string[]>(() => getInitialCaregiverData()?.custom_tags || []);

  // Auto-save draft on changes
  const triggerAutoSave = () => {
    const skillsArray = (Object.keys(caseSkills) as CaseTypeCode[]).map((code) => ({
      case_type: code,
      comfort_level: caseSkills[code],
    }));

    saveCaregiverDraft({
      display_name: displayName,
      phone,
      line_id: lineId,
      avatar_url: avatarUrl,
      gender: (gender || 'unspecified') as CaregiverGender,
      age: age.trim() ? parseInt(age, 10) : null,
      home_province: homeProvince,
      home_district: homeDistrict,
      address_text: addressText,
      max_travel_km: maxTravelKm,
      care_roles: careRoles,
      years_experience: yearsExperience,
      expected_wage_min: expectedWageMin,
      expected_wage_max: expectedWageMax,
      wage_unit: wageUnit,
      work_arrangements: workArrangements,
      skills: skillsArray,
      custom_tags: customTags,
      certificates,
      no_certificates: noCertificates,
    });

    setAutoSaveToast(true);
    setTimeout(() => setAutoSaveToast(false), 1500);
  };

  // Step 2 role toggle
  const toggleCareRole = (role: CareRole) => {
    if (careRoles.includes(role)) {
      if (careRoles.length > 1) {
        setCareRoles(careRoles.filter((r) => r !== role));
      }
    } else {
      setCareRoles([...careRoles, role]);
    }
  };

  // Step 3 arrangement single selection (เลือกอย่างใดอย่างหนึ่ง: ไป-กลับ หรือ อยู่ประจำ)
  const setArrangement = (arr: WorkArrangement) => {
    setWorkArrangements([arr]);
  };

  // Step 3 comfort level cycle
  const cycleComfortLevel = (code: CaseTypeCode) => {
    const order: ComfortLevel[] = [
      'experienced',
      'trained',
      'willing_to_learn',
      'not_comfortable',
    ];
    const current = caseSkills[code] || 'willing_to_learn';
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    setCaseSkills({
      ...caseSkills,
      [code]: order[nextIndex],
    });
  };

  // Step 4 Image compression helper (≤520px, JPEG 0.72)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (certificates.length + files.length > 3) {
      alert('สามารถแนบใบรับรองได้สูงสุด 3 รูปเท่านั้น');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressedDataUrl = await compressImage(file);
      setCertificates((prev) => [
        ...prev,
        {
          file_name: file.name,
          cert_type: 'ใบประกาศนียบัตร / การอบรม',
          preview_url: compressedDataUrl,
        },
      ]);
    }
    setNoCertificates(false);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 520;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeCertificate = (index: number) => {
    setCertificates(certificates.filter((_, i) => i !== index));
  };

  // Validation
  const canGoNext = () => {
    if (step === 1) {
      return (
        displayName.trim().length > 0 &&
        Boolean(gender) &&
        age.trim().length > 0 &&
        parseInt(age, 10) > 0 &&
        phone.length === 10 &&
        homeProvince.trim().length > 0 &&
        homeDistrict.trim().length > 0
      );
    }
    if (step === 2) {
      return careRoles.length > 0;
    }
    if (step === 3) {
      // Must have at least 1 qualified skill (experienced or trained)
      const qualified = Object.values(caseSkills).some(
        (c) => c === 'experienced' || c === 'trained'
      );
      return qualified && workArrangements.length > 0;
    }
    return true;
  };

  const handleNextStep = () => {
    triggerAutoSave();
    if (step < 5) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    triggerAutoSave();
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 1) {
      router.push('/register');
    }
  };

  // Step 5: Final Submission & AI Profile Generation
  const handleFinalSubmit = async () => {
    setIsGenerating(true);

    const skillsArray = (Object.keys(caseSkills) as CaseTypeCode[]).map((code) => ({
      case_type: code,
      comfort_level: caseSkills[code],
    }));

    const payload: CaregiverOnboardingPayload = {
      display_name: displayName,
      phone,
      line_id: lineId,
      avatar_url: avatarUrl,
      gender: (gender || 'unspecified') as CaregiverGender,
      age: age.trim() ? parseInt(age, 10) : null,
      home_province: homeProvince,
      home_district: homeDistrict,
      address_text: addressText,
      max_travel_km: maxTravelKm,
      care_roles: careRoles,
      years_experience: yearsExperience,
      expected_wage_min: expectedWageMin,
      expected_wage_max: expectedWageMax,
      wage_unit: wageUnit,
      work_arrangements: workArrangements,
      skills: skillsArray,
      custom_tags: customTags,
      certificates,
      no_certificates: noCertificates,
    };

    const { caregiverId } = submitCaregiverOnboarding(payload);
    await generateAIWorkerProfile(caregiverId, payload);

    setIsGenerating(false);
    router.push('/caregiver/profile');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      {/* Tactile Step Counter Progress Bar */}
      <section className="bg-white border-b-2 border-indigo-950 px-4 py-3 sticky top-[57px] z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black px-2 py-0.5 bg-[#D946EF] text-white">
              STEP {step}/5
            </span>
            <span className="text-xs sm:text-sm font-bold text-indigo-950">
              {step === 1 && 'ข้อมูลส่วนตัว & พื้นที่'}
              {step === 2 && 'บทบาท ประสบการณ์ & ค่าจ้าง'}
              {step === 3 && 'ความถนัด 12 เคส & รูปแบบงาน'}
              {step === 4 && 'แนบรูปใบรับรอง (Certificates)'}
              {step === 5 && 'ทบทวนคำตอบ & สรุปด้วย AI'}
            </span>
          </div>

          {autoSaveToast && (
            <span className="text-sm font-mono text-emerald-700 font-bold animate-pulse">
              ✓ บันทึกร่างแล้ว
            </span>
          )}
        </div>

        {/* Physical segmented stepper bar */}
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1.5 mt-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 border border-indigo-950 transition-all ${s <= step ? 'bg-[#D946EF]' : 'bg-stone-200'
                }`}
            />
          ))}
        </div>
      </section>

      {/* Main Form Content */}
      <div className="flex-1 bg-[#735095] py-8 px-4">
        <main className="max-w-3xl mx-auto w-full">
          {/* Full-Screen Tactile Loading State during AI profile generation */}
          {isGenerating ? (
            <div className="bg-white border-2 border-indigo-950 p-8 riso-shadow-xl text-center space-y-6 my-12">
              <div className="w-16 h-16 mx-auto bg-[#D946EF] text-white flex items-center justify-center border-2 border-indigo-950 riso-shadow animate-bounce">
                <SparklesIcon className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-indigo-950">กำลังสร้างโปรไฟล์ด้วย AI...</h2>
                <p className="text-sm text-stone-600 max-w-md mx-auto">
                  ระบบกำลังวิเคราะห์ทักษะและประสบการณ์ 12 เคสของคุณ เพื่อเรียบเรียงเป็นข้อความแนะนำตัวภาษาไทยที่เป็นทางการและน่าเชื่อถือ
                </p>
              </div>
              <div className="inline-block px-4 py-1.5 bg-[#FAF9F6] border border-indigo-950 font-mono text-xs text-stone-500">
                FASTAPI ENGINE • LLM PROMPT V3.2
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">
        {/* STEP 1: Basic Info & Private Location */}
        {step === 1 && (
              <div className="space-y-5">
                <div className="border-b-2 border-indigo-950 pb-3">
                  <h2 className="text-xl sm:text-2xl font-black text-indigo-950">
                    ขั้นที่ 1: ข้อมูลส่วนตัวและพื้นที่ทำงาน
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600">
                    ครอบครัวจะเห็นเฉพาะชื่อ จังหวัด และเขต ส่วนเบอร์โทรและพิกัดบ้านจะถูกซ่อนไว้จนกว่าจะ Match
                  </p>
                </div>

                {/* Display Name, Gender & Age Dropdown/Input */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-6">
                    <label className="text-xs font-bold text-indigo-950 mb-1 block">
                      ชื่อ-นามสกุล หรือชื่อเรียกที่สะดวก <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="เช่น พี่วิมล ใจดี หรือ สมศรี ชัยชนะ"
                      className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
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
                      placeholder="เช่น 35"
                      className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-indigo-950 mb-1 flex items-center justify-between">
                        <span>
                          เบอร์โทรศัพท์ <span className="text-rose-600">*</span>
                        </span>
                        <span className={`text-sm font-mono ${phone.length === 10 ? 'text-emerald-700 font-bold' : 'text-stone-500'}`}>
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
                        <p className="text-sm text-amber-700 font-medium mt-1">
                          กรุณากรอกตัวเลขให้ครบ 10 หลัก (ปัจจุบัน {phone.length} หลัก)
                        </p>
                      ) : (
                        <span className="text-xs text-stone-500 font-mono block mt-1">
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

                  {/* Public Region Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-indigo-950 mb-1 block">
              จังหวัดที่พักอาศัย (แสดงสาธารณะ) <span className="text-rose-600">*</span>
            </label>
            <select
              required
              value={homeProvince}
              onChange={(e) => {
                const newProv = e.target.value;
                setHomeProvince(newProv);
                setHomeDistrict('');
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
              value={homeDistrict}
              onChange={(e) => setHomeDistrict(e.target.value)}
              disabled={!homeProvince}
              className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              <option value="">
                {homeProvince ? '-- เลือกอำเภอ / เขต --' : '-- กรุณาเลือกจังหวัดก่อน --'}
              </option>
              {getDistrictsByProvince(homeProvince).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Travel Distance Range */}
        <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-indigo-950">
              ระยะทางเดินทางสูงสุดที่สะดวก (max_travel_km)
            </label>
            <span className="font-mono text-sm font-black text-[#D946EF] bg-white px-2 py-0.5 border border-indigo-950">
              {maxTravelKm >= 100 ? '100 กม. ขึ้นไป' : `${maxTravelKm} กม.`}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={maxTravelKm}
            onChange={(e) => setMaxTravelKm(Number(e.target.value))}
            className="jg-range w-full cursor-pointer"
            style={{ '--fill': `${((maxTravelKm - 1) / 99) * 100}%` } as React.CSSProperties}
          />
          <p className="text-sm text-stone-500">
            ระบบจะใช้ระยะนี้ในการกรองฟีดงาน เพื่อไม่ให้แสดงงานที่อยู่ไกลเกินความสะดวกของคุณ
          </p>
        </div>

        {/* Private Exact Address */}
        <div>
          <label className="text-xs font-bold text-indigo-950 mb-1 block">
            ที่อยู่บ้านหรือซอยพักอาศัย (caregiver_locations - เก็บเป็นความลับ)
          </label>
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="เช่น ซอยพหลโยธิน 34 (ใช้คำนวณระยะทางเท่านั้น บุคคลอื่นไม่เห็น)"
            className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
          />
        </div>

        {/* Profile Photo Upload (Dashed Dropzone Style) */}
        <div className="space-y-2">
          <div>
            <label className="text-xs font-bold text-indigo-950 mb-0.5 block">
              รูปโปรไฟล์ผู้ดูแล (ไม่บังคับ)
            </label>
            <p className="text-sm text-stone-500">
              แนบรูปถ่ายหน้าตรง สุภาพ หรือรูปขณะปฏิบัติงาน เพื่อสร้างความน่าเชื่อถือกับครอบครัว
            </p>
          </div>

          {!avatarUrl ? (
            <div className="border-2 border-dashed border-indigo-950 p-6 sm:p-8 bg-[#FAF9F6] text-center space-y-3">
              <div className="w-12 h-12 mx-auto border-2 border-indigo-950 bg-white flex items-center justify-center text-indigo-950 riso-shadow-sm">
                <UploadIcon className="w-6 h-6" />
              </div>
              <div>
                <label
                  htmlFor="avatar-upload"
                  className="inline-block min-h-[44px] px-5 py-2.5 bg-indigo-950 text-white font-bold text-xs cursor-pointer border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065] riso-btn-active leading-loose"
                >
                  เลือกไฟล์รูปโปรไฟล์
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      fileToSmallDataUrl(file).then(setAvatarUrl).catch(() => undefined);
                    }
                  }}
                  className="hidden"
                />
                <p className="text-sm text-stone-500 mt-2">
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
                  <p className="text-xs text-stone-600">รูปภาพนี้จะแสดงบนโปรไฟล์ของคุณ</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <label
                  htmlFor="avatar-upload-change"
                  className="px-3 py-1.5 bg-white text-indigo-950 text-xs font-bold border border-indigo-950 hover:bg-stone-50 cursor-pointer text-center"
                >
                  เปลี่ยนรูป
                </label>
                <input
                  id="avatar-upload-change"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      fileToSmallDataUrl(file).then(setAvatarUrl).catch(() => undefined);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold border border-rose-900/30 hover:bg-rose-100 text-center"
                >
                  ลบรูป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
              )}

      {/* Privacy Notice Box */}
      <div className="p-3 bg-amber-50 border border-amber-900/30 text-xs text-amber-950 space-y-1">
        <span className="font-bold flex items-center gap-1.5 font-mono">
          🔒 ข้อกำหนดความปลอดภัยพิกัดบ้าน :
        </span>
        <p className="text-sm leading-relaxed">
          พิกัดละติจูด/ลองจิจูดของคุณจะถูกจัดเก็บใน <code>job_locations</code> และนำไปใช้คำนวณระยะทางแบบลับเท่านั้น บุคคลอื่นจะไม่สามารถเห็นที่อยู่จริงได้จนกว่าจะเกิดการจับคู่ตรงกัน (Mutual Match)
        </p>
      </div>

      {/* STEP 2: Roles, Years & Expected Wages */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950">
              ขั้นที่ 2: บทบาท ประสบการณ์ และค่าจ้าง
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              เลือกบทบาทที่คุณผ่านการอบรมหรือเคยทำจริง (เลือกได้มากกว่า 1 ข้อ)
            </p>
          </div>

          {/* Roles Multi-select */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono font-bold text-indigo-950 uppercase block">
              บทบาทของคุณ (care_roles)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(CARE_ROLES_META) as CareRole[]).map((r) => {
                const isSelected = careRoles.includes(r);
                const meta = CARE_ROLES_META[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleCareRole(r)}
                    className={`min-h-[56px] p-3 border-2 border-indigo-950 text-left transition-all riso-btn-active flex items-start gap-2.5 ${isSelected
                      ? 'bg-[#D946EF] text-white riso-shadow translate-x-[1px] translate-y-[1px]'
                      : 'bg-white text-indigo-950 riso-shadow-sm hover:bg-stone-50'
                      }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${isSelected ? 'bg-white text-[#D946EF]' : ''
                        }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{meta.label_th}</span>
                      <span
                        className={`text-sm block leading-tight mt-0.5 ${isSelected ? 'text-pink-100' : 'text-stone-500'
                          }`}
                      >
                        {meta.desc_th}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Years Experience Stepper */}
          <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-indigo-950 block">
                จำนวนปีประสบการณ์ดูแลผู้ป่วย/ผู้สูงอายุ
              </label>
              <span className="text-xs text-stone-500">นับรวมทั้งงานโรงพยาบาลและดูแลตามบ้าน</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setYearsExperience(Math.max(0, yearsExperience - 1))}
                className="w-11 h-11 bg-white border-2 border-indigo-950 font-mono font-black text-lg riso-shadow-sm flex items-center justify-center riso-btn-active"
              >
                -
              </button>
              <span className="w-14 text-center font-mono font-black text-xl text-indigo-950 bg-white py-1.5 border-2 border-indigo-950">
                {yearsExperience}
              </span>
              <button
                type="button"
                onClick={() => setYearsExperience(Math.min(60, yearsExperience + 1))}
                className="w-11 h-11 bg-white border-2 border-indigo-950 font-mono font-black text-lg riso-shadow-sm flex items-center justify-center riso-btn-active"
              >
                +
              </button>
            </div>
          </div>

          {/* Expected Wage Range & Unit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950">
                ช่วงค่าจ้างที่คาดหวัง (Expected Wage)
              </label>
              {/* Unit Selector */}
              <div className="flex border-2 border-indigo-950">
                {(['month', 'day', 'hour'] as WageUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setWageUnit(u);
                      if (u === 'day') {
                        setExpectedWageMin(700);
                        setExpectedWageMax(1000);
                      } else if (u === 'hour') {
                        setExpectedWageMin(150);
                        setExpectedWageMax(250);
                      } else {
                        setExpectedWageMin(20000);
                        setExpectedWageMax(25000);
                      }
                    }}
                    className={`px-3 py-1 text-xs font-mono font-bold ${wageUnit === u ? 'bg-indigo-950 text-white' : 'bg-white text-indigo-950'
                      }`}
                  >
                    /{u === 'month' ? 'เดือน' : u === 'day' ? 'วัน' : 'ชม.'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-mono text-stone-500 block mb-1">ขั้นต่ำ (บาท)</span>
                <input
                  type="number"
                  value={expectedWageMin}
                  onChange={(e) => setExpectedWageMin(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 bg-white border-2 border-indigo-950 font-mono text-sm"
                />
              </div>
              <div>
                <span className="text-sm font-mono text-stone-500 block mb-1">สูงสุด (บาท)</span>
                <input
                  type="number"
                  value={expectedWageMax}
                  onChange={(e) => setExpectedWageMax(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 bg-white border-2 border-indigo-950 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: 12-Case Matrix & Work Arrangements */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950">
              ขั้นที่ 3: ความถนัดต่อ 12 เคสการดูแล
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              แตะที่ปุ่มเพื่อสลับระดับความคุ้นเคย: <strong>เคยทำจริง → ผ่านอบรม → พร้อมเรียนรู้ → ไม่สะดวก</strong>
              <br />
              <span className="text-[#D946EF] font-bold">
                * ระบบจะนับว่า qualified ก็ต่อเมื่อเป็น &ldquo;เคยทำจริง&rdquo; หรือ &ldquo;ผ่านการอบรม&rdquo;
              </span>
            </p>
          </div>

          {/* Work Arrangement Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-indigo-950 uppercase block">
              รูปแบบงานที่รับ (work_arrangements)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setArrangement('daily')}
                className={`min-h-[48px] p-3 border-2 border-indigo-950 text-center font-bold text-xs sm:text-sm riso-btn-active transition-all ${workArrangements.includes('daily')
                  ? 'bg-indigo-950 text-white riso-shadow translate-x-[1px] translate-y-[1px]'
                  : 'bg-white text-indigo-950 riso-shadow-sm hover:bg-stone-50'
                  }`}
              >
                ไป-กลับ (Daily Shift)
              </button>
              <button
                type="button"
                onClick={() => setArrangement('live_in')}
                className={`min-h-[48px] p-3 border-2 border-indigo-950 text-center font-bold text-xs sm:text-sm riso-btn-active transition-all ${workArrangements.includes('live_in')
                  ? 'bg-indigo-950 text-white riso-shadow translate-x-[1px] translate-y-[1px]'
                  : 'bg-white text-indigo-950 riso-shadow-sm hover:bg-stone-50'
                  }`}
              >
                อยู่ประจำ (Live-in)
              </button>
            </div>
          </div>

          {/* 12-Case Interactive Matrix */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-indigo-950 uppercase">
                ทักษะการดูแล ({Object.keys(CASE_TYPES_V3).length} รายการ)
              </label>
              <span className="text-sm font-mono text-stone-500">แตะเพื่อเปลี่ยนสถานะ</span>
            </div>

            {(Object.keys(CASE_CATEGORY_LABEL_TH) as CaseType['category'][]).map((cat) => (
            <div key={cat} className="space-y-2">
            <p className="text-sm font-bold text-stone-600 pt-2">{CASE_CATEGORY_LABEL_TH[cat]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(CASE_TYPES_V3) as CaseTypeCode[]).filter((code) => CASE_TYPES_V3[code].category === cat).map((code) => {
                const item = CASE_TYPES_V3[code];
                const level = caseSkills[code] || 'willing_to_learn';
                const meta = COMFORT_LEVEL_META[level];

                return (
                  <div
                    key={code}
                    onClick={() => cycleComfortLevel(code)}
                    className="min-h-[60px] p-3 bg-white border-2 border-indigo-950 riso-shadow-sm flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-stone-50 riso-btn-active"
                  >
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-indigo-950 block">
                        {item.title_th}
                      </span>
                      <span className="text-xs text-stone-500 line-clamp-1">
                        {item.description_th}
                      </span>
                    </div>

                    <div
                      className={`px-2.5 py-1 text-sm font-bold border shrink-0 ${meta.color}`}
                    >
                      {meta.label_th}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            ))}

            <div className="pt-3 border-t-2 border-dashed border-stone-300">
              <CustomTagInput
                value={customTags}
                onChange={(t) => { setCustomTags(t); }}
                label="มีทักษะอื่นที่ไม่อยู่ในรายการ? พิมพ์เพิ่มเอง"
                placeholder="เช่น ดูแลผู้ป่วยฟอกไต, พูดภาษาจีนได้"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Certificate Uploader */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950">
              ขั้นที่ 4: แนบรูปใบรับรอง (Certificates)
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              แนบรูปใบประกาศนียบัตร NA / PN หรือใบผ่านการอบรมดูแลผู้สูงอายุ (สูงสุด 3 รูป)
              ระบบจะย่อขนาดให้อัตโนมัติ (≤520px) เพื่อประหยัดเน็ตมือถือ
            </p>
          </div>

          {/* Upload Box */}
          {!noCertificates && (
            <div className="border-2 border-dashed border-indigo-950 bg-[#FAF9F6] p-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-white border-2 border-indigo-950 flex items-center justify-center riso-shadow-sm">
                <UploadIcon className="w-6 h-6 text-indigo-950" />
              </div>

              <div>
                <label
                  htmlFor="cert-upload"
                  className="inline-block min-h-[44px] px-4 py-2.5 bg-indigo-950 text-white font-bold text-xs cursor-pointer border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065] riso-btn-active"
                >
                  ถ่ายรูป หรือ เลือกไฟล์ใบรับรอง
                </label>
                <input
                  id="cert-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-sm text-stone-500 mt-1.5">
                  รองรับ JPEG, PNG, WebP (สูงสุด 3 ไฟล์)
                </p>
              </div>
            </div>
          )}

          {/* Attached Previews */}
          {certificates.length > 0 && !noCertificates && (
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-950 uppercase block">
                รูปใบรับรองที่แนบไว้ ({certificates.length}/3)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {certificates.map((cert, idx) => (
                  <div
                    key={idx}
                    className="relative bg-white border-2 border-indigo-950 p-2 riso-shadow-sm space-y-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cert.preview_url}
                      alt={cert.file_name}
                      className="w-full h-32 object-cover border border-stone-200"
                    />
                    <p className="text-xs font-bold truncate">{cert.file_name}</p>
                    <button
                      type="button"
                      onClick={() => removeCertificate(idx)}
                      className="w-full min-h-[36px] py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-900/30 hover:bg-rose-100 flex items-center justify-center gap-1"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                      <span>ลบรูปนี้</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip Checkbox */}
          <label className="flex items-center gap-2.5 p-3 bg-stone-50 border border-indigo-950 cursor-pointer">
            <input
              type="checkbox"
              checked={noCertificates}
              onChange={(e) => {
                setNoCertificates(e.target.checked);
                if (e.target.checked) setCertificates([]);
              }}
              className="w-4 h-4 accent-[#D946EF]"
            />
            <span className="text-xs font-bold text-indigo-950">
              ยังไม่มีใบรับรองในตอนนี้ (สามารถเพิ่มภายหลังได้ ครอบครัวจะพิจารณาจากประสบการณ์)
            </span>
          </label>
        </div>
      )}

      {/* STEP 5: Review Summary Sheet */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950">
              ขั้นที่ 5: ตรวจทานคำตอบทั้งหมด
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              ตรวจสอบความถูกต้องก่อนกดให้ AI สรุปและเรียบเรียงโปรไฟล์ภาษาไทย
            </p>
          </div>

          {/* Review Cards */}
          <div className="space-y-3 text-xs sm:text-sm">
            {/* Step 1 Review */}
            <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 riso-shadow-sm flex items-start justify-between">
              <div className="flex items-start gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile preview"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover border-2 border-indigo-950 shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-950 text-white font-mono font-bold text-xl flex items-center justify-center border-2 border-indigo-950 shrink-0">
                    {getNameInitial(displayName, 'ผ')}
                  </div>
                )}
                <div>
                  <span className="font-mono text-xs font-bold text-[#D946EF] block">
                    ข้อมูลติดต่อ & พื้นที่
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-indigo-950">{displayName}</p>
                    <span className="text-xs px-2 py-0.5 bg-stone-200 text-indigo-950 border border-indigo-950 font-mono">
                      เพศ: {gender === 'female' ? 'หญิง' : gender === 'male' ? 'ชาย' : 'ไม่ระบุ'}
                    </span>
                  </div>
                  <p className="text-stone-600">
                    {homeDistrict}, {homeProvince} (รัศมี {maxTravelKm} กม.)
                  </p>
                  <p className="font-mono text-stone-500">โทร: {phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-indigo-950 underline underline-offset-2 shrink-0"
              >
                แก้ไข
              </button>
            </div>

            {/* Step 2 Review */}
            <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 riso-shadow-sm flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#D946EF] block">
                  บทบาท & ประสบการณ์
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-base text-indigo-950">{displayName}</p>
                  <span className="text-xs px-2 py-0.5 bg-stone-200 text-indigo-950 border border-indigo-950 font-mono">
                    เพศ: {gender === 'female' ? 'หญิง' : gender === 'male' ? 'ชาย' : 'ไม่ระบุ'}
                  </span>
                  {age && (
                    <span className="text-xs px-2 py-0.5 bg-stone-200 text-indigo-950 border border-indigo-950 font-mono">
                      อายุ: {age} ปี
                    </span>
                  )}
                </div>
                <p className="text-stone-600">
                  {homeDistrict}, {homeProvince} (รัศมี {maxTravelKm} กม.)
                </p>
                <p className="text-stone-600">ประสบการณ์ {yearsExperience} ปี</p>
                <p className="font-mono text-[#D946EF] font-bold">
                  ฿{expectedWageMin.toLocaleString()} - {expectedWageMax.toLocaleString()} /
                  {wageUnit === 'month' ? 'เดือน' : wageUnit === 'day' ? 'วัน' : 'ชม.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-indigo-950 underline underline-offset-2"
              >
                แก้ไข
              </button>
            </div>

            {/* Step 3 Review */}
            <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 riso-shadow-sm flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="font-mono text-xs font-bold text-[#D946EF] block">
                  เคสที่ดูแลได้ & รูปแบบงาน
                </span>
                <p className="text-stone-600">
                  รูปแบบ: {workArrangements.map((a) => (a === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ')).join(', ')}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(Object.keys(caseSkills) as CaseTypeCode[])
                    .filter(
                      (c) =>
                        caseSkills[c] === 'experienced' || caseSkills[c] === 'trained'
                    )
                    .map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 text-sm font-bold bg-white border border-indigo-950"
                      >
                        ✓ {CASE_TYPES_V3[c].short_label_th} ({COMFORT_LEVEL_META[caseSkills[c]].label_th})
                      </span>
                    ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-bold text-indigo-950 underline underline-offset-2"
              >
                แก้ไข
              </button>
            </div>

            {/* Step 4 Review */}
            <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-4 riso-shadow-sm flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#D946EF] block">
                  ใบรับรอง (Certificates)
                </span>
                <p className="font-bold text-indigo-950">
                  {certificates.length > 0
                    ? `แนบแล้ว ${certificates.length} รูป`
                    : 'ไม่มีใบรับรองในขณะนี้'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs font-bold text-indigo-950 underline underline-offset-2"
              >
                แก้ไข
              </button>
            </div>
          </div>

          {/* Final CTA Button */}
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="w-full min-h-[56px] px-6 py-3.5 bg-[#D946EF] text-white font-black text-base border-2 border-indigo-950 riso-shadow-lg hover:bg-[#c026d3] riso-btn-active flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            <span>สร้างโปรไฟล์ด้วย AI (Generate Profile)</span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stepper Footer Controls */}
      {step < 5 && (
        <div className="flex items-center justify-between border-t-2 border-indigo-950 pt-5 mt-6">
          <button
            type="button"
            onClick={handlePrevStep}
            className="min-h-[44px] px-4 py-2 border-2 border-indigo-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 bg-white hover:bg-stone-50 riso-shadow-sm riso-btn-active cursor-pointer"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>

          <button
            type="button"
            disabled={!canGoNext()}
            onClick={handleNextStep}
            className={`min-h-[44px] px-6 py-2 border-2 border-indigo-950 font-black text-xs sm:text-sm text-white flex items-center gap-1.5 transition-all ${canGoNext()
              ? 'bg-indigo-950 hover:bg-[#2E1065] riso-shadow riso-btn-active'
              : 'opacity-40 cursor-not-allowed bg-stone-400'
              }`}
          >
            <span>ถัดไป</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
        </main >
      </div >

  <Footer />
    </div >
  );
}
