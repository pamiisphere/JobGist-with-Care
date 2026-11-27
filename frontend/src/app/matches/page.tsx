'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  getCurrentUser,
  setCurrentUser as persistCurrentUser,
  getAllActiveMatchesForUser,
  getMatchContact,
  getNotifications,
  markNotificationRead,
  deleteNotification,
  submitPlatformReview,
  cancelPendingSwipe,
  getNameInitial,
  getFavoritesForUser,
  toggleFavorite,
  toggleFavoriteJob,
  swipeJob,
  swipeCaregiver,
} from '@/services/api';
import { MatchContactInfo, NotificationRow, CARE_ROLES_META, CASE_TYPES_V3 } from '@/types/database';
import {
  PhoneIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BellIcon,
  StarIcon,
  BriefcaseIcon,
  MapPinIcon,
  ChevronRightIcon,
  CloseIcon,
  CheckIcon,
} from '@/components/Icons';
import { useToast } from '@/components/Toast';

function MatchesContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [currentUser, setCurrentUser] = useState(() => {
    const cur = getCurrentUser();
    if (roleParam === 'caregiver' && cur.role !== 'caregiver') {
      const cgUser = {
        id: 'cg-1-wimon',
        role: 'caregiver' as const,
        display_name: 'คุณวิมล ชัยชนะ (PN)',
        phone: '0814567890',
        line_id: 'wimon_care_pn',
      };
      persistCurrentUser(cgUser);
      return cgUser;
    }
    return cur;
  });
  const [matches, setMatches] = useState<ReturnType<typeof getAllActiveMatchesForUser>>(() => {
    const cur = getCurrentUser();
    const effectiveId = roleParam === 'caregiver' && cur.role !== 'caregiver' ? 'cg-1-wimon' : cur.id;
    return getAllActiveMatchesForUser(effectiveId);
  });
  const [favorites, setFavorites] = useState<ReturnType<typeof getFavoritesForUser>>(() => {
    const cur = getCurrentUser();
    const effectiveId = roleParam === 'caregiver' && cur.role !== 'caregiver' ? 'cg-1-wimon' : cur.id;
    return getFavoritesForUser(effectiveId);
  });
  const [notifications, setNotifications] = useState<NotificationRow[]>(() => {
    const cur = getCurrentUser();
    const effectiveId = roleParam === 'caregiver' && cur.role !== 'caregiver' ? 'cg-1-wimon' : cur.id;
    return getNotifications(effectiveId);
  });
  const [revealedContacts, setRevealedContacts] = useState<Record<string, MatchContactInfo>>({});
  
  // Favorites comparison state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Mutual matches comparison state
  const [isMutualCompareMode, setIsMutualCompareMode] = useState(false);
  const [selectedMutualForCompare, setSelectedMutualForCompare] = useState<string[]>([]);
  const [showMutualCompareModal, setShowMutualCompareModal] = useState(false);

  // Platform evaluation form (Objective 1). 0 = not answered yet (no default bias).
  const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    const handleReset = () => {
      let cur = getCurrentUser();
      if (roleParam === 'caregiver' && cur.role !== 'caregiver') {
        const cgUser = {
          id: 'cg-1-wimon',
          role: 'caregiver' as const,
          display_name: 'คุณวิมล ชัยชนะ (PN)',
          phone: '0814567890',
          line_id: 'wimon_care_pn',
        };
        persistCurrentUser(cgUser);
        cur = cgUser;
      }
      setCurrentUser(cur);
      setMatches(getAllActiveMatchesForUser(cur.id));
      setFavorites(getFavoritesForUser(cur.id));
      setNotifications(getNotifications(cur.id));
    };

    // Load fresh data immediately on client mount
    handleReset();

    // 1. Same-window custom event listeners
    window.addEventListener('jg_data_reset', handleReset);
    window.addEventListener('jg_user_changed', handleReset);
    window.addEventListener('jg_favorites_changed', handleReset);
    window.addEventListener('jg_matches_changed', handleReset);
    window.addEventListener('focus', handleReset);
    window.addEventListener('storage', handleReset);

    // 2. Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('jobgist_sync_channel');
        bc.onmessage = () => {
          handleReset();
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('jg_data_reset', handleReset);
      window.removeEventListener('jg_user_changed', handleReset);
      window.removeEventListener('jg_favorites_changed', handleReset);
      window.removeEventListener('jg_matches_changed', handleReset);
      window.removeEventListener('focus', handleReset);
      window.removeEventListener('storage', handleReset);
      if (bc) {
        try {
          bc.close();
        } catch (e) {}
      }
    };
  }, [roleParam]);

  const handleRevealContact = (matchId: string) => {
    const info = getMatchContact(matchId, currentUser.id);
    if (info) {
      setRevealedContacts((prev) => ({ ...prev, [matchId]: info }));
    }
  };

  const handleMarkNotif = (notifId: string) => {
    markNotificationRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const handleDeleteNotif = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  // Q3–Q4 are about the applicant card, which only families see.
  const reviewQuestions: { key: string; label: string }[] = [
    { key: 'ease', label: 'ใช้งานง่าย ไม่ต้องพิมพ์เยอะ' },
    { key: 'profile_clarity', label: 'ข้อความโปรไฟล์ที่ AI เขียนชัดเจน เข้าใจง่าย' },
    ...(currentUser.role === 'family'
      ? [
          { key: 'summary_accuracy', label: 'สรุปความเหมาะสมบนการ์ดผู้สมัคร ตรงกับข้อมูลจริง' },
          { key: 'tag_usefulness', label: 'tag ที่ระบบแนะนำมีประโยชน์' },
        ]
      : []),
    { key: 'overall', label: 'พอใจกับการใช้งานโดยรวม' },
  ];

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = reviewQuestions;
    if (qs.some((q) => !reviewScores[q.key])) {
      showToast('ยังตอบไม่ครบ', 'กรุณาเลือกคะแนน 1–5 ให้ครบทุกข้อ');
      return;
    }
    const isFam = currentUser.role === 'family';
    submitPlatformReview({
      user_id: currentUser.id,
      role: currentUser.role ?? 'family',
      ease_of_use_score: reviewScores.ease,
      profile_clarity_score: reviewScores.profile_clarity,
      summary_accuracy_score: isFam ? reviewScores.summary_accuracy : null,
      tag_usefulness_score: isFam ? reviewScores.tag_usefulness : null,
      overall_satisfaction_score: reviewScores.overall,
      comment: reviewComment.trim() || null,
    });
    setReviewSubmitted(true);
    showToast('ขอบคุณสำหรับคำตอบ', 'บันทึกแบบประเมินเรียบร้อยแล้ว');
  };

  const mutualMatches = matches.filter((m) => m.isMutual);
  const isCaregiverRole = currentUser.role === 'caregiver';

  // Outgoing pending matches: current user sent a like and is waiting for the other party
  const pendingOutgoing = matches.filter((m) => {
    if (m.isMutual) return false;
    return isCaregiverRole
      ? m.match.caregiver_decision === 'like' && m.match.family_decision !== 'like' && m.match.family_decision !== 'pass'
      : m.match.family_decision === 'like' && m.match.caregiver_decision !== 'like' && m.match.caregiver_decision !== 'pass';
  });

  // Incoming interest: other party sent a like and is waiting for current user to respond
  // ถ้าเราปัดซ้าย (pass) แล้ว ต้องไม่แสดงในส่วนนี้อีก
  const incomingRequests = matches.filter((m) => {
    if (m.isMutual) return false;
    return isCaregiverRole
      ? m.match.family_decision === 'like' && !m.match.caregiver_decision
      : m.match.caregiver_decision === 'like' && !m.match.family_decision;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <div className="flex-1 bg-[#735095] py-8 px-4">
        <main className="max-w-5xl mx-auto w-full space-y-8">
          {/* Header */}
        <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
              MATCH CENTER • RPC GET_MATCH_CONTACT(P_MATCH_ID)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
              การจับคู่และข้อมูลติดต่อ
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              เข้าถึงเบอร์โทรและ LINE เพื่อเริ่มงานได้โดยตรง เมื่อทั้งสองฝ่ายตอบรับตรงกัน
            </p>
          </div>
        </div>

        {/* Section 1: Notifications Feed */}
        <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-[#D946EF]" />
              การแจ้งเตือนล่าสุด ({notifications.filter((n) => !n.read_at).length} ข้อความใหม่)
            </span>
            <span className="text-sm font-mono text-stone-500">
              LINE Notification Sync: Active
            </span>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-2.5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkNotif(notif.id)}
                  className={`p-3.5 border-2 border-indigo-950 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                    notif.read_at ? 'bg-white' : 'bg-[#FAF9F6] riso-shadow-sm'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notif.read_at && (
                        <span className="w-2 h-2 rounded-full bg-[#D946EF] shrink-0" />
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-indigo-950">{notif.title}</h4>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">{notif.message}</p>
                    <span className="text-xs font-mono text-stone-400 block pt-0.5">
                      {new Date(notif.created_at).toLocaleDateString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {!notif.read_at && (
                      <span className="text-sm font-mono text-[#D946EF] font-bold">
                        ใหม่
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotif(notif.id, e)}
                      title="ลบการแจ้งเตือนนี้"
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-100 border border-transparent hover:border-indigo-950 transition-colors"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center border-2 border-dashed border-stone-300 bg-[#FAF9F6] space-y-1">
              <p className="text-xs sm:text-sm font-bold text-stone-500">ไม่มีการแจ้งเตือน</p>
              <p className="text-sm font-mono text-stone-400">เมื่อมีความเคลื่อนไหวหรือการจับคู่ใหม่ ระบบจะแจ้งเตือนให้คุณทราบที่นี่</p>
            </div>
          )}
        </div>

        {/* Section 2: Mutual Matches (Unlocked Contacts) */}
        <div className="space-y-4">
          <div className="bg-white border-2 border-indigo-950 px-5 py-3 riso-shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-[#D946EF]" />
              <h2 className="text-base sm:text-lg font-black text-indigo-950">
                คู่ที่ตอบรับตรงกันแล้ว (Mutual Matches)
              </h2>
              <span className="text-xs font-mono bg-[#D946EF] text-white px-2 py-0.5 rounded-full ml-1">
                {mutualMatches.length}
              </span>
              {isMutualCompareMode && (
                <span className="text-xs font-mono text-[#D946EF] font-bold ml-2">
                  (เลือก {selectedMutualForCompare.length}/4 ท่าน)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {mutualMatches.length >= 2 && (
                <div className="flex items-center gap-2">
                  {isMutualCompareMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMutualCompareMode(false);
                        setSelectedMutualForCompare([]);
                      }}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold border border-stone-300 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!isMutualCompareMode) {
                        setIsMutualCompareMode(true);
                        setSelectedMutualForCompare(mutualMatches.slice(0, Math.min(2, mutualMatches.length)).map((m) => m.match.id));
                      } else {
                        if (selectedMutualForCompare.length < 2) {
                          showToast('กรุณาเลือกผู้ดูแลอย่างน้อย 2 ท่าน', 'เพื่อทำการเปรียบเทียบข้อมูล');
                          return;
                        }
                        if (selectedMutualForCompare.length > 4) {
                          showToast('เปรียบเทียบได้สูงสุด 4 ท่าน', 'กรุณาลดจำนวนที่เลือกลงเหลือไม่เกิน 4 ท่าน');
                          return;
                        }
                        setShowMutualCompareModal(true);
                      }
                    }}
                    className={`px-4 py-2 text-xs font-bold border-2 border-indigo-950 riso-shadow-sm riso-btn-active cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      isMutualCompareMode
                        ? 'bg-indigo-950 text-white hover:bg-[#2E1065]'
                        : 'bg-white text-indigo-950 hover:bg-stone-50'
                    }`}
                  >
                    <SparklesIcon className={`w-4 h-4 ${isMutualCompareMode ? 'text-[#D946EF]' : 'text-stone-600'}`} />
                    <span>{isMutualCompareMode ? 'ตกลง' : `เปรียบเทียบ (${mutualMatches.length})`}</span>
                  </button>
                </div>
              )}
              <span className="text-xs font-mono text-stone-500 font-bold hidden md:inline-block">จ้างตรง 0% ค่าธรรมเนียม</span>
            </div>
          </div>

          {isMutualCompareMode && (
            <div className="bg-[#FAF5FF] border-2 border-[#D946EF] px-4 py-2.5 text-xs text-[#735095] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>👆 คลิกที่กล่องคู่แมตช์เพื่อเลือกคนที่ต้องการเปรียบเทียบ (เลือกได้ 2 - 4 ท่าน กล่องที่เลือกจะเป็นสีม่วงอ่อน)</span>
              <span className="font-mono text-sm bg-white px-2 py-0.5 border border-[#D946EF] text-indigo-950 self-start sm:self-auto">
                เลือกแล้ว {selectedMutualForCompare.length} / 4 ท่าน
              </span>
            </div>
          )}

          {mutualMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mutualMatches.map(({ match, job, otherProfile, details, fit_score }) => {
                const isRevealed = !!revealedContacts[match.id];
                const contactInfo = revealedContacts[match.id];
                const isChecked = selectedMutualForCompare.includes(match.id);

                return (
                  <div
                    key={match.id}
                    onClick={() => {
                      if (isMutualCompareMode) {
                        if (isChecked) {
                          setSelectedMutualForCompare((prev) => prev.filter((id) => id !== match.id));
                        } else {
                          if (selectedMutualForCompare.length >= 4) {
                            showToast('เปรียบเทียบได้มากสุด 4 ท่านต่อครั้ง', 'หากต้องการเลือกท่านนี้ กรุณายกเลิกท่านอื่นออกก่อน');
                            return;
                          }
                          setSelectedMutualForCompare((prev) => [...prev, match.id]);
                        }
                      }
                    }}
                    className={`border-2 border-indigo-950 p-5 riso-shadow-lg space-y-4 flex flex-col justify-between transition-colors ${
                      isMutualCompareMode ? 'cursor-pointer hover:border-purple-800' : 'bg-white'
                    } ${
                      isChecked && isMutualCompareMode
                        ? 'bg-[#F3E8FF] ring-2 ring-indigo-950'
                        : 'bg-white'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {isMutualCompareMode && (
                            <div
                              className={`w-5 h-5 rounded-full border-2 border-indigo-950 flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-indigo-950 text-white' : 'bg-white'
                              }`}
                            >
                              {isChecked && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                            </div>
                          )}

                          {otherProfile?.avatar_url || details?.avatar_url ? (
                            <img
                              src={otherProfile?.avatar_url || details?.avatar_url || ''}
                              alt={otherProfile?.display_name || 'คู่แมตช์'}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#1E1B4B] text-white font-mono font-black text-xl sm:text-2xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                              {getNameInitial(otherProfile?.display_name, currentUser.role === 'caregiver' ? 'ว' : 'ผ')}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <h3 className="font-extrabold text-base sm:text-lg text-indigo-950">
                              {otherProfile?.display_name || 'คู่แมตช์'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-mono text-stone-600 block">
                                {currentUser.role === 'caregiver' ? 'ครอบครัวผู้ว่าจ้าง' : 'ผู้ดูแลผู้สูงอายุ'}
                              </span>
                              {currentUser.role === 'family' && details?.years_experience !== undefined && (
                                <span className="text-xs font-mono text-stone-500">• {details.years_experience} ปี</span>
                              )}
                              {currentUser.role === 'caregiver' && job?.district && (
                                <span className="text-xs font-mono text-stone-500">• เขต{job.district}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 bg-pink-100 text-[#D946EF] border border-[#D946EF] font-mono text-xs font-bold">
                            MATCHED ✓
                          </span>
                          {fit_score !== undefined && (
                            <span className="text-xs font-mono font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 border border-stone-300">
                              AI Fit: {fit_score}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Job summary */}
                      {job && (
                        <div className="bg-[#FAF9F6] border border-indigo-950 p-2.5 text-xs text-stone-700 leading-relaxed">
                          <span className="font-bold block text-indigo-950 font-mono mb-0.5">
                            📍 {job.district}, {job.province} (
                            {job.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'})
                          </span>
                          <p className="line-clamp-2">&ldquo;{job.patient_description}&rdquo;</p>
                        </div>
                      )}

                      {/* Contact Reveal Box */}
                      {isRevealed && contactInfo ? (
                        <div className="bg-emerald-50 border-2 border-emerald-900 p-3.5 space-y-2 animate-in fade-in">
                          <span className="text-xs font-mono font-bold text-emerald-900 block uppercase">
                            ✓ ข้อมูลติดต่อสำหรับเริ่มงาน (Revealed via RPC):
                          </span>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-600 font-mono">เบอร์โทรศัพท์:</span>
                              <a
                                href={`tel:${contactInfo.phone}`}
                                className="font-mono font-bold text-base text-emerald-950 underline flex items-center gap-1"
                              >
                                <PhoneIcon className="w-4 h-4 text-emerald-800" />
                                {contactInfo.phone}
                              </a>
                            </div>
                            {contactInfo.line_id && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-stone-600 font-mono">LINE ID:</span>
                                <span className="font-mono font-bold text-sm text-emerald-950">
                                  {contactInfo.line_id}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-stone-500 font-mono block">
                            * ตกลงสัญญาและวันเริ่มงานโดยตรง ไม่ผ่านนายหน้า
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-900/30 text-xs text-amber-950 flex items-center gap-2">
                          <ShieldCheckIcon className="w-4 h-4 text-amber-800 shrink-0" />
                          <span>ทั้งสองฝ่ายกดถูกใจตรงกันแล้ว กดปุ่มด้านล่างเพื่อเปิดดูเบอร์และ LINE</span>
                        </div>
                      )}
                    </div>

                    {!isRevealed ? (
                      <button
                        type="button"
                        onClick={() => handleRevealContact(match.id)}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-[#D946EF] text-white font-black text-xs border-2 border-indigo-950 riso-shadow-sm hover:bg-[#c026d3] flex items-center justify-center gap-2 riso-btn-active"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        <span>เปิดดูข้อมูลติดต่อ (View Contact Info)</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${contactInfo?.phone}`}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-emerald-800 text-white font-black text-xs border-2 border-indigo-950 riso-shadow-sm hover:bg-emerald-900 flex items-center justify-center gap-2 text-center"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        <span>โทรหาตอนนี้ ({contactInfo?.phone})</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-950 p-8 text-center riso-shadow-sm space-y-2">
              <p className="text-xs sm:text-sm text-stone-600">
                ยังไม่มีการจับคู่ที่ตรงกันในขณะนี้ ลองกดสนใจผู้สมัครหรือฟีดงานเพิ่ม
              </p>
              <div className="pt-2">
                <Link
                  href={currentUser.role === 'caregiver' ? '/caregiver/jobs' : '/family/applicants'}
                  className="inline-block min-h-[40px] px-4 py-2 bg-indigo-950 text-white font-bold text-xs border border-indigo-950 hover:bg-[#2E1065]"
                >
                  {currentUser.role === 'caregiver' ? 'ค้นหาตำแหน่งงาน →' : 'ค้นหาผู้สมัครงาน →'}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Section 2.5: Incoming Interests (ผู้ที่สนใจงานของคุณ / รอคุณตัดสินใจ) */}
        {incomingRequests.length > 0 && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-[#D946EF] px-5 py-3 riso-shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-[#D946EF]" />
                <h3 className="text-sm sm:text-base font-black text-indigo-950">
                  {isCaregiverRole ? 'มีครอบครัวสนใจคุณ (รอคุณตอบรับ)' : 'มีผู้ดูแลสนใจงานของคุณ (รอคุณตอบรับ)'}
                </h3>
              </div>
              <span className="font-mono text-xs text-white bg-[#D946EF] px-2 py-0.5 rounded-full font-bold">
                {incomingRequests.length} รายการ
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {incomingRequests.map(({ match, job, otherProfile, details }) => (
                <div
                  key={match.id}
                  className="bg-white border-2 border-indigo-950 p-4 text-xs space-y-3 riso-shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                        <span className="font-bold text-indigo-950 text-sm">
                          {otherProfile?.display_name || 'ผู้ใช้งาน'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 font-mono">
                        {isCaregiverRole
                          ? `เขต${job?.district || 'กทม.'}`
                          : `ประสบการณ์ ${details?.years_experience || 3} ปี • เขต${details?.home_district || 'กทม.'}`}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#D946EF] bg-purple-50 px-2 py-0.5 border border-[#D946EF] shrink-0">
                      สนใจคุณแล้ว
                    </span>
                  </div>

                  <p className="text-stone-600 line-clamp-2 text-xs border-t border-stone-100 pt-2">
                    {job?.patient_description || 'รายละเอียดงานดูแลผู้สูงอายุ'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCaregiverRole) {
                          swipeJob(match.job_post_id, currentUser.id, 'like');
                        } else {
                          swipeCaregiver(match.job_post_id, match.caregiver_id, 'like');
                        }
                      }}
                      className="flex-1 py-2 bg-indigo-950 hover:bg-[#2E1065] text-white font-bold text-xs border border-indigo-950 riso-shadow-sm riso-btn-active cursor-pointer text-center"
                    >
                      ตอบรับและ Match ทันที
                    </button>
                    <Link
                      href={
                        isCaregiverRole
                          ? `/caregiver/jobs?jobId=${match.job_post_id}`
                          : `/family/applicants?caregiverId=${match.caregiver_id}`
                      }
                      className="px-3 py-2 bg-white hover:bg-stone-50 text-indigo-950 font-bold text-xs border border-indigo-950 riso-shadow-sm riso-btn-active text-center"
                    >
                      ดูใน Swipe UI
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Pending Decisions (Outgoing) - รายการที่อยู่ระหว่างรออีกฝ่ายตอบรับ */}
        <div className="space-y-3">
          <div className="bg-white border-2 border-indigo-950 px-5 py-3 riso-shadow-sm">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center justify-between">
              <span>รายการที่อยู่ระหว่างรออีกฝ่ายตอบรับ</span>
              <span className="font-mono text-xs text-stone-700 bg-stone-100 px-2 py-0.5 border border-indigo-950 font-bold">
                {pendingOutgoing.length} รายการ
              </span>
            </h3>
          </div>
          {pendingOutgoing.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingOutgoing.map(({ match, job, otherProfile }) => (
                <div
                  key={match.id}
                  className="bg-white border-2 border-indigo-950 p-3.5 text-xs space-y-2 riso-shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-indigo-950 truncate">
                      {otherProfile?.display_name || 'ผู้ใช้งาน'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          cancelPendingSwipe(match.id, currentUser.id);
                        }}
                        className="px-2.5 py-1 text-sm font-bold text-indigo-950 bg-white hover:bg-stone-100 border border-indigo-950 riso-shadow-sm riso-btn-active cursor-pointer transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <span className="font-mono text-sm font-bold text-stone-700 bg-stone-100 px-2 py-0.5 border border-indigo-950">
                        รอการตอบรับ
                      </span>
                    </div>
                  </div>
                  <p className="text-stone-600 line-clamp-1">{job?.patient_description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-950 p-5 text-center riso-shadow-sm">
              <p className="text-xs text-stone-500">
                {isCaregiverRole
                  ? 'ยังไม่มีงานที่กดถูกใจรอครอบครัวตอบรับ (เมื่อคุณปัดถูกใจงาน ระบบจะแสดงที่นี่จนกว่าอีกฝ่ายจะตอบรับ)'
                  : 'ยังไม่มีผู้ดูแลที่กดถูกใจรอตอบรับ (เมื่อคุณปัดถูกใจผู้ดูแล ระบบจะแสดงที่นี่จนกว่าอีกฝ่ายจะตอบรับ)'}
              </p>
            </div>
          )}
        </div>

        {/* Section 4: Saved Favorites (รายการโปรดที่บันทึกไว้) */}
        <div className="space-y-3">
          <div className="bg-white border-2 border-indigo-950 px-5 py-3 riso-shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StarIcon className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h3 className="text-base font-bold text-indigo-950">
                {currentUser.role === 'caregiver' ? 'งานที่บันทึกเป็นรายการโปรด' : 'ผู้ดูแลที่บันทึกเป็นรายการโปรด'}
              </h3>
              <span className="font-mono text-xs text-stone-700 bg-stone-100 px-2 py-0.5 border border-indigo-950 font-bold ml-1">
                {favorites.length} {currentUser.role === 'caregiver' ? 'งาน' : 'ท่าน'}
              </span>
              {isCompareMode && (
                <span className="text-xs font-mono text-[#D946EF] font-bold ml-2">
                  (เลือก {selectedForCompare.length}/4 {currentUser.role === 'caregiver' ? 'งาน' : 'ท่าน'})
                </span>
              )}
            </div>

            {favorites.length >= 2 && (
              <div className="flex items-center gap-2">
                {isCompareMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCompareMode(false);
                      setSelectedForCompare([]);
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold border border-stone-300 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!isCompareMode) {
                      setIsCompareMode(true);
                      setSelectedForCompare(favorites.slice(0, Math.min(2, favorites.length)).map((f) => f.favorite.caregiver_id));
                    } else {
                      if (selectedForCompare.length < 2) {
                        showToast(currentUser.role === 'caregiver' ? 'กรุณาเลือกงานอย่างน้อย 2 รายการ' : 'กรุณาเลือกผู้ดูแลอย่างน้อย 2 ท่าน', 'เพื่อทำการเปรียบเทียบข้อมูล');
                        return;
                      }
                      if (selectedForCompare.length > 4) {
                        showToast(currentUser.role === 'caregiver' ? 'เปรียบเทียบได้สูงสุด 4 งาน' : 'เปรียบเทียบได้สูงสุด 4 ท่าน', 'กรุณาลดจำนวนที่เลือกลงเหลือไม่เกิน 4 รายการ');
                        return;
                      }
                      setShowCompareModal(true);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-bold border-2 border-indigo-950 riso-shadow-sm riso-btn-active cursor-pointer flex items-center justify-center gap-2 transition-all ${
                    isCompareMode
                      ? 'bg-indigo-950 text-white hover:bg-[#2E1065]'
                      : 'bg-white text-indigo-950 hover:bg-stone-50'
                  }`}
                >
                  <SparklesIcon className={`w-4 h-4 ${isCompareMode ? 'text-[#D946EF]' : 'text-stone-600'}`} />
                  <span>{isCompareMode ? 'ตกลง' : `เปรียบเทียบ (${favorites.length})`}</span>
                </button>
              </div>
            )}
          </div>

          {isCompareMode && (
            <div className="bg-[#FAF5FF] border-2 border-[#D946EF] px-4 py-2.5 text-xs text-[#735095] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>👆 คลิกที่การ์ดเพื่อเลือก{currentUser.role === 'caregiver' ? 'งาน' : 'ผู้ดูแล'}ที่ต้องการเปรียบเทียบ (เลือกได้ 2 - 4 รายการ)</span>
              <span className="font-mono text-sm bg-white px-2 py-0.5 border border-[#D946EF] text-indigo-950 self-start sm:self-auto">
                เลือกแล้ว {selectedForCompare.length} / 4 รายการ
              </span>
            </div>
          )}

          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favorites.map((favItem) => {
                const { favorite, caregiver, details, skills, certs, job, family_name, family_avatar_url, distance_km, needs_i_can_do, needs_required, required_cases, fit_score, is_matched } = favItem as any;
                const targetId = favorite.caregiver_id;
                const isChecked = selectedForCompare.includes(targetId);
                const isCaregiverRole = currentUser.role === 'caregiver';

                return (
                  <div
                    key={favorite.id}
                    onClick={() => {
                      if (isCompareMode) {
                        if (isChecked) {
                          setSelectedForCompare((prev) => prev.filter((id) => id !== targetId));
                        } else {
                          if (selectedForCompare.length >= 4) {
                            showToast('เปรียบเทียบได้มากสุด 4 รายการต่อครั้ง', 'หากต้องการเลือกรายการนี้ กรุณายกเลิกรายการอื่นออกก่อน');
                            return;
                          }
                          setSelectedForCompare((prev) => [...prev, targetId]);
                        }
                      }
                    }}
                    className={`border-2 border-indigo-950 p-4 riso-shadow-sm space-y-3 flex flex-col justify-between transition-colors ${
                      isCompareMode ? 'cursor-pointer hover:border-purple-800' : ''
                    } ${
                      isChecked && isCompareMode
                        ? 'bg-[#F3E8FF] ring-2 ring-indigo-950'
                        : 'bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isCompareMode && (
                            <div
                              className={`w-5 h-5 rounded-full border-2 border-indigo-950 flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-indigo-950 text-white' : 'bg-white'
                              }`}
                            >
                              {isChecked && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                            </div>
                          )}

                          {isCaregiverRole ? (
                            family_avatar_url ? (
                              <img
                                src={family_avatar_url}
                                alt={family_name || 'คุณผู้ว่าจ้าง'}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-950 text-white font-mono font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                                {getNameInitial(family_name || 'คุณวรรณวิมล', 'ว')}
                              </div>
                            )
                          ) : (
                            caregiver?.avatar_url || details?.avatar_url ? (
                              <img
                                src={caregiver?.avatar_url || details?.avatar_url || ''}
                                alt={caregiver?.display_name || 'ผู้ดูแล'}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover border-2 border-indigo-950 shrink-0 bg-white riso-shadow-sm"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-950 text-white font-mono font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                                {getNameInitial(caregiver?.display_name || 'ผู้ดูแล', 'ผ')}
                              </div>
                            )
                          )}

                          <div className="space-y-0.5">
                            <h4 className="font-bold text-indigo-950 text-sm sm:text-base">
                              {isCaregiverRole ? (family_name || 'คุณผู้ว่าจ้าง') : (caregiver?.display_name || 'ผู้ดูแล')}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600 font-mono">
                              {isCaregiverRole ? (
                                <>
                                  {job?.district && <span>เขต{job.district}</span>}
                                  {distance_km !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span>ห่าง {distance_km} กม.</span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  {details?.years_experience !== undefined && (
                                    <span>ประสบการณ์ {details.years_experience} ปี</span>
                                  )}
                                  {details?.home_district && (
                                    <>
                                      <span>•</span>
                                      <span>เขต{details.home_district}</span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Remove favorite button */}
                        {!isCompareMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCaregiverRole) {
                                toggleFavoriteJob(currentUser.id, targetId);
                              } else {
                                toggleFavorite(currentUser.id, targetId);
                              }
                              setSelectedForCompare((prev) => prev.filter((id) => id !== targetId));
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-50 border border-transparent hover:border-indigo-950 transition-colors"
                            title="นำออกจากรายการโปรด"
                          >
                            <StarIcon className="w-4 h-4 text-amber-500 fill-amber-500" />
                          </button>
                        )}
                      </div>

                      {isCaregiverRole ? (
                        <>
                          {job?.patient_description && (
                            <p className="text-xs text-stone-700 leading-relaxed bg-[#FAF9F6] border border-indigo-950 p-2.5 break-words">
                              “{job.patient_description}”
                            </p>
                          )}
                          <div className="text-xs font-mono font-bold text-indigo-950">
                            งบประมาณ: {job?.expected_wage ? `฿${job.expected_wage.toLocaleString()}/${job.wage_unit === 'month' ? 'เดือน' : job.wage_unit === 'day' ? 'วัน' : 'ชม.'}` : 'ตามตกลง'} ({job?.work_arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'})
                          </div>
                        </>
                      ) : (
                        <>
                          {details?.care_roles && details.care_roles.length > 0 && (
                            <p className="text-xs text-stone-700 font-bold">
                              {details.care_roles
                                .map((r: string) => CARE_ROLES_META[r as keyof typeof CARE_ROLES_META]?.label_th || r)
                                .join(' • ')}
                            </p>
                          )}
                          {details?.expected_wage_min !== undefined && (
                            <div className="text-xs font-mono font-bold text-indigo-950">
                              ค่าจ้างคาดหวัง: ฿{details.expected_wage_min.toLocaleString()} - {details.expected_wage_max.toLocaleString()}/{details.wage_unit === 'month' ? 'เดือน' : details.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                      <span className="text-sm font-mono text-stone-400">
                        บันทึกเมื่อ {new Date(favorite.created_at).toLocaleDateString('th-TH')}
                      </span>
                      {!isCompareMode ? (
                        is_matched ||
                        (caregiver as any)?.is_matched ||
                        (details as any)?.is_matched ||
                        (favorite as any).isMatched ||
                        (isCaregiverRole
                          ? !!matches.find((m) => m.match.job_post_id === targetId && m.isMutual)
                          : !!matches.find((m) => m.match.caregiver_id === targetId && m.isMutual)) ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1 bg-stone-100 text-stone-500 text-xs font-bold border border-stone-300 cursor-not-allowed flex items-center gap-1 opacity-80"
                          >
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>จับคู่แล้ว</span>
                          </button>
                        ) : (
                          <Link
                            href={isCaregiverRole ? `/caregiver/jobs?jobId=${targetId}` : `/family/applicants?caregiverId=${targetId}`}
                            className="px-3 py-1 bg-indigo-950 text-white text-xs font-bold border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065] flex items-center gap-1"
                          >
                            <span>ไปหน้าพิจารณา</span>
                            <ChevronRightIcon className="w-3.5 h-3.5" />
                          </Link>
                        )
                      ) : (
                        <span className="text-xs font-bold font-mono text-indigo-950">
                          {isChecked ? '✓ เลือกแล้ว' : '+ คลิกเพื่อเลือก'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-950 p-6 text-center riso-shadow-sm space-y-2">
              <p className="text-xs sm:text-sm text-stone-500">
                {currentUser.role === 'caregiver'
                  ? 'คุณยังไม่ได้บันทึกงานใดเป็นรายการโปรด สามารถกดปุ่ม ⭐ เพิ่มลงรายการโปรด ได้ที่หน้า Swipe ค้นหางาน'
                  : 'คุณยังไม่ได้บันทึกผู้ดูแลคนใดเป็นรายการโปรด สามารถกดปุ่ม ⭐ เพิ่มลงรายการโปรด ได้ที่หน้า Swipe พิจารณาผู้สมัคร'}
              </p>
              <Link
                href={currentUser.role === 'caregiver' ? '/caregiver/jobs' : '/family/applicants'}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-950 text-white text-xs font-bold border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065]"
              >
                <span>{currentUser.role === 'caregiver' ? 'ไปหน้าหางาน (Swipe UI)' : 'ไปหน้าหาผู้ดูแล (Swipe UI)'}</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Modal: Compare Favorite Items */}
        {showCompareModal && (
          <div className="fixed inset-0 z-50 bg-indigo-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white border-4 border-indigo-950 max-w-4xl w-full riso-shadow-xl my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b-2 border-indigo-950 flex items-center justify-between bg-[#FAF9F6]">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
                    {currentUser.role === 'caregiver' ? 'JOB COMPARISON MATRIX' : 'CAREGIVER COMPARISON MATRIX'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-indigo-950 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-[#D946EF]" />
                    <span>เปรียบเทียบ{currentUser.role === 'caregiver' ? 'งาน' : 'ผู้ดูแล'}ที่เลือก ({selectedForCompare.length} {currentUser.role === 'caregiver' ? 'งาน' : 'ท่าน'})</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="p-1.5 text-stone-500 hover:text-indigo-950 hover:bg-stone-200 border border-transparent hover:border-indigo-950 transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Comparison Table */}
              <div className="p-4 sm:p-6 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-indigo-950 bg-stone-50">
                      <th className="p-3 font-mono font-bold text-stone-500 w-36 shrink-0">เกณฑ์เปรียบเทียบ</th>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, caregiver, fit_score, family_name, family_avatar_url } = favItem as any;
                          const isCaregiverRole = currentUser.role === 'caregiver';
                          return (
                            <th key={favorite.id} className="p-3 text-center min-w-[180px] sm:min-w-[200px]">
                              <div className="flex flex-col items-center space-y-2">
                                {isCaregiverRole ? (
                                  family_avatar_url ? (
                                    <img
                                      src={family_avatar_url}
                                      alt={family_name || 'คุณผู้ว่าจ้าง'}
                                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-2 border-indigo-950 bg-white riso-shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-950 text-white font-mono font-black text-3xl sm:text-4xl flex items-center justify-center border-2 border-indigo-950 riso-shadow-sm">
                                      {getNameInitial(family_name || 'ว', 'ว')}
                                    </div>
                                  )
                                ) : (
                                  caregiver?.avatar_url ? (
                                    <img
                                      src={caregiver.avatar_url}
                                      alt={caregiver.display_name}
                                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-2 border-indigo-950 bg-white riso-shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-950 text-white font-mono font-black text-3xl sm:text-4xl flex items-center justify-center border-2 border-indigo-950 riso-shadow-sm">
                                      {getNameInitial(caregiver?.display_name || 'ผ', 'ผ')}
                                    </div>
                                  )
                                )}
                                <span className="font-bold text-indigo-950 text-sm sm:text-base text-center leading-snug">
                                  {isCaregiverRole ? (family_name || 'คุณผู้ว่าจ้าง') : caregiver?.display_name}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {/* AI Fit Score Row */}
                    <tr className="bg-purple-50/60">
                      <td className="p-3 font-bold text-indigo-950 bg-purple-100/70">
                        <div className="flex items-center gap-1.5">
                          <SparklesIcon className="w-3.5 h-3.5 text-[#D946EF]" />
                          <span>คะแนนตรงตามเงื่อนไข</span>
                        </div>
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map(({ favorite, fit_score }) => (
                          <td key={favorite.id} className="p-3 text-center">
                            <span className="font-mono font-black text-lg sm:text-xl text-[#D946EF] inline-block px-3 py-1 bg-white border-2 border-indigo-950 riso-shadow-sm">
                              {fit_score}%
                            </span>
                          </td>
                        ))}
                    </tr>

                    {/* Gender & Age Row */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        เพศ / อายุ
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, caregiver, family_gender, family_age } = favItem as any;
                          const isCg = currentUser.role === 'caregiver';
                          const genderDisplay = isCg
                            ? family_gender || '-'
                            : details?.gender === 'female' || caregiver?.gender === 'female'
                            ? 'หญิง'
                            : details?.gender === 'male' || caregiver?.gender === 'male'
                            ? 'ชาย'
                            : '-';
                          const ageDisplay = isCg
                            ? (family_age ? `${family_age} ปี` : '-')
                            : (details?.age ? `${details.age} ปี` : '-');

                          return (
                            <td key={favorite.id} className="p-3 text-center text-stone-800 font-bold text-xs">
                              <span className="inline-block px-2 py-0.5 bg-stone-100 border border-stone-300">
                                {genderDisplay !== '-' ? `เพศ${genderDisplay}` : 'ไม่ระบุเพศ'}
                                {ageDisplay !== '-' ? ` • ${ageDisplay}` : ''}
                              </span>
                            </td>
                          );
                        })}
                    </tr>

                    {/* Role / Case needs */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'เคสที่ต้องการ' : 'บทบาท / ตำแหน่ง'}
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, required_cases } = favItem as any;
                          return (
                            <td key={favorite.id} className="p-3 text-center text-stone-800 font-medium">
                              {currentUser.role === 'caregiver' ? (
                                <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                                  {required_cases?.map((c: string) => (
                                    <span key={c} className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 text-xs">
                                      {CASE_TYPES_V3[c as keyof typeof CASE_TYPES_V3]?.short_label_th || c}
                                    </span>
                                  )) || '-'}
                                </div>
                              ) : (
                                details?.care_roles?.map((r: string) => CARE_ROLES_META[r as keyof typeof CARE_ROLES_META]?.label_th || r).join(', ') || '-'
                              )}
                            </td>
                          );
                        })}
                    </tr>

                    {/* Distance / Experience */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'ระยะทาง' : 'ประสบการณ์'}
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, distance_km } = favItem as any;
                          return (
                            <td key={favorite.id} className="p-3 text-center font-mono font-bold text-indigo-950 text-sm">
                              {currentUser.role === 'caregiver'
                                ? (distance_km !== undefined ? `${distance_km} กม.` : '-')
                                : (details?.years_experience !== undefined ? `${details.years_experience} ปี` : '-')}
                            </td>
                          );
                        })}
                    </tr>

                    {/* Wage / Budget */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'งบประมาณค่าจ้าง' : 'ค่าจ้างคาดหวัง'}
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, job } = favItem as any;
                          return (
                            <td key={favorite.id} className="p-3 text-center">
                              {currentUser.role === 'caregiver' ? (
                                job?.expected_wage ? (
                                  <div className="space-y-0.5">
                                    <span className="font-mono font-bold text-indigo-950 block">
                                      ฿{job.expected_wage.toLocaleString()}
                                    </span>
                                    <span className="font-mono text-xs text-stone-500">
                                      /{job.wage_unit === 'month' ? 'เดือน' : job.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                                    </span>
                                  </div>
                                ) : (
                                  'ตามตกลง'
                                )
                              ) : (
                                details?.expected_wage_min !== undefined ? (
                                  <div className="space-y-0.5">
                                    <span className="font-mono font-bold text-indigo-950 block">
                                      ฿{details.expected_wage_min.toLocaleString()} - {details.expected_wage_max.toLocaleString()}
                                    </span>
                                    <span className="font-mono text-xs text-stone-500">
                                      /{details.wage_unit === 'month' ? 'เดือน' : details.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                                    </span>
                                  </div>
                                ) : (
                                  '-'
                                )
                              )}
                            </td>
                          );
                        })}
                    </tr>

                    {/* Location */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'สถานที่ทำงาน' : 'สถานที่พักอาศัย'}
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, job } = favItem as any;
                          return (
                            <td key={favorite.id} className="p-3 text-center font-mono text-stone-700">
                              {currentUser.role === 'caregiver'
                                ? (job ? `เขต${job.district}` : '-')
                                : (details?.home_district ? `เขต${details.home_district}` : '-')}
                            </td>
                          );
                        })}
                    </tr>

                    {/* Work Arrangement */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">รูปแบบงาน</td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, job } = favItem as any;
                          const arrangement = currentUser.role === 'caregiver'
                            ? job?.work_arrangement
                            : details?.work_arrangements?.[0] || 'live_in';
                          return (
                            <td key={favorite.id} className="p-3 text-center">
                              <span className="px-2.5 py-1 bg-stone-100 border border-stone-300 text-xs font-mono font-bold inline-block">
                                {arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'}
                              </span>
                            </td>
                          );
                        })}
                    </tr>

                    {/* Certifications (Family view only) */}
                    {currentUser.role !== 'caregiver' && (
                      <tr>
                        <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">ใบประกาศนียบัตร</td>
                        {favorites
                          .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                          .map((favItem) => {
                            const { favorite, certs } = favItem as any;
                            return (
                              <td key={favorite.id} className="p-3 text-center">
                                {certs && certs.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-sm">
                                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                    มีใบรับรอง ({certs.length} ฉบับ)
                                  </span>
                                ) : (
                                  <span className="text-stone-400">ไม่มีเอกสาร</span>
                                )}
                              </td>
                            );
                          })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t-2 border-indigo-950 bg-[#FAF9F6] flex items-center justify-between">
                <span className="text-xs text-stone-500 font-mono">
                  {currentUser.role === 'caregiver'
                    ? 'สามารถกลับไปหน้า Swipe เพื่อตัดสินใจเลือกงาน'
                    : 'สามารถกลับไปหน้า Swipe เพื่อตัดสินใจเลือกผู้ดูแล'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCompareModal(false)}
                    className="px-4 py-2 bg-white text-indigo-950 font-bold text-xs border border-indigo-950 hover:bg-stone-50 cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <Link
                    href={currentUser.role === 'caregiver' ? '/caregiver/jobs' : '/family/applicants'}
                    className="px-4 py-2 bg-indigo-950 hover:bg-[#2E1065] text-white font-bold text-xs border border-indigo-950 riso-shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{currentUser.role === 'caregiver' ? 'ไปหน้าหางาน (Swipe UI)' : 'ไปหน้าหาผู้ดูแล (Swipe UI)'}</span>
                    <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Compare Mutual Matches */}
        {showMutualCompareModal && (
          <div className="fixed inset-0 z-50 bg-indigo-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white border-4 border-indigo-950 max-w-4xl w-full riso-shadow-xl my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b-2 border-indigo-950 flex items-center justify-between bg-[#FAF9F6]">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
                    MUTUAL MATCHES COMPARISON MATRIX
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-indigo-950 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-[#D946EF]" />
                    <span>เปรียบเทียบ{currentUser.role === 'caregiver' ? 'งานที่จับคู่แล้ว' : 'ผู้ดูแลที่จับคู่แล้ว'} ({selectedMutualForCompare.length} {currentUser.role === 'caregiver' ? 'งาน' : 'ท่าน'})</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMutualCompareModal(false)}
                  className="p-1.5 text-stone-500 hover:text-indigo-950 hover:bg-stone-200 border border-transparent hover:border-indigo-950 transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Comparison Table */}
              <div className="p-4 sm:p-6 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-indigo-950 bg-stone-50">
                      <th className="p-3 font-mono font-bold text-stone-500 w-36 shrink-0">เกณฑ์เปรียบเทียบ</th>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, otherProfile, details, fit_score, job }) => (
                          <th key={match.id} className="p-3 text-center min-w-[180px] sm:min-w-[200px]">
                            <div className="flex flex-col items-center space-y-2">
                              {otherProfile?.avatar_url || details?.avatar_url ? (
                                <img
                                  src={otherProfile?.avatar_url || details?.avatar_url || ''}
                                  alt={otherProfile?.display_name || 'คู่แมตช์'}
                                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-2 border-indigo-950 bg-white riso-shadow-sm"
                                />
                              ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-950 text-white font-mono font-black text-3xl sm:text-4xl flex items-center justify-center border-2 border-indigo-950 riso-shadow-sm">
                                  {getNameInitial(otherProfile?.display_name || 'ผ', currentUser.role === 'caregiver' ? 'ว' : 'ผ')}
                                </div>
                              )}
                              <span className="font-bold text-indigo-950 text-sm sm:text-base text-center leading-snug">{otherProfile?.display_name}</span>
                            </div>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {/* AI Fit Score Row */}
                    <tr className="bg-purple-50/60">
                      <td className="p-3 font-bold text-indigo-950 bg-purple-100/70">
                        <div className="flex items-center gap-1.5">
                          <SparklesIcon className="w-3.5 h-3.5 text-[#D946EF]" />
                          <span>คะแนนตรงตามเงื่อนไข</span>
                        </div>
                      </td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, fit_score }) => (
                          <td key={match.id} className="p-3 text-center">
                            <span className="font-mono font-black text-lg sm:text-xl text-[#D946EF] inline-block px-3 py-1 bg-white border-2 border-indigo-950 riso-shadow-sm">
                              {fit_score}%
                            </span>
                          </td>
                        ))}
                    </tr>

                    {/* Gender & Age Row */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        เพศ / อายุ
                      </td>
                      {favorites
                        .filter((f) => selectedForCompare.includes(f.favorite.caregiver_id))
                        .map((favItem) => {
                          const { favorite, details, caregiver, family_gender, family_age } = favItem as any;
                          const isCg = currentUser.role === 'caregiver';
                          const genderDisplay = isCg
                            ? family_gender || '-'
                            : details?.gender === 'female' || caregiver?.gender === 'female'
                            ? 'หญิง'
                            : details?.gender === 'male' || caregiver?.gender === 'male'
                            ? 'ชาย'
                            : '-';
                          const ageDisplay = isCg
                            ? (family_age ? `${family_age} ปี` : '-')
                            : (details?.age ? `${details.age} ปี` : '-');

                          return (
                            <td key={favorite.id} className="p-3 text-center text-stone-800 font-bold text-xs">
                              <span className="inline-block px-2 py-0.5 bg-stone-100 border border-stone-300">
                                {genderDisplay !== '-' ? `เพศ${genderDisplay}` : 'ไม่ระบุเพศ'}
                                {ageDisplay !== '-' ? ` • ${ageDisplay}` : ''}
                              </span>
                            </td>
                          );
                        })}
                    </tr>

                    {/* Role / Case needs */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'เคสที่ต้องการ' : 'บทบาท / ตำแหน่ง'}
                      </td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, details, otherProfile, skills }) => (
                          <td key={match.id} className="p-3 text-center text-stone-800 font-medium">
                            {currentUser.role === 'caregiver' ? (
                              <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                                {skills && skills.length > 0 ? (
                                  skills.map((s) => (
                                    <span key={s.id} className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 text-xs">
                                      {CASE_TYPES_V3[s.case_type]?.short_label_th || s.case_type}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-stone-400">-</span>
                                )}
                              </div>
                            ) : (
                              details?.care_roles?.map((r) => CARE_ROLES_META[r]?.label_th || r).join(', ') || (otherProfile?.role === 'caregiver' ? 'ผู้ดูแลผู้สูงอายุ' : '-')
                            )}
                          </td>
                        ))}
                    </tr>

                    {/* Experience or Distance */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'พื้นที่ / ระยะทาง' : 'ประสบการณ์'}
                      </td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, details, job }) => (
                          <td key={match.id} className="p-3 text-center font-mono font-bold text-indigo-950 text-sm">
                            {currentUser.role === 'caregiver'
                              ? (job ? `เขต${job.district}` : '-')
                              : (details?.years_experience !== undefined ? `${details.years_experience} ปี` : '-')}
                          </td>
                        ))}
                    </tr>

                    {/* Expected Wage / Budget */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'งบประมาณค่าจ้าง' : 'ค่าจ้างคาดหวัง'}
                      </td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, details, job }) => (
                          <td key={match.id} className="p-3 text-center">
                            {currentUser.role === 'caregiver' ? (
                              job?.expected_wage ? (
                                <div className="space-y-0.5">
                                  <span className="font-mono font-bold text-indigo-950 block">
                                    ฿{job.expected_wage.toLocaleString()}
                                  </span>
                                  <span className="font-mono text-xs text-stone-500">
                                    /{job.wage_unit === 'month' ? 'เดือน' : job.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                                  </span>
                                </div>
                              ) : (
                                'ตามตกลง'
                              )
                            ) : (
                              details?.expected_wage_min !== undefined ? (
                                <div className="space-y-0.5">
                                  <span className="font-mono font-bold text-indigo-950 block">
                                    ฿{details.expected_wage_min.toLocaleString()} - {details.expected_wage_max.toLocaleString()}
                                  </span>
                                  <span className="font-mono text-xs text-stone-500">
                                    /{details.wage_unit === 'month' ? 'เดือน' : details.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                                  </span>
                                </div>
                              ) : (
                                '-'
                              )
                            )}
                          </td>
                        ))}
                    </tr>

                    {/* Location */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'สถานที่ทำงาน' : 'สถานที่พักอาศัย'}
                      </td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, details, job }) => (
                          <td key={match.id} className="p-3 text-center font-mono text-stone-700">
                            {currentUser.role === 'caregiver'
                              ? (job ? `เขต${job.district}, ${job.province}` : '-')
                              : (details?.home_district ? `เขต${details.home_district}` : job ? `เขต${job.district}` : '-')}
                          </td>
                        ))}
                    </tr>

                    {/* Work Arrangement */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">รูปแบบงานที่รับ</td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, details, job }) => {
                          const arrangement = currentUser.role === 'caregiver'
                            ? job?.work_arrangement
                            : details?.work_arrangements?.[0] || 'live_in';
                          return (
                            <td key={match.id} className="p-3 text-center">
                              <span className="px-2.5 py-1 bg-stone-100 border border-stone-300 text-xs font-mono font-bold inline-block">
                                {arrangement === 'live_in' ? 'อยู่ประจำ' : 'ไป-กลับ'}
                              </span>
                            </td>
                          );
                        })}
                    </tr>

                    {/* Certifications / Contact Info Status */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">
                        {currentUser.role === 'caregiver' ? 'สถานะการติดต่อ' : 'ใบประกาศนียบัตร'}
                      </td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, certs }) => (
                          <td key={match.id} className="p-3 text-center">
                            {currentUser.role === 'caregiver' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-sm">
                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                ปลดล็อกเบอร์โทรแล้ว
                              </span>
                            ) : (
                              certs && certs.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-sm">
                                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  มีใบรับรอง ({certs.length} ฉบับ)
                                </span>
                              ) : (
                                <span className="text-stone-400">ไม่มีเอกสาร</span>
                              )
                            )}
                          </td>
                        ))}
                    </tr>

                    {/* Case Skills */}
                    <tr>
                      <td className="p-3 font-bold text-indigo-950 bg-stone-50/50">ทักษะเคสการดูแล</td>
                      {mutualMatches
                        .filter((m) => selectedMutualForCompare.includes(m.match.id))
                        .map(({ match, skills }) => (
                          <td key={match.id} className="p-3 text-center">
                            <div className="flex flex-wrap justify-center gap-1 max-w-[220px] mx-auto">
                              {skills && skills.length > 0 ? (
                                skills.map((s) => (
                                  <span
                                    key={s.id}
                                    className="px-1.5 py-0.5 bg-[#FAF9F6] border border-indigo-950 text-xs font-bold text-indigo-950"
                                  >
                                    {CASE_TYPES_V3[s.case_type]?.short_label_th || s.case_type}
                                  </span>
                                ))
                              ) : (
                                <span className="text-stone-400">-</span>
                              )}
                            </div>
                          </td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t-2 border-indigo-950 bg-[#FAF9F6] flex items-center justify-between">
                <span className="text-xs text-stone-500 font-mono">
                  เปรียบเทียบข้อมูลคู่แมตช์ที่ตอบรับตรงกันแล้ว
                </span>
                <button
                  type="button"
                  onClick={() => setShowMutualCompareModal(false)}
                  className="px-4 py-2 bg-indigo-950 hover:bg-[#2E1065] text-white font-bold text-xs border border-indigo-950 riso-shadow-sm cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Platform evaluation form (Objective 1 · platform_reviews) */}
        <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-5">
          <div className="border-b-2 border-indigo-950 pb-4 space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
              แบบประเมินการใช้งาน · ใช้เวลาไม่ถึง 1 นาที
            </span>
            <h3 className="text-xl font-black text-indigo-950">
              ช่วยบอกเราหน่อย ใช้งาน JobGist แล้วเป็นอย่างไรบ้าง
            </h3>
            <p className="text-xs text-stone-600">
              ให้คะแนน 1–5 ทุกข้อ (1 = ไม่เห็นด้วยเลย, 5 = เห็นด้วยมาก) คำตอบใช้เพื่อปรับปรุงระบบเท่านั้น
            </p>
          </div>

          {reviewSubmitted ? (
            <div className="p-4 bg-emerald-100 border-2 border-emerald-900 text-emerald-950 font-bold text-sm text-center riso-shadow-sm">
              ✓ ขอบคุณสำหรับคำตอบค่ะ
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-5">
              {reviewQuestions.map((q, i) => (
                <fieldset key={q.key} className="space-y-1.5">
                  <legend className="text-sm font-bold text-indigo-950">
                    {i + 1}. {q.label}
                  </legend>
                  <div className="flex items-center gap-2" role="radiogroup" aria-label={q.label}>
                    {[1, 2, 3, 4, 5].map((val) => {
                      const selected = reviewScores[q.key] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setReviewScores((p) => ({ ...p, [q.key]: val }))}
                          className={`w-11 h-11 border-2 border-indigo-950 font-mono font-bold text-sm riso-btn-active ${
                            selected
                              ? 'bg-[#1E1B4B] text-white riso-shadow-sm'
                              : 'bg-white text-indigo-950 hover:bg-stone-50'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between w-[15.5rem] text-[11px] text-stone-500">
                    <span>ไม่เห็นด้วยเลย</span>
                    <span>เห็นด้วยมาก</span>
                  </div>
                </fieldset>
              ))}

              <div className="space-y-1">
                <label htmlFor="review-comment" className="text-sm font-bold text-indigo-950 block">
                  ตรงไหนที่ใช้งานแล้วงง หรือติดขัด? <span className="font-normal text-stone-500">(ไม่บังคับ)</span>
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="เช่น ไม่แน่ใจว่าต้องกดตรงไหนต่อ หรือข้อความบางส่วนอ่านไม่เข้าใจ"
                  className="w-full p-3 text-sm bg-white border-2 border-indigo-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={reviewQuestions.some((q) => !reviewScores[q.key])}
                className="min-h-[44px] px-6 py-2.5 bg-indigo-950 text-white font-black text-sm border-2 border-indigo-950 riso-shadow hover:bg-[#2E1065] riso-btn-active disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ส่งแบบประเมิน
              </button>
            </form>
          )}
        </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
          <Topbar />
          <div className="flex-1 bg-[#735095] flex items-center justify-center p-8">
            <div className="p-6 bg-white border-2 border-indigo-950 riso-shadow font-mono text-indigo-950 font-bold">
              กำลังโหลดข้อมูลการจับคู่...
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <MatchesContent />
    </Suspense>
  );
}
