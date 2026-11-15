'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { JobFeedCard, CASE_TYPES_V3 } from '@/types/database';
import { jobFeedForMe, swipeJob, getCurrentUser } from '@/services/api';
import {
  HeartIcon,
  CloseIcon,
  SparklesIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@/components/Icons';

export default function CaregiverJobsFeedPage() {
  const [currentUser] = useState(() => getCurrentUser());
  const [maxKm, setMaxKm] = useState(30);
  const [jobs, setJobs] = useState<JobFeedCard[]>(() => {
    const cur = getCurrentUser();
    const id = cur.role === 'caregiver' ? cur.id : 'cg-1-wimon';
    return jobFeedForMe(id, 30);
  });
  const [matchCelebration, setMatchCelebration] = useState<{
    show: boolean;
    job: JobFeedCard | null;
  }>({ show: false, job: null });
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleKmChange = (newKm: number) => {
    setMaxKm(newKm);
    const id = currentUser.role === 'caregiver' ? currentUser.id : 'cg-1-wimon';
    setJobs(jobFeedForMe(id, newKm));
  };

  const handleDecision = (job: JobFeedCard, decision: 'like' | 'pass') => {
    const caregiverId = currentUser.role === 'caregiver' ? currentUser.id : 'cg-1-wimon';
    const { isMatch } = swipeJob(job.job_post_id, caregiverId, decision);

    if (decision === 'like') {
      if (isMatch) {
        setMatchCelebration({ show: true, job });
      } else {
        setActionNotice(`บันทึกความสนใจงาน "${job.district}, ${job.province}" เรียบร้อยแล้ว`);
        setTimeout(() => setActionNotice(null), 2500);
      }
    } else {
      setActionNotice(`ข้ามงาน "${job.district}, ${job.province}" แล้ว`);
      setTimeout(() => setActionNotice(null), 2000);
    }

    // Remove from active cards
    setJobs((prev) => prev.filter((j) => j.job_post_id !== job.job_post_id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Header Bar */}
        <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
              RPC JOB_FEED_FOR_ME(P_MAX_KM)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
              ฟีดงานที่เหมาะกับคุณ (Swipe UI)
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              กรองงานเฉพาะที่มีทักษะตรงกับคุณ และอยู่ในระยะเดินทางที่สะดวก
            </p>
          </div>

          {/* Distance Filter Slider */}
          <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-3 shrink-0 space-y-1">
            <div className="flex items-center justify-between gap-4 text-xs font-mono">
              <span className="font-bold text-indigo-950">ระยะทางสูงสุด:</span>
              <span className="font-bold text-[#D946EF] bg-white px-2 py-0.5 border border-indigo-950">
                {maxKm} กม.
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxKm}
              onChange={(e) => handleKmChange(Number(e.target.value))}
              className="w-full accent-[#D946EF] cursor-pointer"
            />
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-3 bg-indigo-950 text-white font-mono text-xs font-bold text-center border-2 border-indigo-950 riso-shadow-sm animate-pulse">
            {actionNotice}
          </div>
        )}

        {/* Job Cards Feed */}
        {jobs.length > 0 ? (
          <div className="space-y-6">
            {jobs.map((job) => (
              <div
                key={job.job_post_id}
                className="bg-white border-2 border-indigo-950 p-6 riso-shadow-xl space-y-5 transition-transform hover:-translate-y-0.5"
              >
                {/* Highlight Badge if Family Liked First */}
                {job.family_liked && (
                  <div className="bg-pink-100 border-2 border-[#D946EF] px-3.5 py-2 flex items-center justify-between text-xs font-bold text-pink-950">
                    <span className="flex items-center gap-1.5 font-mono">
                      <SparklesIcon className="w-4 h-4 text-[#D946EF]" />
                      ★ ครอบครัวนี้เคยกดถูกใจคุณไว้แล้ว! หากคุณกดสนใจจะ Match ทันที
                    </span>
                    <span className="font-mono text-[10px] bg-[#D946EF] text-white px-1.5 py-0.5">
                      MUTUAL READY
                    </span>
                  </div>
                )}

                {/* Top Row: Location, Distance & Wage */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-indigo-950 pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-indigo-950">
                        {job.district}, {job.province}
                      </h2>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-950 border border-indigo-950 font-mono text-xs font-bold">
                        ห่าง {job.distance_km} กม.
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono text-stone-600">
                      <span className="px-2 py-0.5 bg-stone-100 border border-stone-300 font-bold">
                        {job.work_arrangement === 'live_in' ? 'อยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'}
                      </span>
                      <span>•</span>
                      <span>
                        ผู้ดูแล: {job.preferred_caregiver_gender === 'female' ? 'เพศหญิง' : 'ไม่จำกัดเพศ'}
                      </span>
                    </div>
                  </div>

                  {/* Wage Box */}
                  <div className="bg-[#FAF9F6] border-2 border-indigo-950 px-4 py-2.5 text-right sm:self-start shrink-0">
                    <span className="text-[10px] font-mono text-stone-500 block uppercase">งบประมาณ</span>
                    <span className="text-xl font-mono font-black text-[#D946EF] block">
                      {job.expected_wage ? `฿${job.expected_wage.toLocaleString()}` : 'ตามตกลง'}
                    </span>
                    <span className="text-xs font-mono text-stone-600">
                      /{job.wage_unit === 'month' ? 'เดือน' : job.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                    </span>
                  </div>
                </div>

                {/* Patient Description (Conversational Natural Language) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                    อาการและความต้องการของครอบครัว:
                  </span>
                  <p className="text-sm text-stone-800 leading-relaxed bg-[#FAF9F6] border border-indigo-950 p-4">
                    &ldquo;{job.patient_description}&rdquo;
                  </p>
                </div>

                {/* Required Cases & Skill Match Ratio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-indigo-950">
                      เคสที่ต้องการ (ทักษะของคุณตรง {job.needs_i_can_do}/{job.needs_required} ข้อ)
                    </span>
                    <span className="text-xs font-mono font-bold text-[#D946EF]">
                      {Math.round((job.needs_i_can_do / (job.needs_required || 1)) * 100)}% Match
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {job.required_cases.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-indigo-950 text-indigo-950 flex items-center gap-1 riso-shadow-sm"
                      >
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                        {CASE_TYPES_V3[c]?.title_th || c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tactile Swipe Buttons (Pass vs Like) */}
                <div className="grid grid-cols-2 gap-4 border-t-2 border-indigo-950 pt-5">
                  <button
                    type="button"
                    onClick={() => handleDecision(job, 'pass')}
                    className="min-h-[52px] bg-white text-stone-700 border-2 border-indigo-950 font-black text-sm hover:bg-stone-50 riso-shadow riso-btn-active flex items-center justify-center gap-2 transition-all"
                  >
                    <CloseIcon className="w-5 h-5 text-stone-500" />
                    <span>ข้ามงานนี้ (Pass)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision(job, 'like')}
                    className="min-h-[52px] bg-[#D946EF] text-white border-2 border-indigo-950 font-black text-sm hover:bg-[#c026d3] riso-shadow-lg riso-btn-active flex items-center justify-center gap-2 transition-all"
                  >
                    <HeartIcon className="w-5 h-5 text-white" />
                    <span>สนใจงานนี้ (Like)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-indigo-950 p-12 text-center riso-shadow-xl space-y-4">
            <div className="w-16 h-16 mx-auto bg-stone-100 border-2 border-indigo-950 flex items-center justify-center">
              <CheckIcon className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-xl font-bold text-indigo-950">ดูงานครบทุกงานในรัศมีแล้ว</h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
              คุณได้ดูงานในรัศมี {maxKm} กม. ครบแล้ว ลองปรับขยายระยะทางเดินทาง หรือกลับมาดูใหม่เมื่อมีครอบครัวโพสต์งานเพิ่ม
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleKmChange(50)}
                className="min-h-[44px] px-5 py-2 bg-indigo-950 text-white font-bold text-xs border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065]"
              >
                ขยายระยะเป็น 50 กม.
              </button>
            </div>
          </div>
        )}

        {/* Mutual Match Celebration Modal */}
        {matchCelebration.show && matchCelebration.job && (
          <div className="fixed inset-0 bg-indigo-950/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-indigo-950 p-6 sm:p-8 max-w-md w-full riso-shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-20 h-20 mx-auto bg-[#D946EF] text-white flex items-center justify-center border-2 border-indigo-950 riso-shadow-lg">
                <HeartIcon className="w-10 h-10 animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D946EF]">
                  IT&apos;S A MATCH!
                </span>
                <h3 className="text-2xl font-black text-indigo-950">จับคู่สำเร็จแล้ว!</h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  คุณและครอบครัวในเขต <strong>{matchCelebration.job.district}</strong> ได้กดถูกใจซึ่งกันและกันแล้ว
                  ระบบปลดล็อกข้อมูลติดต่อ (เบอร์โทรและ LINE) ให้เรียบร้อย
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href="/matches"
                  className="min-h-[48px] px-6 py-3 bg-indigo-950 text-white font-black text-sm border-2 border-indigo-950 riso-shadow hover:bg-[#2E1065] flex items-center justify-center gap-2"
                >
                  <span>เปิดดูข้อมูลติดต่อทันที (Matches Center)</span>
                  <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
                </Link>

                <button
                  type="button"
                  onClick={() => setMatchCelebration({ show: false, job: null })}
                  className="min-h-[44px] px-4 py-2 bg-white text-indigo-950 font-bold text-xs border border-indigo-950 hover:bg-stone-50"
                >
                  ไว้ดูภายหลัง (ดูงานอื่นต่อ)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
