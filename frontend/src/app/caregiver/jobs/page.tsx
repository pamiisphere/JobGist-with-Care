'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { JobFeedCard, CASE_TYPES_V3 } from '@/types/database';
import {
  jobFeedForMe,
  swipeJob,
  getCurrentUser,
  setCurrentUser,
  initSeedData,
  toggleFavoriteJob,
  getNameInitial,
} from '@/services/api';
import { useToast } from '@/components/Toast';
import {
  HeartIcon,
  CloseIcon,
  SparklesIcon,
  CheckIcon,
  ChevronRightIcon,
  StarIcon,
  ShieldCheckIcon,
  MapPinIcon,
  BriefcaseIcon,
} from '@/components/Icons';

function CaregiverJobsFeedContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const jobParam = searchParams.get('jobId') || undefined;

  const [currentUser, setCurrentUserState] = useState(() => {
    initSeedData();
    const cur = getCurrentUser();
    if (cur.role !== 'caregiver' && !cur.id.startsWith('cg-')) {
      const cgSession = {
        id: 'cg-1-wimon',
        role: 'caregiver' as const,
        display_name: 'คุณวิมล ชัยชนะ (PN)',
        phone: '0814567890',
        line_id: 'wimon_care_pn',
      };
      setCurrentUser(cgSession);
      return cgSession;
    }
    return cur;
  });
  const [maxKm, setMaxKm] = useState(100);

  const [jobs, setJobs] = useState<JobFeedCard[]>(() => {
    initSeedData();
    const cur = getCurrentUser();
    const id = cur.role === 'caregiver' ? cur.id : 'cg-1-wimon';
    return jobFeedForMe(id, 100, jobParam);
  });

  React.useEffect(() => {
    initSeedData();
    const cur = getCurrentUser();
    if (cur.role !== 'caregiver' && !cur.id.startsWith('cg-')) {
      const cgSession = {
        id: 'cg-1-wimon',
        role: 'caregiver' as const,
        display_name: 'คุณวิมล ชัยชนะ (PN)',
        phone: '0814567890',
        line_id: 'wimon_care_pn',
      };
      setCurrentUser(cgSession);
      setCurrentUserState(cgSession);
    }
    const activeCur = getCurrentUser();
    const id = activeCur.role === 'caregiver' ? activeCur.id : 'cg-1-wimon';
    setJobs(jobFeedForMe(id, maxKm, jobParam));
  }, [jobParam, maxKm]);
  const [matchCelebration, setMatchCelebration] = useState<{
    show: boolean;
    job: JobFeedCard | null;
  }>({ show: false, job: null });

  // Tinder Swipe Gesture State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeExit, setSwipeExit] = useState<'left' | 'right' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const currentJob = jobs[0] || null;
  const nextJob = jobs[1] || null;

  const handleKmChange = (newKm: number) => {
    setMaxKm(newKm);
    const id = currentUser.role === 'caregiver' ? currentUser.id : 'cg-1-wimon';
    setJobs(jobFeedForMe(id, newKm, jobParam));
    setDragOffset({ x: 0, y: 0 });
    setSwipeExit(null);
  };

  const handleDecision = (job: JobFeedCard, decision: 'like' | 'pass') => {
    if (swipeExit) return;

    setSwipeExit(decision === 'like' ? 'right' : 'left');

    setTimeout(() => {
      const caregiverId = currentUser.role === 'caregiver' ? currentUser.id : 'cg-1-wimon';
      const { isMatch } = swipeJob(job.job_post_id, caregiverId, decision);

      if (decision === 'like' && isMatch) {
        setMatchCelebration({ show: true, job });
      }

      setJobs((prev) => prev.filter((j) => j.job_post_id !== job.job_post_id));
      setDragOffset({ x: 0, y: 0 });
      setSwipeExit(null);
    }, 280);
  };

  const handleToggleFavorite = (jobId: string) => {
    const curUser = getCurrentUser();
    const caregiverId = curUser.role === 'caregiver' ? curUser.id : (curUser.id.startsWith('cg-') ? curUser.id : 'cg-1-wimon');
    const isFav = toggleFavoriteJob(caregiverId, jobId);
    setJobs((prev) =>
      prev.map((j) => (j.job_post_id === jobId ? { ...j, is_favorite: isFav } : j))
    );
  };

  // Touch and Mouse Event Handlers for Swipe
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentJob || swipeExit) return;
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !currentJob || swipeExit) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = (e.clientY - dragStartRef.current.y) * 0.3;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (!isDragging || !currentJob || swipeExit) return;
    setIsDragging(false);

    const threshold = 60;
    if (dragOffset.x > threshold) {
      handleDecision(currentJob, 'like');
    } else if (dragOffset.x < -threshold) {
      handleDecision(currentJob, 'pass');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B] overflow-x-hidden">
      <Topbar />

      <div className="flex-1 bg-[#735095] py-8 px-4 overflow-hidden">
        <main className="max-w-4xl mx-auto w-full space-y-6">
          {/* Header Bar */}
          <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
                RPC JOB_FEED • COST-FIRST AI
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                หางานดูแลที่ตรงใจ (Swipe UI)
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                ปัดซ้ายเพื่อข้าม • ปัดขวาเพื่อสนใจงาน คัดกรองเฉพาะงานที่ตรงกับทักษะและระยะทางที่คุณตั้งไว้
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs px-3 py-1.5 bg-[#FAF9F6] border-2 border-indigo-950 font-bold" suppressHydrationWarning>
                เหลือ {jobs.length} คน
              </span>
            </div>
          </div>

          {/* Tinder Swipe Card Deck UI */}
          {currentJob ? (
            <div className="relative w-full max-w-4xl mx-auto min-h-[640px] select-none">
              {/* Background Card Preview (Next Job) */}
              {nextJob && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="w-full h-full min-h-[640px] bg-white border-2 border-indigo-950 p-6 riso-shadow flex flex-col justify-between opacity-95">
                    <div className="space-y-4">
                      {/* Highlight Badge if Family Liked First */}
                      {nextJob.family_liked && (
                        <div className="bg-pink-100 border border-[#D946EF] px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-pink-950 -mt-2">
                          <span className="flex items-center gap-1 font-mono">
                            <SparklesIcon className="w-3.5 h-3.5 text-[#D946EF]" />
                            ครอบครัวนี้เคยกดสนใจคุณแล้ว! ปัดขวาเพื่อ Match ทันที
                          </span>
                          <span className="font-mono text-[9px] bg-[#D946EF] text-white px-1.5 py-0.5">
                            MUTUAL READY
                          </span>
                        </div>
                      )}

                      {/* Top Row: Avatar, Name, Badges, Wage & Fit Score */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-indigo-950 pb-4 gap-4">
                        <div className="flex items-start gap-4">
                          {nextJob.family_avatar_url ? (
                            <img
                              src={nextJob.family_avatar_url}
                              alt={nextJob.family_name || 'คุณวรรณวิมล'}
                              className="w-28 h-28 sm:w-32 sm:h-32 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm"
                            />
                          ) : (
                            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-indigo-950 text-white font-mono font-black text-4xl sm:text-5xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                              {getNameInitial(nextJob.family_name || 'คุณวรรณวิมล', 'ว')}
                            </div>
                          )}

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-2xl sm:text-3xl font-black text-indigo-950 leading-tight">
                                {nextJob.family_name || 'คุณวรรณวิมล'}
                              </h3>
                              {nextJob.patient_gender && (
                                <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                                  {nextJob.patient_gender}
                                </span>
                              )}
                              {typeof nextJob.patient_age === 'number' && nextJob.patient_age > 0 && (
                                <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                                  อายุ {nextJob.patient_age} ปี
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {nextJob.preferred_caregiver_gender && (
                                <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                                  ต้องการผู้ดูแล: {nextJob.preferred_caregiver_gender === 'female' ? 'เพศหญิง' : 'ไม่จำกัดเพศ'}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                                {nextJob.work_arrangement === 'live_in' ? 'อยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'}
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-900 text-[10px] sm:text-xs font-bold flex items-center gap-1">
                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                ยืนยันตัวตนแล้ว
                              </span>
                            </div>

                            <div className="text-[11px] sm:text-xs font-medium text-stone-600 leading-relaxed">
                              <span className="font-bold text-stone-700 block mb-0.5">ต้องการผู้ดูแลเคส:</span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {nextJob.required_cases.map((c, idx) => (
                                  <span key={c} className="inline-flex items-center gap-1.5">
                                    <span>{CASE_TYPES_V3[c]?.title_th || c}</span>
                                    {idx < nextJob.required_cases.length - 1 && <span className="text-stone-300">•</span>}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-stone-600 pt-0.5">
                              <span className="flex items-center gap-1.5">
                                <BriefcaseIcon className="w-4 h-4 text-stone-600 shrink-0" />
                                ต้องการผู้ดูแล {nextJob.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1.5">
                                <MapPinIcon className="w-4 h-4 text-stone-600 shrink-0" />
                                เขต{nextJob.district}, {nextJob.province} (ห่าง {nextJob.distance_km} กม.)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Wage, Fit Score & Favorite Button */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                          <div className="flex sm:flex-col items-center sm:items-end gap-2">
                            <div className="bg-[#FAF9F6] border-2 border-indigo-950 px-3 py-1 text-center sm:text-right">
                              <span className="text-[9px] font-mono font-bold text-stone-600 block uppercase leading-tight">AI Fit Score</span>
                              <span className="text-lg sm:text-xl font-mono font-black text-[#D946EF] block leading-none">
                                {nextJob.fit_score ?? Math.round((nextJob.needs_i_can_do / (nextJob.needs_required || 1)) * 100)}%
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-mono font-black text-indigo-950 block leading-tight">
                                {nextJob.expected_wage ? `฿${nextJob.expected_wage.toLocaleString()}` : 'ตามตกลง'}
                              </span>
                              <span className="text-[10px] font-mono text-stone-500">
                                /{nextJob.wage_unit === 'month' ? 'เดือน' : nextJob.wage_unit === 'day' ? 'วัน' : 'ชม.'} (
                                {nextJob.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'})
                              </span>
                            </div>
                          </div>

                          {/* Favorite Button */}
                          <div
                            className={`mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-indigo-950 riso-shadow-sm ${nextJob.is_favorite
                              ? 'bg-indigo-950 text-white'
                              : 'bg-white text-indigo-950'
                              }`}
                          >
                            <StarIcon
                              className={`w-3.5 h-3.5 shrink-0 ${nextJob.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-stone-400'
                                }`}
                            />
                            <span>{nextJob.is_favorite ? 'เพิ่มในรายการโปรดแล้ว' : 'เพิ่มลงรายการโปรด'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Description */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                          บทวิเคราะห์ความเหมาะสม (AI FIT ANALYSIS):
                        </span>
                        <div className="bg-[#FAF9F6] border border-indigo-950 p-3.5 text-xs sm:text-sm text-stone-800 leading-relaxed font-sans">
                          “{nextJob.patient_description || 'ไม่มีรายละเอียดเพิ่มเติม'}”
                        </div>
                      </div>

                      {/* Key Strengths (ข้อดีที่ตรงกับเคสนี้) */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-800 flex items-center gap-1">
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                          ข้อดีที่ตรงกับเคสนี้:
                        </span>
                        <div className="space-y-1">
                          <div className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium">
                            ✓ ทักษะตรงกับที่คุณเชี่ยวชาญ: {nextJob.required_cases.map((c) => CASE_TYPES_V3[c]?.short_label_th || c).join(', ')} ({nextJob.needs_i_can_do}/{nextJob.needs_required} ข้อ)
                          </div>
                          <div className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium">
                            ✓ รูปแบบการทำงานตรงกัน: {nextJob.work_arrangement === 'live_in' ? 'พร้อมอยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'}
                          </div>
                          <div className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium">
                            ✓ ระยะทางใกล้เคียงเพียง {nextJob.distance_km} กม. ในเขต{nextJob.district}
                          </div>
                        </div>
                      </div>

                      {/* Required Cases Badges */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono font-bold text-indigo-950 block">
                          ทักษะการดูแลที่ตรงกัน ({nextJob.needs_i_can_do} ข้อ):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {nextJob.required_cases.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 text-xs font-bold bg-[#FAF9F6] border border-indigo-950 text-indigo-950 flex items-center gap-1"
                            >
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                              {CASE_TYPES_V3[c]?.title_th || c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dummy Action Circle Buttons */}
                    <div className="pt-3">
                      <div className="flex items-center justify-between border-t-2 border-indigo-950 pt-3 px-2">
                        <div className="w-12 h-12 rounded-full bg-white text-stone-600 border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center">
                          <CloseIcon className="w-6 h-6 shrink-0" />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#10B981] text-white border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center">
                          <CheckIcon className="w-6 h-6 shrink-0 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Foreground Card with Swipe Gestures */}
              <div
                key={currentJob.job_post_id}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  transform: swipeExit
                    ? `translate3d(${swipeExit === 'right' ? '120vw' : '-120vw'}, ${dragOffset.y}px, 0) rotate(${swipeExit === 'right' ? 25 : -25
                    }deg)`
                    : isDragging
                      ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.06}deg)`
                      : 'none',
                  transition: swipeExit
                    ? 'transform 0.22s ease-out'
                    : isDragging
                      ? 'none'
                      : 'none',
                  touchAction: 'none',
                }}
                className="relative z-10 w-full min-h-[640px] bg-white border-2 border-indigo-950 p-6 riso-shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
              >
                {/* Tinder Dynamic Stamp Overlays: LIKE / PASS */}
                {dragOffset.x > 35 && (
                  <div
                    style={{ opacity: Math.min(1, (dragOffset.x - 35) / 75) }}
                    className="absolute top-8 left-8 z-30 border-4 border-[#D946EF] text-[#D946EF] font-black text-2xl sm:text-3xl px-4 py-1.5 rotate-[-15deg] uppercase tracking-wider bg-white/90 riso-shadow pointer-events-none"
                  >
                    LIKE สนใจ ❤️
                  </div>
                )}
                {dragOffset.x < -35 && (
                  <div
                    style={{ opacity: Math.min(1, (-dragOffset.x - 35) / 75) }}
                    className="absolute top-8 right-8 z-30 border-4 border-stone-700 text-stone-700 font-black text-2xl sm:text-3xl px-4 py-1.5 rotate-[15deg] uppercase tracking-wider bg-white/90 riso-shadow pointer-events-none"
                  >
                    PASS ข้าม ✕
                  </div>
                )}

                <div className="space-y-4">
                  {/* Highlight Badge if Family Liked First */}
                  {currentJob.family_liked && (
                    <div className="bg-pink-100 border border-[#D946EF] px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-pink-950 -mt-2">
                      <span className="flex items-center gap-1 font-mono">
                        <SparklesIcon className="w-3.5 h-3.5 text-[#D946EF]" />
                        ครอบครัวนี้เคยกดสนใจคุณแล้ว! ปัดขวาเพื่อ Match ทันที
                      </span>
                      <span className="font-mono text-[9px] bg-[#D946EF] text-white px-1.5 py-0.5">
                        MUTUAL READY
                      </span>
                    </div>
                  )}

                  {/* Top Row: Avatar, Name, Badges, Wage, Fit Score & Favorite Button */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-indigo-950 pb-4 gap-4">
                    <div className="flex items-start gap-4">
                      {currentJob.family_avatar_url ? (
                        <img
                          src={currentJob.family_avatar_url}
                          alt={currentJob.family_name || 'คุณวรรณวิมล'}
                          draggable={false}
                          className="w-28 h-28 sm:w-32 sm:h-32 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm pointer-events-none select-none"
                        />
                      ) : (
                        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-indigo-950 text-white font-mono font-black text-4xl sm:text-5xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                          {getNameInitial(currentJob.family_name || 'คุณวรรณวิมล', 'ว')}
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 leading-tight">
                            {currentJob.family_name || 'คุณวรรณวิมล'}
                          </h2>
                          {currentJob.patient_gender && (
                            <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                              {currentJob.patient_gender}
                            </span>
                          )}
                          {typeof currentJob.patient_age === 'number' && currentJob.patient_age > 0 && (
                            <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                              อายุ {currentJob.patient_age} ปี
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {currentJob.preferred_caregiver_gender && (
                            <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                              ต้องการผู้ดูแล: {currentJob.preferred_caregiver_gender === 'female' ? 'เพศหญิง' : 'ไม่จำกัดเพศ'}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                            {currentJob.work_arrangement === 'live_in' ? 'อยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-900 text-[10px] sm:text-xs font-bold flex items-center gap-1">
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            ยืนยันตัวตนแล้ว
                          </span>
                        </div>

                        <div className="text-[11px] sm:text-xs font-medium text-stone-600 leading-relaxed">
                          <span className="font-bold text-stone-700 block mb-0.5">ต้องการผู้ดูแลเคส:</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {currentJob.required_cases.map((c, idx) => (
                              <span key={c} className="inline-flex items-center gap-1.5">
                                <span>{CASE_TYPES_V3[c]?.title_th || c}</span>
                                {idx < currentJob.required_cases.length - 1 && <span className="text-stone-300">•</span>}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-stone-600 pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <BriefcaseIcon className="w-4 h-4 text-stone-600 shrink-0" />
                            ต้องการผู้ดูแล {currentJob.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <MapPinIcon className="w-4 h-4 text-stone-600 shrink-0" />
                            เขต{currentJob.district}, {currentJob.province} (ห่าง {currentJob.distance_km} กม.)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Wage, Fit Score & Favorite Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="flex sm:flex-col items-center sm:items-end gap-2">
                        <div className="bg-[#FAF9F6] border-2 border-indigo-950 px-3 py-1 text-center sm:text-right">
                          <span className="text-[9px] font-mono font-bold text-stone-600 block uppercase leading-tight">AI Fit Score</span>
                          <span className="text-lg sm:text-xl font-mono font-black text-[#D946EF] block leading-none">
                            {currentJob.fit_score ?? Math.round((currentJob.needs_i_can_do / (currentJob.needs_required || 1)) * 100)}%
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-mono font-black text-indigo-950 block leading-tight">
                            {currentJob.expected_wage ? `฿${currentJob.expected_wage.toLocaleString()}` : 'ตามตกลง'}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            /{currentJob.wage_unit === 'month' ? 'เดือน' : currentJob.wage_unit === 'day' ? 'วัน' : 'ชม.'} (
                            {currentJob.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'})
                          </span>
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(currentJob.job_post_id);
                        }}
                        className={`mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-indigo-950 riso-shadow-sm riso-btn-active cursor-pointer transition-all ${currentJob.is_favorite
                          ? 'bg-indigo-950 text-white'
                          : 'bg-white text-indigo-950 hover:bg-stone-50'
                          }`}
                      >
                        <StarIcon
                          className={`w-3.5 h-3.5 shrink-0 ${currentJob.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-stone-400'
                            }`}
                        />
                        <span>{currentJob.is_favorite ? 'เพิ่มในรายการโปรดแล้ว' : 'เพิ่มลงรายการโปรด'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Patient Description / AI Fit Analysis */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                      บทวิเคราะห์ความเหมาะสม (AI FIT ANALYSIS):
                    </span>
                    <div className="bg-[#FAF9F6] border border-indigo-950 p-3.5 text-xs sm:text-sm text-stone-800 leading-relaxed font-sans">
                      “{currentJob.patient_description || 'ไม่มีรายละเอียดเพิ่มเติม'}”
                    </div>
                  </div>

                  {/* Key Strengths (ข้อดีที่ตรงกับเคสนี้) */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold text-emerald-800 flex items-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                      ข้อดีที่ตรงกับเคสนี้:
                    </span>
                    <div className="space-y-1">
                      <div className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium">
                        ✓ ทักษะตรงกับที่คุณเชี่ยวชาญ: {currentJob.required_cases.map((c) => CASE_TYPES_V3[c]?.short_label_th || c).join(', ')} ({currentJob.needs_i_can_do}/{currentJob.needs_required} ข้อ)
                      </div>
                      <div className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium">
                        ✓ รูปแบบการทำงานตรงกัน: {currentJob.work_arrangement === 'live_in' ? 'พร้อมอยู่ประจำ (Live-in)' : 'ไป-กลับ (Daily)'}
                      </div>
                      <div className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium">
                        ✓ ระยะทางใกล้เคียงเพียง {currentJob.distance_km} กม. ในเขต{currentJob.district}
                      </div>
                    </div>
                  </div>

                  {/* Required Cases Badges */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold text-indigo-950 block">
                      ทักษะการดูแลที่ตรงกัน ({currentJob.needs_i_can_do} ข้อ):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentJob.required_cases.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 text-xs font-bold bg-[#FAF9F6] border border-indigo-950 text-indigo-950 flex items-center gap-1"
                        >
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                          {CASE_TYPES_V3[c]?.title_th || c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions & Circle Buttons (Corner Left & Right) */}
                <div className="pt-3">
                  <div className="flex items-center justify-center text-[11px] font-mono text-stone-500 border-t border-stone-200 py-2">
                    <span>👈 ปัดซ้ายข้าม (Pass) | ปัดขวาถูกใจ (Like) 👉</span>
                  </div>

                  <div className="flex items-center justify-between border-t-2 border-indigo-950 pt-3 px-2">
                    {/* ขอบซ้ายล่าง: ปุ่มวงกลมกากบาท (ผิด/ข้าม) */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecision(currentJob, 'pass');
                      }}
                      title="ข้ามงานนี้ (Pass)"
                      aria-label="ข้าม"
                      className="w-12 h-12 rounded-full bg-white text-stone-600 hover:text-red-600 border-2 border-indigo-950 riso-shadow-sm riso-btn-active flex items-center justify-center cursor-pointer transition-all hover:border-red-600 hover:bg-red-50 z-20"
                    >
                      <CloseIcon className="w-6 h-6 shrink-0" />
                    </button>

                    <span className="text-[11px] font-mono text-stone-400">
                      คลิกปุ่มหรือลากการ์ดเพื่อตัดสินใจ
                    </span>

                    {/* ขอบขวาล่าง: ปุ่มวงกลมติ๊กถูก (ถูก/สนใจ) */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecision(currentJob, 'like');
                      }}
                      title="สนใจงานนี้ (Like)"
                      aria-label="สนใจ"
                      className="w-12 h-12 rounded-full bg-[#10B981] hover:bg-[#059669] text-white border-2 border-indigo-950 riso-shadow-sm riso-btn-active flex items-center justify-center cursor-pointer transition-all hover:scale-105 z-20"
                    >
                      <CheckIcon className="w-6 h-6 shrink-0 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-950 p-12 text-center riso-shadow-xl space-y-4">
              <div className="w-16 h-16 mx-auto bg-stone-100 border-2 border-indigo-950 flex items-center justify-center">
                <CheckIcon className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="text-xl font-bold text-indigo-950">ดูครบหมดแล้ว</h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                คุณได้ดูงานที่มีอยู่ในระบบครบแล้ว ระบบจะแจ้งเตือนเมื่อมีครอบครัวโพสต์งานใหม่เพิ่มขึ้น
              </p>
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
      </div>

      <Footer />
    </div>
  );
}

export default function CaregiverJobsFeedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
          <Topbar />
          <div className="flex-1 p-8 text-center font-mono">กำลังโหลดฟีดงาน...</div>
          <Footer />
        </div>
      }
    >
      <CaregiverJobsFeedContent />
    </Suspense>
  );
}
