'use client';

/**
 * Admin: AI usage from ai_logs — calls, tokens, cost, cost per usable output, latency, errors.
 * Data comes from the backend (/admin/ai-stats); only emails in ADMIN_EMAILS on Render can see it.
 */
import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { adminAiStats, AiStats } from '@/services/live';

const FEATURE_TH: Record<string, string> = {
  worker_profile: 'โปรไฟล์ผู้ดูแล',
  applicant_summary: 'สรุปผู้สมัคร',
  location_pin: 'ปักหมุด',
  other: 'อื่นๆ',
};
const thb = (x: number | null | undefined, d = 4) => (x == null ? '-' : `฿${Number(x).toFixed(d)}`);
const num = (x: number | null | undefined) => (x == null ? '-' : x.toLocaleString());
const pct = (x: number | null | undefined) => (x == null ? '-' : `${Math.round(x * 100)}%`);

export default function AdminPage() {
  const [days, setDays] = useState(30);
  const [includeEval, setIncludeEval] = useState(false);
  const [data, setData] = useState<AiStats | null>(null);
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
    adminAiStats(days, includeEval, login)
      .then((d) => { if (alive) { setData(d); setErr(''); } })
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
    setData(null);
  };

  const maxDayCost = Math.max(0.000001, ...(data?.by_day.map((d) => d.cost_thb) || [0]));
  const card = 'bg-white border-2 border-indigo-950 riso-shadow p-4 sm:p-5';
  const th = 'text-left text-xs font-bold text-stone-600 px-2 py-2 whitespace-nowrap';
  const td = 'text-sm px-2 py-2 whitespace-nowrap border-t border-stone-200';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Admin: การใช้งาน AI</h1>
            <p className="text-sm text-stone-600">ข้อมูลจากตาราง ai_logs ทุกครั้งที่ระบบเรียก LLM</p>
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
            <label className="flex items-center gap-2 text-sm font-bold min-h-[44px] px-2">
              <input type="checkbox" className="w-5 h-5" checked={includeEval} onChange={(e) => { setLoading(true); setIncludeEval(e.target.checked); }} />
              รวมการทดสอบ (AI Lab / eval)
            </label>
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
        {login && (
          <button onClick={signOut} className="min-h-[40px] px-3 text-sm font-bold bg-white border-2 border-indigo-950">ออกจากระบบ admin</button>
        )}
        {loading && <p className="text-sm font-bold">กำลังโหลด... (ถ้า server หลับอยู่อาจรอ 30-50 วินาที)</p>}
        {err && <p className="text-sm text-rose-800 bg-rose-50 border-2 border-rose-700 p-3">{err}</p>}

        {login && data && !err && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l: 'จำนวนครั้งที่เรียก AI', v: num(data.totals.calls), s: `สำเร็จ ${pct(data.totals.success_rate)}` },
                { l: 'ค่าใช้จ่ายรวม', v: thb(data.totals.cost_thb, 2), s: `${data.days} วันล่าสุด` },
                { l: 'ค่าใช้จ่ายต่อผลลัพธ์', v: thb(data.totals.cost_per_output_thb), s: 'ค่าใช้จ่ายรวม ÷ ครั้งที่สำเร็จ' },
                { l: 'เวลาเฉลี่ย', v: data.totals.avg_latency_ms == null ? '-' : `${(data.totals.avg_latency_ms / 1000).toFixed(1)} วิ`, s: `โทเค็น ${num(data.totals.tokens_in)} in / ${num(data.totals.tokens_out)} out` },
              ].map((c) => (
                <div key={c.l} className={card}>
                  <p className="text-xs font-bold text-stone-600">{c.l}</p>
                  <p className="text-2xl sm:text-3xl font-black text-[#D946EF] break-words">{c.v}</p>
                  <p className="text-xs text-stone-500">{c.s}</p>
                </div>
              ))}
            </section>
            {!includeEval && data.eval_calls_hidden > 0 && (
              <p className="text-xs text-stone-500">ซ่อนการเรียกเพื่อทดสอบ {data.eval_calls_hidden} ครั้ง (ติ๊ก &ldquo;รวมการทดสอบ&rdquo; เพื่อดู)</p>
            )}

            <section className={`${card} space-y-3`}>
              <h2 className="text-lg font-black">ค่าใช้จ่ายรายวัน</h2>
              {data.by_day.length === 0 ? (
                <p className="text-sm text-stone-500">ยังไม่มีการเรียก AI ในช่วงนี้</p>
              ) : (
                <div className="space-y-1.5">
                  {data.by_day.map((d) => (
                    <div key={d.date} className="flex items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 font-mono">{d.date.slice(5)}</span>
                      <div className="flex-1 h-5 bg-stone-100 border border-indigo-950">
                        <div className="h-full bg-[#D946EF]" style={{ width: `${(d.cost_thb / maxDayCost) * 100}%` }} />
                      </div>
                      <span className="w-28 shrink-0 text-right">{thb(d.cost_thb, 3)} · {d.calls}×</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={`${card} space-y-3`}>
              <h2 className="text-lg font-black">แยกตามงาน / โมเดล / prompt version</h2>
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {['งาน', 'โมเดล', 'prompt', 'ครั้ง', 'สำเร็จ', 'โทเค็น in/out', 'รวม', 'ต่อผลลัพธ์', 'เวลาเฉลี่ย'].map((h) => <th key={h} className={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_group.map((g) => (
                      <tr key={`${g.feature}${g.model_name}${g.prompt_version}`}>
                        <td className={`${td} font-bold`}>{FEATURE_TH[g.feature] || g.feature}</td>
                        <td className={td}>{g.model_name}</td>
                        <td className={`${td} font-mono`}>{g.prompt_version}</td>
                        <td className={td}>{num(g.calls)}</td>
                        <td className={td}>{pct(g.success_rate)}</td>
                        <td className={td}>{num(g.tokens_in)} / {num(g.tokens_out)}</td>
                        <td className={td}>{thb(g.cost_thb, 3)}</td>
                        <td className={`${td} font-bold`}>{thb(g.cost_per_output_thb, 5)}</td>
                        <td className={td}>{g.avg_latency_ms == null ? '-' : `${(g.avg_latency_ms / 1000).toFixed(1)} วิ`}</td>
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
                  <thead>
                    <tr>
                      {['เวลา', 'งาน', 'โมเดล', 'โทเค็น', 'ค่าใช้จ่าย', 'เวลา', 'ผล'].map((h, i) => <th key={i} className={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id} className={r.success ? '' : 'bg-rose-50'}>
                        <td className={td}>{new Date(r.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className={td}>
                          {FEATURE_TH[r.feature] || r.feature}
                          {r.is_eval_run && <span className="ml-1 text-xs px-1 border border-stone-400 text-stone-500">ทดสอบ</span>}
                        </td>
                        <td className={td}>{r.model_name}</td>
                        <td className={td}>{num(r.input_tokens)} / {num(r.output_tokens)}</td>
                        <td className={td}>{thb(r.cost_thb, 5)}</td>
                        <td className={td}>{r.latency_ms == null ? '-' : `${(r.latency_ms / 1000).toFixed(1)} วิ`}</td>
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
      </main>
      <Footer />
    </div>
  );
}
