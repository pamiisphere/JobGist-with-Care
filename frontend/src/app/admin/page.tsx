'use client';

/**
 * Admin evaluation dashboard.
 *  - Objective 1 · Platform : in-app ratings (platform_reviews) + task completion (task_events, matches)
 *  - Objective 2 · AI       : ai_logs per feature x model — success rate, median / P95 latency
 * Data comes from the backend (/admin/eval-stats, /admin/ai-stats); login is checked on Render.
 */
import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { adminAiStats, adminEvalStats, AiStats, EvalStats, QuestionStat } from '@/services/live';

const TARGET = 4; // Objective 1 target: mean rating >= 4 / 5

const FEATURE_TH: Record<string, string> = {
  worker_profile: 'โปรไฟล์ผู้ดูแล',
  applicant_summary: 'สรุปผู้สมัคร',
  location_pin: 'ปักหมุด',
  other: 'อื่นๆ',
};
const QUESTION_TH: { key: keyof EvalStats['reviews']['questions']; label: string; familyOnly?: boolean }[] = [
  { key: 'ease_of_use', label: 'ใช้งานง่าย' },
  { key: 'profile_clarity', label: 'ข้อความโปรไฟล์ AI ชัดเจน' },
  { key: 'summary_accuracy', label: 'สรุปความเหมาะสมตรงข้อมูลจริง', familyOnly: true },
  { key: 'tag_usefulness', label: 'tag ที่แนะนำมีประโยชน์', familyOnly: true },
  { key: 'overall_satisfaction', label: 'พอใจโดยรวม' },
];
const STEP_TH: Record<string, string> = {
  signup: 'สมัครสมาชิก',
  onboarding_form: 'กรอกฟอร์มโปรไฟล์',
  post_job: 'ลงประกาศงาน',
  mutual_match: 'ได้คู่ที่ตรงกัน (mutual match)',
};
const ROLE_TH: Record<string, string> = { caregiver: 'ผู้ดูแล', family: 'ครอบครัว' };

const num = (x: number | null | undefined) => (x == null ? '-' : x.toLocaleString());
const pct = (x: number | null | undefined) => (x == null ? '-' : `${Math.round(x * 100)}%`);
const mean = (x: number | null | undefined) => (x == null ? '-' : x.toFixed(2));
const sec = (ms: number | null | undefined) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} วิ`);
const dur = (m: number | null | undefined) =>
  m == null ? '-' : m < 60 ? `${m.toFixed(1)} นาที` : m < 60 * 48 ? `${(m / 60).toFixed(1)} ชม.` : `${(m / 1440).toFixed(1)} วัน`;

function Score({ s }: { s: QuestionStat }) {
  if (!s || s.n === 0) return <span className="text-stone-400">-</span>;
  const pass = (s.mean ?? 0) >= TARGET;
  return (
    <span className={pass ? 'font-bold text-emerald-800' : 'font-bold text-rose-800'}>
      {mean(s.mean)} <span className="font-normal text-stone-500 text-xs">(n={s.n})</span>
    </span>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<'platform' | 'ai'>('platform');
  const [days, setDays] = useState(30);
  const [includeEval, setIncludeEval] = useState(false);
  const [ai, setAi] = useState<AiStats | null>(null);
  const [ev, setEv] = useState<EvalStats | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  // kept in sessionStorage: survives refresh, cleared when the tab closes
  const [login, setLogin] = useState<{ user: string; password: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(sessionStorage.getItem('jg_admin_login') || 'null'); } catch { return null; }
  });
  const [form, setForm] = useState({ user: 'admin', password: '' });

  useEffect(() => {
    if (!login) return;
    let alive = true;
    Promise.all([adminEvalStats(days, login), adminAiStats(days, includeEval, login)])
      .then(([e, a]) => { if (alive) { setEv(e); setAi(a); setErr(''); } })
      .catch((e: Error) => {
        if (!alive) return;
        const m = e.message;
        setErr(
          m === 'FORBIDDEN'
            ? 'username หรือรหัสผ่านไม่ถูกต้อง'
            : m.includes('NEXT_PUBLIC_API_BASE')
              ? 'เว็บนี้ยังไม่ได้เชื่อม backend (NEXT_PUBLIC_API_BASE)'
              : m
        );
        if (m === 'FORBIDDEN') { setLogin(null); try { sessionStorage.removeItem('jg_admin_login'); } catch {} }
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days, includeEval, login]);

  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    const l = { user: form.user.trim(), password: form.password };
    try { sessionStorage.setItem('jg_admin_login', JSON.stringify(l)); } catch {}
    setErr('');
    setLoading(true);
    setLogin(l);
  };
  const signOut = () => {
    try { sessionStorage.removeItem('jg_admin_login'); } catch {}
    setLogin(null);
    setAi(null);
    setEv(null);
  };

  const card = 'bg-white border-2 border-indigo-950 riso-shadow p-4 sm:p-5';
  const th = 'text-left text-xs font-bold text-stone-600 px-2 py-2 whitespace-nowrap';
  const td = 'text-sm px-2 py-2 whitespace-nowrap border-t border-stone-200';
  const kpi = (items: { l: string; v: string; s: string; good?: boolean | null }[]) => (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((c) => (
        <div key={c.l} className={card}>
          <p className="text-xs font-bold text-stone-600">{c.l}</p>
          <p className={`text-2xl sm:text-3xl font-black break-words ${
            c.good == null ? 'text-[#D946EF]' : c.good ? 'text-emerald-700' : 'text-rose-700'
          }`}>{c.v}</p>
          <p className="text-xs text-stone-500">{c.s}</p>
        </div>
      ))}
    </section>
  );

  const overall = ev?.reviews.questions.overall_satisfaction.all;
  const ease = ev?.reviews.questions.ease_of_use.all;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Admin: ผลการประเมินระบบ</h1>
            <p className="text-sm text-stone-600">ตัวชี้วัดตามวัตถุประสงค์ของโปรเจกต์ · {days} วันล่าสุด</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => { if (d !== days) { setLoading(true); setDays(d); } }}
                className={`min-h-[44px] px-3 text-sm font-bold border-2 border-indigo-950 ${days === d ? 'bg-indigo-950 text-white' : 'bg-white'}`}
              >
                {d} วัน
              </button>
            ))}
            {login && (
              <button onClick={signOut} className="min-h-[44px] px-3 text-sm font-bold bg-white border-2 border-indigo-950">ออกจากระบบ</button>
            )}
          </div>
        </header>

        {!login && (
          <form onSubmit={signIn} className={`${card} max-w-sm space-y-3`}>
            <h2 className="text-lg font-black">เข้าสู่ระบบ admin</h2>
            <label className="block space-y-1 text-sm font-bold">
              Username
              <input className="w-full min-h-[44px] px-3 border-2 border-indigo-950" autoComplete="username"
                value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm font-bold">
              รหัสผ่าน
              <input type="password" className="w-full min-h-[44px] px-3 border-2 border-indigo-950" autoComplete="current-password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <button disabled={!form.password} className="w-full min-h-[44px] font-bold bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow-sm disabled:opacity-40">
              เข้าสู่ระบบ
            </button>
          </form>
        )}
        {loading && <p className="text-sm font-bold">กำลังโหลด... (ถ้า server หลับอยู่อาจรอ 30-50 วินาที)</p>}
        {err && <p className="text-sm text-rose-800 bg-rose-50 border-2 border-rose-700 p-3">{err}</p>}

        {login && ev && ai && !err && (
          <>
            <nav className="flex gap-2" role="tablist">
              {([
                ['platform', 'วัตถุประสงค์ 1 · แพลตฟอร์ม'],
                ['ai', 'วัตถุประสงค์ 2 · AI'],
              ] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`min-h-[44px] px-4 text-sm font-black border-2 border-indigo-950 ${tab === k ? 'bg-[#D946EF] text-white riso-shadow-sm' : 'bg-white'}`}>
                  {l}
                </button>
              ))}
            </nav>

            {tab === 'platform' && (
              <>
                {kpi([
                  { l: 'จำนวนผู้ตอบแบบประเมิน', v: num(ev.reviews.total),
                    s: `ผู้ดูแล ${num(ev.reviews.by_role.caregiver ?? 0)} · ครอบครัว ${num(ev.reviews.by_role.family ?? 0)}` },
                  { l: 'ความพอใจโดยรวม (เฉลี่ย)', v: overall?.mean == null ? '-' : `${mean(overall.mean)} / 5`,
                    s: `เป้าหมาย ≥ ${TARGET}`, good: overall?.mean == null ? null : overall.mean >= TARGET },
                  { l: 'ใช้งานง่าย (เฉลี่ย)', v: ease?.mean == null ? '-' : `${mean(ease.mean)} / 5`,
                    s: `เป้าหมาย ≥ ${TARGET}`, good: ease?.mean == null ? null : ease.mean >= TARGET },
                  { l: 'ให้คะแนนโดยรวม 4–5', v: pct(overall?.pct_4_or_more), s: 'สัดส่วนผู้ที่พอใจ' },
                ])}

                <section className={`${card} space-y-3`}>
                  <div>
                    <h2 className="text-lg font-black">คะแนนรายข้อ (1–5)</h2>
                    <p className="text-xs text-stone-500">เขียว = ผ่านเป้า ≥ {TARGET} · แดง = ต่ำกว่าเป้า · ข้อ 3–4 ถามเฉพาะครอบครัว</p>
                  </div>
                  <div className="overflow-x-auto -mx-2">
                    <table className="min-w-full">
                      <thead><tr>{['คำถาม', 'ทั้งหมด', 'ผู้ดูแล', 'ครอบครัว', 'ให้ 4–5'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {QUESTION_TH.map((q, i) => {
                          const s = ev.reviews.questions[q.key];
                          return (
                            <tr key={q.key}>
                              <td className={`${td} font-bold`}>{i + 1}. {q.label}</td>
                              <td className={td}><Score s={s.all} /></td>
                              <td className={td}>{q.familyOnly ? <span className="text-stone-400">ไม่ได้ถาม</span> : <Score s={s.caregiver} />}</td>
                              <td className={td}><Score s={s.family} /></td>
                              <td className={td}>{pct(s.all.pct_4_or_more)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`${card} space-y-3`}>
                  <div>
                    <h2 className="text-lg font-black">คะแนนแยกตามโมเดลที่ผู้ใช้เห็นข้อความ</h2>
                    <p className="text-xs text-stone-500">โมเดลที่เขียนโปรไฟล์ (ผู้ดูแล) หรือสรุปผู้สมัคร (ครอบครัว) ที่แสดงให้ผู้ตอบคนนั้น</p>
                  </div>
                  <div className="overflow-x-auto -mx-2">
                    <table className="min-w-full">
                      <thead><tr>{['โมเดล', 'ผู้ตอบ', 'พอใจโดยรวม', 'โปรไฟล์ชัดเจน', 'สรุปตรงข้อมูล'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {ev.reviews.by_model.length === 0 && (
                          <tr><td className={td} colSpan={5}>ยังไม่มีข้อมูล</td></tr>
                        )}
                        {ev.reviews.by_model.map((m) => (
                          <tr key={m.model}>
                            <td className={`${td} font-bold`}>{m.model}</td>
                            <td className={td}>{num(m.n)}</td>
                            <td className={td}>{mean(m.overall_mean)}</td>
                            <td className={td}>{mean(m.profile_clarity_mean)}</td>
                            <td className={td}>{mean(m.summary_accuracy_mean)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`${card} space-y-3`}>
                  <div>
                    <h2 className="text-lg font-black">การทำงานสำเร็จ (Task completion)</h2>
                    <p className="text-xs text-stone-500">
                      นับจากผู้ใช้ที่สมัครในช่วงนี้ · เวลาวัดจากเปิดหน้าจนบันทึกสำเร็จ (mutual match วัดจากวันสมัคร)
                    </p>
                  </div>
                  <div className="overflow-x-auto -mx-2">
                    <table className="min-w-full">
                      <thead><tr>{['ผู้ใช้', 'ขั้นตอน', 'สำเร็จ / ทั้งหมด', 'อัตราสำเร็จ', 'เวลา (มัธยฐาน)', 'เวลา (P90)'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {ev.tasks.map((t) => (
                          <tr key={`${t.role}-${t.step}`}>
                            <td className={td}>{ROLE_TH[t.role] || t.role}</td>
                            <td className={`${td} font-bold`}>{STEP_TH[t.step] || t.step}</td>
                            <td className={td}>{num(t.completed)} / {num(t.eligible)}</td>
                            <td className={td}>{t.step === 'signup' ? '-' : pct(t.completion_rate)}</td>
                            <td className={td}>{dur(t.median_minutes)}</td>
                            <td className={td}>{dur(t.p90_minutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`${card} space-y-3`}>
                  <h2 className="text-lg font-black">ความคิดเห็น: ตรงไหนที่งงหรือติดขัด</h2>
                  {ev.reviews.comments.length === 0 ? (
                    <p className="text-sm text-stone-500">ยังไม่มีความคิดเห็น</p>
                  ) : (
                    <ul className="space-y-2">
                      {ev.reviews.comments.map((c, i) => (
                        <li key={i} className="border-2 border-stone-200 p-3 text-sm space-y-1">
                          <p>{c.comment}</p>
                          <p className="text-xs text-stone-500">
                            {ROLE_TH[c.role || ''] || 'ไม่ทราบ'} · โดยรวม {c.overall ?? '-'}/5 ·{' '}
                            {new Date(c.created_at).toLocaleDateString('th-TH')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <p className="text-xs text-stone-500">SUS เก็บแยกด้วยแบบสอบถาม 10 ข้อ ไม่ได้อยู่ในหน้านี้</p>
              </>
            )}

            {tab === 'ai' && (
              <>
                {kpi([
                  { l: 'จำนวนครั้งที่เรียก AI', v: num(ai.totals.calls), s: `สำเร็จ ${num(ai.totals.success)} ครั้ง` },
                  { l: 'อัตราสำเร็จ (JSON ถูกต้อง)', v: pct(ai.totals.success_rate), s: 'ได้ผลลัพธ์ที่ใช้งานได้' },
                  { l: 'เวลาตอบ (มัธยฐาน)', v: sec(ai.totals.median_latency_ms), s: 'เฉพาะครั้งที่สำเร็จ' },
                  { l: 'เวลาตอบ (P95)', v: sec(ai.totals.p95_latency_ms), s: '95% ของคำขอเร็วกว่านี้' },
                ])}
                <label className="flex items-center gap-2 text-sm font-bold min-h-[44px]">
                  <input type="checkbox" className="w-5 h-5" checked={includeEval}
                    onChange={(e) => { setLoading(true); setIncludeEval(e.target.checked); }} />
                  รวมการเรียกเพื่อทดสอบ (AI Lab / eval)
                  {!includeEval && ai.eval_calls_hidden > 0 && (
                    <span className="font-normal text-stone-500">· ซ่อนอยู่ {ai.eval_calls_hidden} ครั้ง</span>
                  )}
                </label>

                <section className={`${card} space-y-3`}>
                  <h2 className="text-lg font-black">แยกตามงาน × โมเดล</h2>
                  <div className="overflow-x-auto -mx-2">
                    <table className="min-w-full">
                      <thead><tr>{['งาน', 'โมเดล', 'prompt', 'ครั้ง', 'สำเร็จ', 'มัธยฐาน', 'P95'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {ai.by_group.length === 0 && <tr><td className={td} colSpan={7}>ยังไม่มีการเรียก AI ในช่วงนี้</td></tr>}
                        {ai.by_group.map((g) => (
                          <tr key={`${g.feature}${g.model_name}${g.prompt_version}`}>
                            <td className={`${td} font-bold`}>{FEATURE_TH[g.feature] || g.feature}</td>
                            <td className={td}>{g.model_name}</td>
                            <td className={`${td} font-mono`}>{g.prompt_version}</td>
                            <td className={td}>{num(g.calls)}</td>
                            <td className={td}>{pct(g.success_rate)}</td>
                            <td className={td}>{sec(g.median_latency_ms)}</td>
                            <td className={td}>{sec(g.p95_latency_ms)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`${card} space-y-3`}>
                  <h2 className="text-lg font-black">การเรียกล่าสุด (50 ครั้ง)</h2>
                  <div className="overflow-x-auto -mx-2">
                    <table className="min-w-full">
                      <thead><tr>{['เวลา', 'งาน', 'โมเดล', 'ใช้เวลา', 'ผล'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {ai.recent.map((r) => (
                          <tr key={r.id} className={r.success ? '' : 'bg-rose-50'}>
                            <td className={td}>{new Date(r.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td className={td}>
                              {FEATURE_TH[r.feature] || r.feature}
                              {r.is_eval_run && <span className="ml-1 text-xs px-1 border border-stone-400 text-stone-500">ทดสอบ</span>}
                            </td>
                            <td className={td}>{r.model_name}</td>
                            <td className={td}>{sec(r.latency_ms)}</td>
                            <td className={`${td} max-w-[260px] truncate`} title={r.error_message || ''}>
                              {r.success ? '✓' : `✗ ${r.error_message || ''}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
