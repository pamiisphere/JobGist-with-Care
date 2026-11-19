'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { CandidateCaregiverCard, CASE_TYPES_V3, CARE_ROLES_META } from '@/types/database';
import {
  candidateCaregivers,
  swipeCaregiver,
  toggleFavorite,
  getCurrentUser,
  setCurrentUser,
  initSeedData,
  getNameInitial,
  getEffectiveFamilyJob,
} from '@/services/api';
import { useToast } from '@/components/Toast';
import {
  HeartIcon,
  CloseIcon,
  SparklesIcon,
  StarIcon,
  CheckIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  MapPinIcon,
} from '@/components/Icons';

function ApplicantsContent() {
  const searchParams = useSearchParams();
  const cur = getCurrentUser();
  const effJob = getEffectiveFamilyJob(cur.role === 'family' ? cur.id : undefined);
  const jobId = searchParams.get('jobId') || effJob.id;
  const caregiverParam = searchParams.get('caregiverId') || undefined;

  const [currentUser, setCurrentUserState] = useState(() => {
    initSeedData();
    const cur = getCurrentUser();
    if (cur.role !== 'family' && !cur.id.startsWith('fam-')) {
      const famSession = {
        id: 'fam-1-wanwimon',
        role: 'family' as const,
        display_name: 'คุณวรรณวิมล วัฒนกุล',
        phone: '0829991122',
        line_id: 'wanwimon_family',
      };
      setCurrentUser(famSession);
      return famSession;
    }
    return cur;
  });

  const [mounted, setMounted] = useState(false);
  const [candidates, setCandidates] = useState<CandidateCaregiverCard[]>(() => {
    initSeedData();
    return candidateCaregivers(jobId, 50, caregiverParam);
  });

  React.useEffect(() => {
    initSeedData();
    const cur = getCurrentUser();
    if (cur.role !== 'family' && !cur.id.startsWith('fam-')) {
      const famSession = {
        id: 'fam-1-wanwimon',
        role: 'family' as const,
        display_name: 'คุณวรรณวิมล วัฒนกุล',
        phone: '0829991122',
        line_id: 'wanwimon_family',
      };
      setCurrentUser(famSession);
      setCurrentUserState(famSession);
    }
    setMounted(true);
    setCandidates(candidateCaregivers(jobId, 50, caregiverParam));
    // LIVE: AI summaries / new candidates arrive after the first render
    const reload = () => setCandidates(candidateCaregivers(jobId, 50, caregiverParam));
    window.addEventListener('jg_data_reset', reload);
    return () => window.removeEventListener('jg_data_reset', reload);
  }, [jobId, caregiverParam]);

  const { showToast } = useToast();
  const [matchCelebration, setMatchCelebration] = useState<{
    show: boolean;
    candidate: CandidateCaregiverCard | null;
  }>({ show: false, candidate: null });

  // Swipe Gesture State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeExit, setSwipeExit] = useState<'left' | 'right' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const currentCandidate = candidates[0] || null;
  const nextCandidate = candidates[1] || null;

  // Handle Decision (Swipe Like or Pass)
  const handleDecision = (candidate: CandidateCaregiverCard, decision: 'like' | 'pass') => {
    if (swipeExit) return;

    setSwipeExit(decision === 'like' ? 'right' : 'left');

    setTimeout(() => {
      const { isMatch } = swipeCaregiver(jobId, candidate.caregiver_id, decision);

      // ถ้าปัดขวาแล้ว match ถึงจะแสดง Match Celebration
      // ถ้ายังไม่ match ให้ปัดผ่านไปอย่างเงียบๆ และลื่นไหล ไม่ต้องเด้งข้อความแจ้งเตือนใดๆ
      if (decision === 'like' && isMatch) {
        setMatchCelebration({ show: true, candidate });
        showToast('จับคู่สำเร็จ!', `คุณและ ${candidate.display_name} กดถูกใจตรงกันแล้ว`, 'match');
      }

      // Remove decided candidate cleanly by ID
      setCandidates((prev) => prev.filter((c) => c.caregiver_id !== candidate.caregiver_id));
      setDragOffset({ x: 0, y: 0 });
      setSwipeExit(null);
      setIsDragging(false);
    }, 240);
  };

  const handleToggleFavorite = (candidateId: string) => {
    const curUser = getCurrentUser();
    const effectiveFamilyId = curUser.role === 'family' ? curUser.id : effJob.family_id;
    const isFav = toggleFavorite(effectiveFamilyId, candidateId);
    setCandidates((prev) =>
      prev.map((c) => (c.caregiver_id === candidateId ? { ...c, is_favorite: isFav } : c))
    );
  };

  // Touch and Mouse Drag Gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentCandidate || swipeExit) return;
    // Don't drag if clicking buttons or interactive elements
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !currentCandidate || swipeExit) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = (e.clientY - dragStartRef.current.y) * 0.2;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handlePointerUp = () => {
    if (!isDragging || !currentCandidate || swipeExit) return;
    setIsDragging(false);

    const threshold = 60; // 60px threshold for easy swipe in both directions
    if (dragOffset.x > threshold) {
      handleDecision(currentCandidate, 'like');
    } else if (dragOffset.x < -threshold) {
      handleDecision(currentCandidate, 'pass');
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
                RPC CANDIDATE_CAREGIVERS • COST-FIRST AI
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                หาผู้ดูแลที่ตรงใจ (Swipe UI)
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                ปัดซ้ายเพื่อข้าม • ปัดขวาเพื่อถูกใจ คัดเลือกจากคะแนน Fit Score และทักษะที่ตรงกับคุณ
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs px-3 py-1.5 bg-[#FAF9F6] border-2 border-indigo-950 font-bold" suppressHydrationWarning>
                เหลือ {candidates.length} คน
              </span>
            </div>
          </div>

          {/* Swipe Container Stack */}
          {currentCandidate ? (
            <div className="relative w-full min-h-[640px]">
              {/* Background Card Preview (Next Candidate) */}
              {nextCandidate && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="w-full h-full min-h-[640px] bg-white border-2 border-indigo-950 p-6 riso-shadow flex flex-col justify-between opacity-95">
                    <div className="space-y-4">
                      {/* Top Row: Liked by Caregiver Banner */}
                      {nextCandidate.caregiver_liked && (
                        <div className="bg-pink-100 border border-[#D946EF] px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-pink-950 -mt-2">
                          <span className="flex items-center gap-1 font-mono">
                            <SparklesIcon className="w-3.5 h-3.5 text-[#D946EF]" />
                            ผู้ดูแลท่านนี้เคยกดสนใจงานคุณแล้ว! ปัดขวาเพื่อ Match ทันที
                          </span>
                          <span className="font-mono text-[9px] bg-[#D946EF] text-white px-1.5 py-0.5">
                            MUTUAL READY
                          </span>
                        </div>
                      )}

                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-indigo-950 pb-4 gap-4">
                        <div className="flex items-start gap-4">
                          {nextCandidate.avatar_url ? (
                            <img
                              src={nextCandidate.avatar_url}
                              alt={nextCandidate.display_name}
                              className="w-28 h-28 sm:w-32 sm:h-32 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm"
                            />
                          ) : (
                            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-indigo-950 text-white font-mono font-black text-4xl sm:text-5xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                              {getNameInitial(nextCandidate.display_name, 'ผ')}
                            </div>
                          )}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl sm:text-3xl font-black text-indigo-950 leading-tight">
                                {nextCandidate.display_name}
                              </h3>
                              {nextCandidate.gender && (
                                <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                                  {nextCandidate.gender === 'female' ? 'เพศหญิง' : 'เพศชาย'}
                                </span>
                              )}
                              {typeof nextCandidate.age === 'number' && nextCandidate.age > 0 && (
                                <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                                  อายุ {nextCandidate.age} ปี
                                </span>
                              )}
                            </div>
                            <p className="text-sm sm:text-base font-bold text-stone-800 leading-snug">
                              {nextCandidate.care_roles.map((r) => CARE_ROLES_META[r]?.label_th || r).join(' • ')}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-stone-600 pt-0.5">
                              <span>ประสบการณ์ {nextCandidate.years_experience} ปี</span>
                              <span>•</span>
                              <span>เขต{nextCandidate.home_district} (ห่าง {nextCandidate.distance_km} กม.)</span>
                            </div>
                          </div>
                        </div>

                        {/* Fit Score Badge */}
                        <div className="bg-[#FAF9F6] border-2 border-indigo-950 px-3 py-1 text-center shrink-0">
                          <span className="text-[9px] font-mono text-stone-500 block uppercase leading-tight">AI Fit Score</span>
                          <span className="text-lg sm:text-xl font-mono font-black text-[#D946EF] block leading-none">
                            {nextCandidate.fit_score}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dummy Action Circle Buttons (Bottom Corners) */}
                    <div className="flex items-center justify-between border-t-2 border-indigo-950 pt-4 px-2">
                      <div className="w-12 h-12 rounded-full bg-white text-stone-600 border-2 border-indigo-950 flex items-center justify-center riso-shadow-sm">
                        <CloseIcon className="w-6 h-6 text-stone-600" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#10B981] text-white border-2 border-indigo-950 flex items-center justify-center riso-shadow-sm">
                        <CheckIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Foreground Card with Swipe Gestures */}
              <div
                key={currentCandidate.caregiver_id}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  transform: swipeExit
                    ? `translate3d(${swipeExit === 'right' ? '120vw' : '-120vw'}, ${dragOffset.y}px, 0) rotate(${
                        swipeExit === 'right' ? 25 : -25
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
                {/* Stamp Overlays */}
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
                  {/* Highlight Badge if Caregiver Liked First */}
                  {currentCandidate.caregiver_liked && (
                    <div className="bg-pink-100 border border-[#D946EF] px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-pink-950 -mt-2">
                      <span className="flex items-center gap-1 font-mono">
                        <SparklesIcon className="w-3.5 h-3.5 text-[#D946EF]" />
                        ผู้ดูแลท่านนี้เคยกดสนใจงานคุณแล้ว! ปัดขวาเพื่อ Match ทันที
                      </span>
                      <span className="font-mono text-[9px] bg-[#D946EF] text-white px-1.5 py-0.5">
                        MUTUAL READY
                      </span>
                    </div>
                  )}

                  {/* Top Row: Name, Avatar, Wage & Fit Score */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-indigo-950 pb-4 gap-4">
                    <div className="flex items-start gap-4">
                      {currentCandidate.avatar_url ? (
                        <img
                          src={currentCandidate.avatar_url}
                          alt={currentCandidate.display_name}
                          draggable={false}
                          className="w-28 h-28 sm:w-32 sm:h-32 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm pointer-events-none select-none"
                        />
                      ) : (
                        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-indigo-950 text-white font-mono font-black text-4xl sm:text-5xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                          {getNameInitial(currentCandidate.display_name, 'ผ')}
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 leading-tight">
                            {currentCandidate.display_name}
                          </h2>
                          {currentCandidate.gender && (
                            <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                              {currentCandidate.gender === 'female' ? 'เพศหญิง' : 'เพศชาย'}
                            </span>
                          )}
                          {typeof currentCandidate.age === 'number' && currentCandidate.age > 0 && (
                            <span className="px-1.5 py-0.5 bg-stone-100 border border-indigo-950 text-[10px] sm:text-xs font-mono font-bold">
                              อายุ {currentCandidate.age} ปี
                            </span>
                          )}
                          {currentCandidate.certificates.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-900 text-[10px] sm:text-xs font-bold flex items-center gap-1">
                              <ShieldCheckIcon className="w-3.5 h-3.5" />
                              มีใบรับรอง ({currentCandidate.certificates.length})
                            </span>
                          )}
                        </div>

                        <p className="text-sm sm:text-base font-bold text-stone-800 leading-snug">
                          {currentCandidate.care_roles.map((r) => CARE_ROLES_META[r]?.label_th || r).join(' • ')}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-stone-600 pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <BriefcaseIcon className="w-4 h-4 text-stone-600 shrink-0" />
                            ประสบการณ์ {currentCandidate.years_experience} ปี
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <MapPinIcon className="w-4 h-4 text-stone-600 shrink-0" />
                            เขต{currentCandidate.home_district} (ห่าง {currentCandidate.distance_km} กม.)
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
                            {currentCandidate.fit_score}%
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-mono font-black text-indigo-950 block leading-tight">
                            ฿{currentCandidate.expected_wage_min.toLocaleString()} - {currentCandidate.expected_wage_max.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            /{currentCandidate.wage_unit === 'month' ? 'เดือน' : currentCandidate.wage_unit === 'day' ? 'วัน' : 'ชม.'} (
                            {currentCandidate.work_arrangements.map((a) => (a === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ')).join('/')})
                          </span>
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(currentCandidate.caregiver_id);
                        }}
                        className={`mt-1 sm:self-end inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-bold border-2 border-indigo-950 riso-shadow-sm riso-btn-active cursor-pointer transition-all ${
                          currentCandidate.is_favorite
                            ? 'bg-indigo-950 text-white'
                            : 'bg-white text-indigo-950 hover:bg-stone-50'
                        }`}
                      >
                        <StarIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            currentCandidate.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-stone-400'
                          }`}
                        />
                        <span>{currentCandidate.is_favorite ? 'เพิ่มในรายการโปรดแล้ว' : 'เพิ่มลงรายการโปรด'}</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Fit Analysis & Narrative */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                      บทวิเคราะห์ความเหมาะสม (AI FIT ANALYSIS):
                    </span>
                    <p className="text-xs sm:text-sm text-stone-800 leading-relaxed bg-[#FAF9F6] border border-indigo-950 p-3.5">
                      {currentCandidate.ai_summary}
                    </p>
                  </div>

                  {/* Key Strengths (ข้อดีที่ตรงกับงานนี้) */}
                  {currentCandidate.pros && currentCandidate.pros.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-mono font-bold text-emerald-800 flex items-center gap-1">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                        ข้อดีที่ตรงกับเคสนี้:
                      </span>
                      <div className="space-y-1">
                        {currentCandidate.pros.map((pos, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-emerald-50 border border-emerald-700 text-emerald-950 px-2.5 py-1 font-medium"
                          >
                            ✓ {pos}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matched Case Badges */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold text-indigo-950 block">
                      ทักษะการดูแลที่ตรงกัน ({currentCandidate.matched_cases.length} ข้อ):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentCandidate.matched_cases.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 text-xs font-bold bg-[#FAF9F6] border border-indigo-950 text-indigo-950 flex items-center gap-1"
                        >
                          <CheckIcon className="w-3 h-3 text-emerald-700" />
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
                        handleDecision(currentCandidate, 'pass');
                      }}
                      title="ข้ามผู้ดูแลคนนี้ (Pass)"
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
                        handleDecision(currentCandidate, 'like');
                      }}
                      title="สนใจผู้ดูแลคนนี้ (Like)"
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
              <h3 className="text-xl font-bold text-indigo-950">ดูรายชื่อผู้สมัครครบแล้ว</h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                คุณได้พิจารณาผู้ดูแลทั้งหมดที่ตรงกับความต้องการแล้ว ระบบจะแจ้งเตือนเมื่อมีผู้ดูแลท่านใหม่ลงทะเบียนหรือกดสนใจงานของคุณ
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/matches"
                  className="min-h-[44px] px-5 py-2.5 bg-indigo-950 text-white font-bold text-xs border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065] flex items-center gap-2"
                >
                  <span>ไปดูรายการที่จับคู่สำเร็จ (ศูนย์การจับคู่)</span>
                  <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
                </Link>
              </div>
            </div>
          )}

          {/* Mutual Match Celebration Modal */}
          {matchCelebration.show && matchCelebration.candidate && (
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
                    คุณและ <strong>{matchCelebration.candidate.display_name}</strong> ได้กดถูกใจซึ่งกันและกันแล้ว
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
                    onClick={() => setMatchCelebration({ show: false, candidate: null })}
                    className="min-h-[44px] px-4 py-2 bg-white text-indigo-950 font-bold text-xs border border-indigo-950 hover:bg-stone-50"
                  >
                    ไว้ดูภายหลัง (ดูผู้ดูแลคนถัดไป)
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

export default function ApplicantsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
          <Topbar />
          <div className="flex-1 p-8 text-center font-mono">กำลังโหลดรายชื่อผู้สมัคร...</div>
          <Footer />
        </div>
      }
    >
      <ApplicantsContent />
    </Suspense>
  );
}
