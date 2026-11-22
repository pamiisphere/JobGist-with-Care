'use client';

/**
 * AI Lab — a test bench for the matching score and the AI prompts.
 * Change the job / caregiver on the left, see the rule-based score update instantly,
 * then preview the exact prompt the backend would send to the LLM (free) or call it (costs tokens).
 * Nothing here is saved to the database.
 */
import React, { useMemo, useState } from 'react';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import CustomTagInput from '@/components/CustomTagInput';
import {
  CASE_TYPES_V3,
  CASE_CATEGORY_LABEL_TH,
  COMFORT_LEVEL_META,
  CaseType,
  CaseTypeCode,
  ComfortLevel,
  WageUnit,
} from '@/types/database';
import { scoreMatch, toDbCase, SCORE_CONFIG, aiLab, LabResult } from '@/services/live';

const LEVELS: ComfortLevel[] = ['experienced', 'trained', 'willing_to_learn', 'not_comfortable'];
const UNIT_TH: Record<WageUnit, string> = { month: 'บาท/เดือน', day: 'บาท/วัน', hour: 'บาท/ชม.' };
const CRITERIA: { key: keyof typeof SCORE_CONFIG.WEIGHTS; label: string }[] = [
  { key: 'specialized', label: 'ทักษะเคสเฉพาะทาง' },
  { key: 'distance', label: 'ระยะทาง' },
  { key: 'wage', label: 'ค่าจ้างอยู่ในงบ' },
  { key: 'general', label: 'ทักษะดูแลทั่วไป' },
  { key: 'experience', label: 'ประสบการณ์ + ใบรับรอง' },
];

interface LabState {
  needs: CaseTypeCode[];
  wageMax: number | '';
  wageUnit: WageUnit;
  arrangement: 'daily' | 'live_in';
  description: string;
  jobTags: string[];
  skills: Partial<Record<CaseTypeCode, ComfortLevel>>;
  years: number;
  cert: boolean;
  cgWageMin: number | '';
  cgTags: string[];
  distance: number;
}

// Same scenario as backend/scripts/test_score.py: a Parkinson patient — who should rank first?
const PRESETS: { name: string; state: LabState }[] = (() => {
  const job = {
    needs: ['parkinson', 'fall_risk'] as CaseTypeCode[], wageMax: 18000 as number | '', wageUnit: 'month' as WageUnit,
    arrangement: 'daily' as const, description: 'คุณพ่ออายุ 75 เป็นพาร์กินสัน มือสั่น เดินเซ เคยหกล้มในห้องน้ำ', jobTags: [],
  };
  return [
    { name: 'A: ทำพาร์กินสันเป็น แต่อยู่ไกล 25 กม.', state: { ...job, skills: { parkinson: 'experienced' }, years: 5, cert: true, cgWageMin: 17000, cgTags: [], distance: 25 } },
    { name: 'B: ไม่มีทักษะพาร์กินสัน อยู่ใกล้ 2 กม.', state: { ...job, skills: { fall_risk: 'experienced' }, years: 6, cert: false, cgWageMin: 15000, cgTags: [], distance: 2 } },
    { name: 'C: ยินดีเรียนรู้พาร์กินสัน อยู่ 5 กม.', state: { ...job, skills: { parkinson: 'willing_to_learn', fall_risk: 'trained' }, years: 2, cert: false, cgWageMin: 16000, cgTags: [], distance: 5 } },
  ];
})();

const r1 = (x: number) => Math.round(x * 10) / 10;

export default function AiLabPage() {
  const [s, setS] = useState<LabState>(PRESETS[0].state);
  const set = (patch: Partial<LabState>) => setS((prev) => ({ ...prev, ...patch }));
  const [busy, setBusy] = useState<string>('');
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState<LabResult | null>(null);
  const [profile, setProfile] = useState<LabResult | null>(null);

  const score = useMemo(
    () =>
      scoreMatch({
        needs: s.needs,
        jobWageMax: s.wageMax === '' ? null : s.wageMax,
        jobWageUnit: s.wageUnit,
        distanceKm: s.distance,
        skills: Object.entries(s.skills).map(([c, l]) => ({ case_type: c as CaseTypeCode, comfort_level: l! })),
        cgWageMin: s.cgWageMin === '' ? null : s.cgWageMin,
        cgWageUnit: s.wageUnit,
        yearsExperience: s.years,
        hasVerifiedCert: s.cert,
      }),
    [s]
  );

  // Human-readable "how was this number computed" for each criterion
  const explain = useMemo(() => {
    const { SPECIALIZED, WEIGHTS: W, LEVEL_CREDIT, DISTANCE_ZERO_KM, EXPERIENCE_FULL_YEARS } = SCORE_CONFIG;
    const isSpec = (c: CaseTypeCode) => SPECIALIZED.has(toDbCase(c));
    const cov = (list: CaseTypeCode[], w: number) => {
      if (!list.length) return `ไม่มีเคสกลุ่มนี้ → ได้เต็ม ${w}`;
      const parts = list.map((c) => {
        const lvl = s.skills[c] || 'not_comfortable';
        return `${CASE_TYPES_V3[c].short_label_th} ${COMFORT_LEVEL_META[lvl].label_th} (×${LEVEL_CREDIT[lvl]})`;
      });
      const avg = list.reduce((a, c) => a + LEVEL_CREDIT[s.skills[c] || 'not_comfortable'], 0) / list.length;
      return `${parts.join(', ')} → เฉลี่ย ${r1(avg * 100) / 100} × ${w}`;
    };
    const wageTxt =
      s.wageMax === '' || s.cgWageMin === ''
        ? `ไม่ระบุค่าจ้าง → ได้ครึ่งหนึ่ง (${W.wage / 2})`
        : s.cgWageMin <= s.wageMax
          ? `ขอ ${s.cgWageMin.toLocaleString()} ≤ งบ ${s.wageMax.toLocaleString()} → เต็ม ${W.wage}`
          : s.cgWageMin <= s.wageMax * 1.1
            ? `เกินงบไม่เกิน 10% (ต่อรองได้) → ${W.wage / 2}`
            : `เกินงบเกิน 10% → 0`;
    const yrs = Math.min(s.years, EXPERIENCE_FULL_YEARS);
    return {
      specialized: cov(s.needs.filter(isSpec), W.specialized),
      general: cov(s.needs.filter((c) => !isSpec(c)), W.general),
      distance: `${W.distance} × (1 − ${s.distance}/${DISTANCE_ZERO_KM} กม.) — ไกลเกิน ${DISTANCE_ZERO_KM} กม. ได้ 0`,
      wage: wageTxt,
      experience: `${W.experience} × (0.6 × ${yrs}/${EXPERIENCE_FULL_YEARS} ปี + 0.4 × ${s.cert ? 'มีใบรับรอง' : 'ไม่มีใบรับรอง'})`,
    };
  }, [s]);

  const body = (callLlm: boolean) => ({
    call_llm: callLlm,
    distance_km: s.distance,
    job: {
      needs: s.needs.map(toDbCase),
      wage_max: s.wageMax === '' ? null : s.wageMax,
      wage_unit: s.wageUnit,
      work_arrangement: s.arrangement,
      patient_description: s.description,
      custom_tags: s.jobTags,
    },
    caregiver: {
      skills: Object.fromEntries(Object.entries(s.skills).map(([c, l]) => [toDbCase(c as CaseTypeCode), l])),
      years_experience: s.years,
      has_verified_cert: s.cert,
      expected_wage_min: s.cgWageMin === '' ? null : s.cgWageMin,
      wage_unit: s.wageUnit,
      work_arrangements: [s.arrangement],
      custom_tags: s.cgTags,
    },
  });

  const run = async (kind: 'applicant-summary' | 'worker-profile', callLlm: boolean) => {
    setErr('');
    setBusy(`${kind}:${callLlm}`);
    try {
      const r = await aiLab(kind, body(callLlm));
      if (kind === 'applicant-summary') setSummary(r);
      else setProfile(r);
    } catch (e) {
      setErr(
        (e as Error).message.includes('NEXT_PUBLIC_API_BASE') || (e as Error).message.includes('เข้าสู่ระบบ')
          ? 'ต้องเข้าสู่ระบบในโหมดออนไลน์ (เชื่อม backend) ก่อน จึงจะดู prompt / เรียก AI ได้ — คะแนนด้านบนยังใช้งานได้ปกติ'
          : (e as Error).message
      );
    } finally {
      setBusy('');
    }
  };

  const toggleNeed = (c: CaseTypeCode) =>
    set({ needs: s.needs.includes(c) ? s.needs.filter((x) => x !== c) : [...s.needs, c] });

  const card = 'bg-white border-2 border-indigo-950 riso-shadow p-4 sm:p-5 space-y-4';
  const input = 'w-full min-h-[44px] px-3 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]';
  const btn = 'min-h-[44px] px-4 text-sm font-bold border-2 border-indigo-950 riso-shadow-sm riso-btn-active disabled:opacity-40';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black">AI Lab: ระบบจับคู่และสรุปดูจากอะไร</h1>
          <p className="text-sm text-stone-600">
            ปรับข้อมูลงานและผู้ดูแล แล้วดูคะแนนเปลี่ยนทันที (คะแนนคิดด้วยกฎ ไม่ใช้ AI) จากนั้นกดดู prompt ที่ส่งให้ AI
            หรือเรียก AI จริง ข้อมูลในหน้านี้ไม่ถูกบันทึกลงฐานข้อมูล
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-sm font-bold self-center">ตัวอย่าง:</span>
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => { setS(p.state); setSummary(null); setProfile(null); }} className={`${btn} bg-white text-left`}>
                {p.name}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ---------- INPUTS ---------- */}
          <div className="space-y-5">
            <section className={card}>
              <h2 className="text-lg font-black">1. ฝั่งครอบครัว (งาน)</h2>
              <div className="space-y-3">
                {(Object.keys(CASE_CATEGORY_LABEL_TH) as CaseType['category'][]).map((cat) => (
                  <div key={cat} className="space-y-1.5">
                    <p className="text-sm font-bold text-stone-600">{CASE_CATEGORY_LABEL_TH[cat]}</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(CASE_TYPES_V3) as CaseTypeCode[])
                        .filter((c) => CASE_TYPES_V3[c].category === cat)
                        .map((c) => {
                          const on = s.needs.includes(c);
                          const spec = SCORE_CONFIG.SPECIALIZED.has(toDbCase(c));
                          return (
                            <button
                              key={c}
                              onClick={() => toggleNeed(c)}
                              className={`min-h-[40px] px-3 text-sm font-bold border-2 border-indigo-950 ${on ? 'bg-indigo-950 text-white' : 'bg-white text-stone-500'}`}
                              title={spec ? 'เคสเฉพาะทาง (น้ำหนัก 40)' : 'ดูแลทั่วไป (น้ำหนัก 15)'}
                            >
                              {CASE_TYPES_V3[c].short_label_th}
                              {spec && <span className="ml-1 text-[#D946EF]">★</span>}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-stone-500">★ = เคสเฉพาะทาง นับในหมวดน้ำหนักสูงสุด</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm font-bold">
                  งบสูงสุด
                  <input type="number" className={input} value={s.wageMax} onChange={(e) => set({ wageMax: e.target.value === '' ? '' : Number(e.target.value) })} />
                </label>
                <label className="space-y-1 text-sm font-bold">
                  หน่วย
                  <select className={input} value={s.wageUnit} onChange={(e) => set({ wageUnit: e.target.value as WageUnit })}>
                    {(Object.keys(UNIT_TH) as WageUnit[]).map((u) => <option key={u} value={u}>{UNIT_TH[u]}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-sm font-bold">
                ครอบครัวเล่าอาการ (ส่งให้ AI อ่านด้วย)
                <textarea rows={3} className={`${input} py-2`} value={s.description} onChange={(e) => set({ description: e.target.value })} />
              </label>
              <CustomTagInput value={s.jobTags} onChange={(t) => set({ jobTags: t })} label="แท็กที่ครอบครัวพิมพ์เอง" placeholder="เช่น ฟอกไต" />
            </section>

            <section className={card}>
              <h2 className="text-lg font-black">2. ฝั่งผู้ดูแล</h2>
              {s.needs.length === 0 ? (
                <p className="text-sm text-stone-500">เลือกเคสของงานก่อน แล้วจะตั้งระดับทักษะของผู้ดูแลได้ที่นี่</p>
              ) : (
                <div className="space-y-2">
                  {s.needs.map((c) => (
                    <div key={c} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                      <span className="text-sm font-bold sm:w-40 shrink-0">{CASE_TYPES_V3[c].short_label_th}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {LEVELS.map((l) => (
                          <button
                            key={l}
                            onClick={() => set({ skills: { ...s.skills, [c]: l } })}
                            className={`min-h-[36px] px-2.5 text-xs font-bold border ${(s.skills[c] || 'not_comfortable') === l ? COMFORT_LEVEL_META[l].color + ' ring-2 ring-indigo-950' : 'bg-white text-stone-500 border-stone-300'}`}
                          >
                            {COMFORT_LEVEL_META[l].label_th}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm font-bold">
                  ค่าจ้างที่ขอ (ต่ำสุด)
                  <input type="number" className={input} value={s.cgWageMin} onChange={(e) => set({ cgWageMin: e.target.value === '' ? '' : Number(e.target.value) })} />
                </label>
                <label className="space-y-1 text-sm font-bold">
                  ประสบการณ์ (ปี)
                  <input type="number" min={0} className={input} value={s.years} onChange={(e) => set({ years: Math.max(0, Number(e.target.value) || 0) })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold min-h-[44px]">
                <input type="checkbox" className="w-5 h-5" checked={s.cert} onChange={(e) => set({ cert: e.target.checked })} />
                มีใบรับรองที่ตรวจสอบแล้ว
              </label>
              <label className="block space-y-1 text-sm font-bold">
                ระยะทางจากบ้านผู้ป่วย: {s.distance} กม.
                <input
                  type="range" min={0} max={40} value={s.distance}
                  onChange={(e) => set({ distance: Number(e.target.value) })}
                  className="jg-range w-full" style={{ ['--fill' as string]: `${(s.distance / 40) * 100}%` }}
                />
              </label>
              <CustomTagInput value={s.cgTags} onChange={(t) => set({ cgTags: t })} label="ทักษะที่ผู้ดูแลพิมพ์เอง" placeholder="เช่น พูดจีนได้" />
            </section>
          </div>

          {/* ---------- OUTPUTS ---------- */}
          <div className="space-y-5 lg:sticky lg:top-20">
            <section className={card}>
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-lg font-black">3. คะแนนความเหมาะสม</h2>
                <span className="text-4xl font-black text-[#D946EF] leading-none">{score.total}<span className="text-base text-stone-500">/100</span></span>
              </div>
              <div className="space-y-3">
                {CRITERIA.map(({ key, label }) => {
                  const v = score.breakdown[key];
                  const w = SCORE_CONFIG.WEIGHTS[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm font-bold">
                        <span>{label}</span>
                        <span>{v} / {w}</span>
                      </div>
                      <div className="h-3 bg-stone-200 border border-indigo-950">
                        <div className="h-full bg-[#D946EF]" style={{ width: `${(v / w) * 100}%` }} />
                      </div>
                      <p className="text-xs text-stone-600 break-words">{explain[key]}</p>
                    </div>
                  );
                })}
              </div>
              {(score.missing_specialized.length > 0 || score.missing_general.length > 0) && (
                <p className="text-sm bg-amber-50 border border-amber-400 p-2">
                  ยังขาด (ต่ำกว่า &ldquo;ผ่านการอบรม&rdquo;): {[...score.missing_specialized, ...score.missing_general].map((c) => CASE_TYPES_V3[c].short_label_th).join(', ')}
                  {' '}→ AI จะถูกบังคับให้ใส่ในหัวข้อ &ldquo;ควรคุยเพิ่ม&rdquo;
                </p>
              )}
              <p className="text-xs text-stone-500">
                แท็กที่พิมพ์เองไม่ถูกนำมาคิดคะแนน เพราะข้อความอิสระเทียบกันตรงๆ ไม่ได้ แต่จะส่งให้ AI ใช้ตอนเขียนสรุป
              </p>
            </section>

            <section className={card}>
              <h2 className="text-lg font-black">4. AI สรุป: ส่งอะไรให้ AI</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button disabled={!!busy} onClick={() => run('applicant-summary', false)} className={`${btn} bg-white`}>สรุปผู้สมัคร: ดู prompt (ฟรี)</button>
                <button disabled={!!busy} onClick={() => run('applicant-summary', true)} className={`${btn} bg-[#D946EF] text-white`}>สรุปผู้สมัคร: เรียก AI จริง</button>
                <button disabled={!!busy} onClick={() => run('worker-profile', false)} className={`${btn} bg-white`}>โปรไฟล์ผู้ดูแล: ดู prompt (ฟรี)</button>
                <button disabled={!!busy} onClick={() => run('worker-profile', true)} className={`${btn} bg-[#D946EF] text-white`}>โปรไฟล์ผู้ดูแล: เรียก AI จริง</button>
              </div>
              {busy && <p className="text-sm font-bold">กำลังทำงาน...</p>}
              {err && <p className="text-sm text-rose-800 bg-rose-50 border border-rose-700 p-2 break-words">{err}</p>}
              {[{ t: 'สรุปผู้สมัคร (สำหรับครอบครัว)', r: summary }, { t: 'โปรไฟล์ผู้ดูแล', r: profile }].map(({ t, r }) =>
                r ? <LabOutput key={t} title={t} r={r} /> : null
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LabOutput({ title, r }: { title: string; r: LabResult }) {
  const sys = r.messages.find((m) => m.role === 'system')?.content || '';
  const user = r.messages.find((m) => m.role === 'user')?.content || '';
  return (
    <div className="border-t-2 border-indigo-950 pt-3 space-y-2">
      <p className="font-black">{title} <span className="text-xs font-mono text-stone-500">prompt {r.prompt_version}</span></p>
      <details className="text-sm">
        <summary className="cursor-pointer font-bold min-h-[36px]">กฎและตัวอย่างที่ให้ AI (system prompt)</summary>
        <pre className="whitespace-pre-wrap break-words bg-[#FAF9F6] border border-indigo-950 p-3 text-xs mt-1">{sys}</pre>
      </details>
      <p className="text-sm font-bold">ข้อมูลที่ส่งให้ AI (ไม่มีชื่อ เบอร์ หรือที่อยู่)</p>
      <pre className="whitespace-pre-wrap break-words bg-[#FAF9F6] border border-indigo-950 p-3 text-xs">{user}</pre>
      {r.llm && (
        r.llm.success ? (
          <>
            <p className="text-sm font-bold">ผลลัพธ์จาก AI</p>
            <pre className="whitespace-pre-wrap break-words bg-emerald-50 border border-emerald-700 p-3 text-sm">{r.llm.text}</pre>
            <p className="text-xs text-stone-600">
              {r.llm.model} • {r.llm.latency_ms} ms • tokens {r.llm.input_tokens ?? '?'} in / {r.llm.output_tokens ?? '?'} out
              {r.llm.cost_thb != null && ` • ≈ ${r.llm.cost_thb.toFixed(4)} บาท`}
            </p>
          </>
        ) : (
          <p className="text-sm text-rose-800 break-words">AI ล้มเหลว: {r.llm.error} — ในระบบจริงจะแสดงแค่คะแนน (rule_only)</p>
        )
      )}
    </div>
  );
}
