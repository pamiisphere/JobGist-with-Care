'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  getCurrentUser,
  getAllActiveMatchesForUser,
  getMatchContact,
  getNotifications,
  markNotificationRead,
  submitPlatformReview,
} from '@/services/api';
import { MatchContactInfo, NotificationRow } from '@/types/database';
import {
  PhoneIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BellIcon,
} from '@/components/Icons';
import { useToast } from '@/components/Toast';

export default function MatchesPage() {
  const { showToast } = useToast();
  const [currentUser] = useState(() => getCurrentUser());
  const [matches, setMatches] = useState<ReturnType<typeof getAllActiveMatchesForUser>>(() => {
    return getAllActiveMatchesForUser(getCurrentUser().id);
  });
  const [notifications, setNotifications] = useState<NotificationRow[]>(() => {
    return getNotifications(getCurrentUser().id);
  });
  const [revealedContacts, setRevealedContacts] = useState<Record<string, MatchContactInfo>>({});

  // 3-Question Platform Evaluation Form State
  const [easeScore, setEaseScore] = useState(5);
  const [clarityScore, setClarityScore] = useState(5);
  const [recommendScore, setRecommendScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    const handleReset = () => {
      const cur = getCurrentUser();
      setMatches(getAllActiveMatchesForUser(cur.id));
      setNotifications(getNotifications(cur.id));
    };
    window.addEventListener('jg_data_reset', handleReset);
    window.addEventListener('jg_user_changed', handleReset);
    return () => {
      window.removeEventListener('jg_data_reset', handleReset);
      window.removeEventListener('jg_user_changed', handleReset);
    };
  }, []);

  const handleRevealContact = (matchId: string) => {
    const info = getMatchContact(matchId, currentUser.id);
    if (info) {
      setRevealedContacts((prev) => ({ ...prev, [matchId]: info }));
      showToast('ปลดล็อกข้อมูลติดต่อแล้ว', `แสดงเบอร์โทรและ LINE ของ ${info.display_name}`, 'match');
    }
  };

  const handleMarkNotif = (notifId: string) => {
    markNotificationRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    submitPlatformReview({
      user_id: currentUser.id,
      ease_of_use_score: easeScore,
      clarity_score: clarityScore,
      recommendation_score: recommendScore,
      comment: reviewComment || null,
    });
    setReviewSubmitted(true);
    showToast('ขอบคุณสำหรับข้อเสนอแนะ', 'บันทึกแบบประเมินลงตาราง platform_reviews เรียบร้อยแล้ว');
  };

  const mutualMatches = matches.filter((m) => m.isMutual);
  const pendingMatches = matches.filter((m) => !m.isMutual);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full space-y-8">
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

          <div className="flex items-center gap-2 bg-[#FAF9F6] border-2 border-indigo-950 p-3 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-mono font-bold text-indigo-950">
              สถานะ: เข้าสู่ระบบในฐานะ {currentUser.display_name}
            </span>
          </div>
        </div>

        {/* Section 1: Notifications Feed */}
        {notifications.length > 0 && (
          <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                <BellIcon className="w-4 h-4 text-[#D946EF]" />
                การแจ้งเตือนล่าสุด ({notifications.filter((n) => !n.read_at).length} ข้อความใหม่)
              </span>
              <span className="text-[11px] font-mono text-stone-500">
                LINE Notification Sync: Active
              </span>
            </div>

            <div className="space-y-2.5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkNotif(notif.id)}
                  className={`p-3.5 border-2 border-indigo-950 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                    notif.read_at ? 'bg-white opacity-70' : 'bg-[#FAF9F6] riso-shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!notif.read_at && (
                        <span className="w-2 h-2 rounded-full bg-[#D946EF] shrink-0" />
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-indigo-950">{notif.title}</h4>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] font-mono text-stone-400 block pt-0.5">
                      {new Date(notif.created_at).toLocaleDateString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {!notif.read_at && (
                    <span className="text-[11px] font-mono text-[#D946EF] font-bold shrink-0">
                      อ่านแล้ว
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Mutual Matches (Unlocked Contacts) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-indigo-950 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-[#D946EF]" />
              <span>คู่ที่ตอบรับตรงกันแล้ว (Mutual Matches)</span>
              <span className="text-xs font-mono bg-[#D946EF] text-white px-2 py-0.5 rounded-full">
                {mutualMatches.length}
              </span>
            </h2>
            <span className="text-xs font-mono text-stone-500">จ้างตรง 0% ค่าธรรมเนียม</span>
          </div>

          {mutualMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mutualMatches.map(({ match, job, otherProfile }) => {
                const isRevealed = !!revealedContacts[match.id];
                const contactInfo = revealedContacts[match.id];

                return (
                  <div
                    key={match.id}
                    className="bg-white border-2 border-indigo-950 p-5 riso-shadow-lg space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#1E1B4B] text-white font-mono font-bold text-lg flex items-center justify-center border-2 border-indigo-950 shrink-0">
                            {otherProfile?.display_name.slice(0, 2) || 'คู่'}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-indigo-950">
                              {otherProfile?.display_name || 'คู่แมตช์'}
                            </h3>
                            <span className="text-xs font-mono text-stone-500 block">
                              {otherProfile?.role === 'caregiver' ? 'ผู้ดูแลผู้สูงอายุ' : 'ครอบครัวผู้ว่าจ้าง'}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-pink-100 text-[#D946EF] border border-[#D946EF] font-mono text-[10px] font-bold">
                          MATCHED ✓
                        </span>
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
                          <span className="text-[10px] text-stone-500 font-mono block">
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
                  href="/family/applicants"
                  className="inline-block min-h-[40px] px-4 py-2 bg-indigo-950 text-white font-bold text-xs border border-indigo-950"
                >
                  ค้นหาผู้สมัครงาน →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Pending Decisions */}
        {pendingMatches.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-bold uppercase text-stone-600">
              รายการที่อยู่ระหว่างรออีกฝ่ายตอบรับ ({pendingMatches.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingMatches.map(({ match, job, otherProfile }) => (
                <div
                  key={match.id}
                  className="bg-white border border-indigo-950 p-3.5 text-xs space-y-2 opacity-80"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950">
                      {otherProfile?.display_name || 'ผู้ใช้งาน'}
                    </span>
                    <span className="font-mono text-[10px] bg-stone-100 px-2 py-0.5 border border-stone-300">
                      รอการตอบรับ
                    </span>
                  </div>
                  <p className="text-stone-600 line-clamp-1">{job?.patient_description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: 3-Question Platform Evaluation Form (Schema v3: platform_reviews) */}
        <div className="bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-5">
          <div className="border-b-2 border-indigo-950 pb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
              EVALUATION & RESEARCH FEEDBACK (PLATFORM_REVIEWS)
            </span>
            <h3 className="text-xl font-black text-indigo-950">
              แบบประเมินความพึงพอใจการใช้งาน 3 ข้อ
            </h3>
            <p className="text-xs text-stone-600">
              ความคิดเห็นของคุณช่วยให้เราปรับปรุงคุณภาพการจับคู่ภาษาไทยและโมเดล AI ให้ดียิ่งขึ้น
            </p>
          </div>

          {reviewSubmitted ? (
            <div className="p-4 bg-emerald-100 border-2 border-emerald-900 text-emerald-950 font-bold text-xs text-center riso-shadow-sm space-y-1">
              <span className="text-base block">✓ ขอบคุณสำหรับข้อเสนอแนะ!</span>
              <p className="font-normal text-stone-600">
                ข้อมูลของคุณถูกบันทึกลงตาราง <code>platform_reviews</code> เรียบร้อยแล้ว
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Question 1: Ease of Use */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-950 block">
                  1. ความง่ายและความสะดวกในการตอบคำถาม / ค้นหา (1-5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEaseScore(val)}
                      className={`w-11 h-11 border-2 border-indigo-950 font-mono font-bold text-sm riso-btn-active ${
                        easeScore === val
                          ? 'bg-[#D946EF] text-white riso-shadow-sm'
                          : 'bg-white text-indigo-950 hover:bg-stone-50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                  <span className="text-xs font-mono text-stone-500 ml-2">
                    {easeScore === 5 ? 'ง่ายมาก ไม่ต้องพิมพ์เยอะ' : `${easeScore}/5`}
                  </span>
                </div>
              </div>

              {/* Question 2: Clarity of Profile & Fit Analysis */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-950 block">
                  2. ความชัดเจนของข้อความโปรไฟล์และคะแนน Fit Score ที่ AI สร้างให้ (1-5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setClarityScore(val)}
                      className={`w-11 h-11 border-2 border-indigo-950 font-mono font-bold text-sm riso-btn-active ${
                        clarityScore === val
                          ? 'bg-[#1E1B4B] text-white riso-shadow-sm'
                          : 'bg-white text-indigo-950 hover:bg-stone-50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                  <span className="text-xs font-mono text-stone-500 ml-2">
                    {clarityScore === 5 ? 'ชัดเจน เข้าใจง่าย มีเหตุผล' : `${clarityScore}/5`}
                  </span>
                </div>
              </div>

              {/* Question 3: Recommendation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-950 block">
                  3. ความพึงพอใจและโอกาสที่จะแนะนำผู้อื่นให้ใช้งานต่อ (1-5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRecommendScore(val)}
                      className={`w-11 h-11 border-2 border-indigo-950 font-mono font-bold text-sm riso-btn-active ${
                        recommendScore === val
                          ? 'bg-[#F59E0B] text-indigo-950 riso-shadow-sm'
                          : 'bg-white text-indigo-950 hover:bg-stone-50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                  <span className="text-xs font-mono text-stone-500 ml-2">
                    {recommendScore === 5 ? 'แนะนำแน่นอน ประหยัดค่านายหน้า' : `${recommendScore}/5`}
                  </span>
                </div>
              </div>

              {/* Optional Comment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-950 block">
                  ข้อเสนอแนะเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="เช่น อยากให้มีระบบนัดตรวจสุขภาพ หรือเพิ่มการกรองตามงบประมาณ..."
                  className="w-full p-3 text-xs bg-white border-2 border-indigo-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="min-h-[44px] px-6 py-2.5 bg-indigo-950 text-white font-black text-xs border-2 border-indigo-950 riso-shadow hover:bg-[#2E1065] riso-btn-active"
              >
                ส่งแบบประเมินความพึงพอใจ
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
