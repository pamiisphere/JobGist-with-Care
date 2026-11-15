'use client';

import React, { useState, Suspense } from 'react';
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
} from '@/services/api';
import { useToast } from '@/components/Toast';
import {
  HeartIcon,
  CloseIcon,
  SparklesIcon,
  StarIcon,
  CheckIcon,
  ChevronRightIcon,
  MessageSquareIcon,
} from '@/components/Icons';

function ApplicantsContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || 'job-1-wanwimon';

  const [candidates, setCandidates] = useState<CandidateCaregiverCard[]>(() => {
    return candidateCaregivers(jobId, 50);
  });
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateCaregiverCard | null>(() => {
    const list = candidateCaregivers(jobId, 50);
    return list[0] || null;
  });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { showToast } = useToast();
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [sortBy, setSortBy] = useState<'fit' | 'experience'>('fit');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchNotice, setMatchNotice] = useState<{
    show: boolean;
    name: string;
  }>({ show: false, name: '' });

  // Direct Message Dialog state (Features by page)
  const [messageTarget, setMessageTarget] = useState<CandidateCaregiverCard | null>(null);
  const [messageText, setMessageText] = useState('');

  const openSendMessage = (candidate: CandidateCaregiverCard) => {
    setMessageTarget(candidate);
    const matched = candidate.matched_cases.map((mc) => CASE_TYPES_V3[mc]?.short_label_th).join(', ');
    setMessageText(
      `สวัสดีค่ะ สนใจสอบถามงานดูแลผู้ป่วย ${matched ? `เคส${matched}` : ''} สะดวกคุยรายละเอียดเพิ่มเติมหรือเริ่มงานช่วงไหนคะ?`
    );
  };

  const handleSendMessage = () => {
    if (!messageTarget || !messageText.trim()) return;
    try {
      const msgs = JSON.parse(localStorage.getItem('jg_msgs') || '[]');
      msgs.push({
        id: Date.now(),
        to: messageTarget.caregiver_id,
        caregiver_name: messageTarget.display_name,
        text: messageText,
        sent_at: new Date().toISOString(),
      });
      localStorage.setItem('jg_msgs', JSON.stringify(msgs));
      showToast('ส่งข้อความสำเร็จ', `ส่งข้อความหา ${messageTarget.display_name} เรียบร้อยแล้ว`);
    } catch {
      showToast('ส่งข้อความสำเร็จ', `ส่งข้อความหา ${messageTarget.display_name} เรียบร้อยแล้ว`);
    }
    setMessageTarget(null);
  };

  // Handle Swipe actions (Like or Pass)
  const handleDecision = (candidate: CandidateCaregiverCard, decision: 'like' | 'pass') => {
    const { isMatch } = swipeCaregiver(jobId, candidate.caregiver_id, decision);

    if (decision === 'like') {
      if (isMatch) {
        setMatchNotice({ show: true, name: candidate.display_name });
        showToast('จับคู่สำเร็จ!', `คุณและ ${candidate.display_name} กดถูกใจตรงกันแล้ว`, 'match');
      } else {
        showToast('บันทึกความสนใจ', `กดถูกใจ ${candidate.display_name} เรียบร้อยแล้ว`);
      }
    } else {
      showToast('ข้ามผู้สมัคร', `ข้าม ${candidate.display_name} แล้ว`, 'info');
    }

    // Remove candidate from list
    setCandidates((prev) => prev.filter((c) => c.caregiver_id !== candidate.caregiver_id));
    if (selectedCandidate?.caregiver_id === candidate.caregiver_id) {
      const remaining = candidates.filter((c) => c.caregiver_id !== candidate.caregiver_id);
      setSelectedCandidate(remaining[0] || null);
    }
    setCompareIds((prev) => prev.filter((id) => id !== candidate.caregiver_id));
  };

  // Toggle Favorite
  const handleToggleFavorite = (candidateId: string) => {
    const cur = getCurrentUser();
    const isFav = toggleFavorite(cur.id, candidateId);
    showToast(isFav ? 'บันทึกในรายการโปรด' : 'นำออกจากรายการโปรด');
    setCandidates((prev) =>
      prev.map((c) => (c.caregiver_id === candidateId ? { ...c, is_favorite: isFav } : c))
    );
    if (selectedCandidate?.caregiver_id === candidateId) {
      setSelectedCandidate((prev) => (prev ? { ...prev, is_favorite: isFav } : null));
    }
  };

  // Toggle comparison selection (max 3)
  const handleToggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((item) => item !== id));
    } else {
      if (compareIds.length >= 3) {
        alert('สามารถเลือกเปรียบเทียบได้สูงสุด 3 คน');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  // Filter & Sort
  const filteredCandidates = candidates
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchName = c.display_name.toLowerCase().includes(q);
      const matchDistrict = c.home_district.toLowerCase().includes(q);
      const matchSkills = c.matched_cases.some((m) =>
        CASE_TYPES_V3[m]?.title_th.toLowerCase().includes(q)
      );
      return matchName || matchDistrict || matchSkills;
    })
    .sort((a, b) => {
      if (sortBy === 'fit') {
        if (a.caregiver_liked !== b.caregiver_liked) return a.caregiver_liked ? -1 : 1;
        return b.fit_score - a.fit_score;
      } else {
        return b.years_experience - a.years_experience;
      }
    });

  const comparedCaregivers = candidates.filter((c) => compareIds.includes(c.caregiver_id));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      <main className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Summary Bar */}
        <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] px-2 py-0.5 bg-[#FAF9F6] border border-indigo-950">
                RPC CANDIDATE_CAREGIVERS • COST-FIRST AI
              </span>
              <span className="text-xs font-mono text-stone-500">
                พบผู้สมัคร {candidates.length} คน
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
              ผู้สมัครที่ตรงกับความต้องการของคุณ
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              จัดอันดับด้วย AI Fit Score (เต็ม 99) และวิเคราะห์ข้อดี-จุดที่ควรสอบถามก่อนจ้างงานจริง
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เขต, ทักษะ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] px-3.5 text-xs bg-[#FAF9F6] border-2 border-indigo-950 focus:outline-none"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'fit' | 'experience')}
              className="min-h-[44px] px-3 text-xs font-mono font-bold bg-white border-2 border-indigo-950"
            >
              <option value="fit">เรียงตาม: ความเหมาะสม (Fit Score)</option>
              <option value="experience">เรียงตาม: ประสบการณ์ (ปี)</option>
            </select>
          </div>
        </div>

        {/* Mutual Match Banner */}
        {matchNotice.show && (
          <div className="bg-pink-100 border-2 border-[#D946EF] p-4 text-center riso-shadow-sm space-y-2 animate-in fade-in zoom-in-95">
            <h3 className="font-black text-lg text-pink-950">
              🎉 ยินดีด้วย! คุณและ {matchNotice.name} จับคู่สำเร็จ (Mutual Match)
            </h3>
            <p className="text-xs text-pink-900 font-medium">
              ระบบปลดล็อกเบอร์โทรศัพท์และ LINE ID เรียบร้อยแล้ว สามารถดูได้ที่ศูนย์การจับคู่
            </p>
            <div className="pt-1">
              <Link
                href="/matches"
                className="inline-block min-h-[40px] px-4 py-2 bg-indigo-950 text-white font-bold text-xs border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065]"
              >
                ไปที่ศูนย์การจับคู่ (Matches Center) →
              </Link>
            </div>
          </div>
        )}

        {/* 2-Column Layout: Left Candidate List & Right Sticky Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Candidate Cards */}
          <div className="lg:col-span-7 space-y-4">
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((c) => {
                const isSelected = selectedCandidate?.caregiver_id === c.caregiver_id;
                const isComparing = compareIds.includes(c.caregiver_id);

                return (
                  <div
                    key={c.caregiver_id}
                    onClick={() => setSelectedCandidate(c)}
                    className={`bg-white border-2 border-indigo-950 p-5 riso-shadow cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#D946EF] translate-x-[2px] translate-y-[2px] riso-shadow-none'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    {/* Top Row: Liked by Caregiver Badge & Compare Checkbox */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        {c.caregiver_liked && (
                          <span className="px-2 py-0.5 bg-pink-100 text-[#D946EF] border border-[#D946EF] font-mono text-[11px] font-bold flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" />
                            ผู้ดูแลกดสนใจงานคุณแล้ว
                          </span>
                        )}
                        <span className="text-xs font-mono text-stone-500">
                          ห่าง {c.distance_km} กม.
                        </span>
                      </div>

                      {/* Compare Checkbox */}
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer select-none text-indigo-950"
                      >
                        <input
                          type="checkbox"
                          checked={isComparing}
                          onChange={() => handleToggleCompare(c.caregiver_id)}
                          className="w-4 h-4 accent-[#D946EF]"
                        />
                        <span>เปรียบเทียบ</span>
                      </label>
                    </div>

                    {/* Middle Row: Avatar, Name, Score */}
                    <div className="flex items-start justify-between gap-3 pt-3">
                      <div className="flex items-start gap-3">
                        <div className="w-13 h-13 bg-indigo-950 text-white font-mono font-bold text-lg flex items-center justify-center border-2 border-indigo-950 shrink-0">
                          {c.display_name.slice(0, 2)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-lg text-indigo-950">
                              {c.display_name}
                            </h3>
                            {c.has_certificates && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-900 text-[10px] font-bold">
                                มีใบรับรอง
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-600 font-mono">
                            {c.care_roles.map((r) => CARE_ROLES_META[r]?.abbr || r).join(', ')} • ประสบการณ์ {c.years_experience} ปี • {c.home_district}
                          </p>
                          <p className="text-xs font-mono font-bold text-[#D946EF] mt-0.5">
                            ฿{c.expected_wage_min.toLocaleString()} - {c.expected_wage_max.toLocaleString()} /
                            {c.wage_unit === 'month' ? 'เดือน' : c.wage_unit === 'day' ? 'วัน' : 'ชม.'}
                          </p>
                        </div>
                      </div>

                      {/* Score Circle / Badge */}
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-[#FAF9F6] border-2 border-indigo-950 text-indigo-950 shrink-0 riso-shadow-sm">
                        <span className="text-xl font-black font-mono leading-none text-[#D946EF]">
                          {c.fit_score}%
                        </span>
                        <span className="text-[9px] font-mono font-bold text-stone-500 uppercase mt-0.5">
                          FIT SCORE
                        </span>
                      </div>
                    </div>

                    {/* AI Short Summary */}
                    <p className="text-xs text-stone-700 leading-relaxed pt-2.5 line-clamp-2">
                      {c.ai_summary}
                    </p>

                    {/* Matched Case Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {c.matched_cases.map((mc) => (
                        <span
                          key={mc}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-900 text-[11px] font-bold"
                        >
                          ✓ {CASE_TYPES_V3[mc]?.short_label_th || mc}
                        </span>
                      ))}
                      {c.missing_cases.slice(0, 2).map((missing) => (
                        <span
                          key={missing}
                          className="px-2 py-0.5 bg-stone-100 text-stone-500 border border-stone-300 text-[11px]"
                        >
                          ? {CASE_TYPES_V3[missing]?.short_label_th || missing}
                        </span>
                      ))}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="flex items-center justify-between border-t border-stone-200 mt-4 pt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(c.caregiver_id);
                        }}
                        className="text-xs font-mono font-bold flex items-center gap-1 text-stone-600 hover:text-indigo-950"
                      >
                        <StarIcon
                          className={`w-4 h-4 ${c.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`}
                        />
                        <span>{c.is_favorite ? 'บันทึกแล้ว' : 'บันทึก'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSendMessage(c);
                          }}
                          className="min-h-[38px] px-3 py-1 text-xs font-bold bg-white text-indigo-950 border border-indigo-950 hover:bg-stone-50 riso-shadow-sm riso-btn-active flex items-center gap-1"
                        >
                          <MessageSquareIcon className="w-3.5 h-3.5 text-indigo-950" />
                          <span>ส่งข้อความ</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecision(c, 'pass');
                          }}
                          className="min-h-[38px] px-3.5 py-1 text-xs font-bold bg-white text-stone-600 border border-indigo-950 hover:bg-stone-100 riso-btn-active"
                        >
                          ข้าม (Pass)
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecision(c, 'like');
                          }}
                          className="min-h-[38px] px-4 py-1 text-xs font-black bg-[#D946EF] text-white border border-indigo-950 hover:bg-[#c026d3] riso-shadow-sm riso-btn-active flex items-center gap-1"
                        >
                          <HeartIcon className="w-3.5 h-3.5" />
                          <span>สนใจ (Like)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border-2 border-indigo-950 p-12 text-center riso-shadow space-y-3">
                <p className="text-stone-600 text-sm">ไม่พบผู้สมัครที่ตรงกับเงื่อนไขการค้นหา</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-indigo-950 text-white font-bold text-xs border border-indigo-950"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Candidate Detail Drawer */}
          <div className="lg:col-span-5 sticky top-20">
            {selectedCandidate ? (
              <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-xl space-y-5">
                {/* Header Row */}
                <div className="flex items-start justify-between border-b-2 border-indigo-950 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D946EF] block">
                      CANDIDATE SPEC SHEET
                    </span>
                    <h2 className="text-xl font-black text-indigo-950">
                      {selectedCandidate.display_name}
                    </h2>
                    <p className="text-xs text-stone-600 font-mono">
                      {selectedCandidate.home_district}, {selectedCandidate.home_province} (ห่าง {selectedCandidate.distance_km} กม.)
                    </p>
                  </div>

                  <div className="text-center bg-[#FAF9F6] border-2 border-indigo-950 p-2.5 shrink-0">
                    <span className="text-2xl font-black font-mono text-[#D946EF] block">
                      {selectedCandidate.fit_score}%
                    </span>
                    <span className="text-[9px] font-mono font-bold text-stone-500 uppercase block">
                      FIT SCORE
                    </span>
                  </div>
                </div>

                {/* AI Summary Breakdown */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                    บทวิเคราะห์ความเหมาะสม (AI Fit Analysis)
                  </span>
                  <p className="text-xs text-stone-800 leading-relaxed bg-[#FAF9F6] border border-indigo-950 p-3">
                    {selectedCandidate.ai_summary}
                  </p>
                </div>

                {/* Pros */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1 font-mono uppercase">
                    <CheckIcon className="w-4 h-4 text-emerald-700" />
                    ข้อดีที่ตรงกับงานนี้:
                  </span>
                  <ul className="space-y-1 text-xs">
                    {selectedCandidate.pros.map((pro, i) => (
                      <li key={i} className="p-2 bg-emerald-50 border border-emerald-900/30 text-emerald-950">
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Points to Verify */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1 font-mono uppercase">
                    ⚠️ ประเด็นที่ควรสอบถามเพิ่มเติม:
                  </span>
                  <ul className="space-y-1 text-xs">
                    {selectedCandidate.to_verify.map((item, i) => (
                      <li key={i} className="p-2 bg-amber-50 border border-amber-900/30 text-amber-950">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Certificates */}
                {selectedCandidate.certificates.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 block">
                      ใบรับรองที่ผ่านการตรวจสอบ:
                    </span>
                    <div className="space-y-1">
                      {selectedCandidate.certificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="p-2 bg-white border border-indigo-950 text-xs flex items-center justify-between"
                        >
                          <span className="truncate font-bold text-indigo-950">{cert.file_name}</span>
                          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.2 shrink-0">
                            ✓ {cert.verification_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Big Action Buttons */}
                <div className="space-y-2 border-t-2 border-indigo-950 pt-4">
                  <button
                    type="button"
                    onClick={() => openSendMessage(selectedCandidate)}
                    className="w-full min-h-[44px] bg-white text-indigo-950 border-2 border-indigo-950 font-black text-xs hover:bg-stone-50 riso-shadow-sm riso-btn-active flex items-center justify-center gap-1.5"
                  >
                    <MessageSquareIcon className="w-4 h-4 text-indigo-950" />
                    <span>ส่งข้อความนัดคุยรายละเอียด (Send Message)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleDecision(selectedCandidate, 'pass')}
                      className="min-h-[48px] bg-white text-stone-700 border-2 border-indigo-950 font-bold text-xs hover:bg-stone-50 riso-shadow-sm riso-btn-active"
                    >
                      ข้ามผู้สมัครนี้
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision(selectedCandidate, 'like')}
                      className="min-h-[48px] bg-[#D946EF] text-white border-2 border-indigo-950 font-black text-xs hover:bg-[#c026d3] riso-shadow riso-btn-active flex items-center justify-center gap-1.5"
                    >
                      <HeartIcon className="w-4 h-4 text-white" />
                      <span>สนใจผู้ดูแลคนนี้</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-indigo-950 p-8 text-center text-xs text-stone-500 riso-shadow">
                เลือกผู้สมัครทางซ้ายเพื่อดูรายละเอียดเชิงลึก
              </div>
            )}
          </div>
        </div>

        {/* Floating Bottom Comparison Bar */}
        {compareIds.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-indigo-950 text-white p-4 border-2 border-white riso-shadow-xl z-40 flex items-center justify-between animate-in slide-in-from-bottom-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D946EF] font-mono font-bold text-xs flex items-center justify-center text-white">
                {compareIds.length}
              </span>
              <span className="text-xs sm:text-sm font-bold">
                เลือกผู้สมัครไว้ {compareIds.length} คน (สูงสุด 3 คน)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs underline text-stone-300 hover:text-white px-2 py-1"
              >
                ล้าง
              </button>
              <button
                type="button"
                disabled={compareIds.length < 2}
                onClick={() => setShowCompareModal(true)}
                className={`min-h-[44px] px-4 py-2 font-black text-xs border border-white riso-shadow-sm flex items-center gap-1.5 ${
                  compareIds.length >= 2
                    ? 'bg-[#D946EF] text-white hover:bg-[#c026d3] riso-btn-active'
                    : 'bg-stone-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <span>เปิดตารางเปรียบเทียบ</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Comparison Modal */}
        {showCompareModal && (
          <div className="fixed inset-0 bg-indigo-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border-4 border-indigo-950 p-6 sm:p-8 max-w-4xl w-full riso-shadow-xl space-y-6 my-8">
              <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF]">
                    SIDE-BY-SIDE SPEC COMPARISON
                  </span>
                  <h3 className="text-2xl font-black text-indigo-950">
                    ตารางเปรียบเทียบผู้สมัคร ({comparedCaregivers.length} คน)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="w-10 h-10 border-2 border-indigo-950 bg-white hover:bg-stone-100 flex items-center justify-center riso-shadow-sm"
                >
                  <CloseIcon className="w-5 h-5 text-indigo-950" />
                </button>
              </div>

              {/* Spec Comparison Table */}
              <div className="overflow-x-auto border-2 border-indigo-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b-2 border-indigo-950">
                      <th className="p-3 font-mono font-bold border-r border-indigo-950 w-36">
                        หัวข้อเปรียบเทียบ
                      </th>
                      {comparedCaregivers.map((c) => (
                        <th key={c.caregiver_id} className="p-3 font-bold border-r border-indigo-950 min-w-[200px]">
                          <span className="text-base font-black text-indigo-950 block">
                            {c.display_name}
                          </span>
                          <span className="text-[11px] font-mono text-[#D946EF] font-bold">
                            Fit Score: {c.fit_score}%
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-950/30">
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">บทบาท</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950">
                          {c.care_roles.map((r) => CARE_ROLES_META[r]?.label_th || r).join(', ')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">ประสบการณ์</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950 font-mono font-bold">
                          {c.years_experience} ปี
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">พื้นที่ & ระยะทาง</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950 font-mono">
                          {c.home_district} (ห่าง {c.distance_km} กม.)
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">ค่าจ้างคาดหวัง</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950 font-mono font-bold text-[#D946EF]">
                          ฿{c.expected_wage_min.toLocaleString()} - {c.expected_wage_max.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">ทักษะที่ตรงกัน</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950">
                          {c.matched_cases.map((mc) => CASE_TYPES_V3[mc]?.short_label_th).join(', ') || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">ใบรับรอง</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950">
                          {c.has_certificates ? `มี (${c.certificates.length} ฉบับ)` : 'ยังไม่มี'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-[#FAF9F6] border-r border-indigo-950">การตัดสินใจ</td>
                      {comparedCaregivers.map((c) => (
                        <td key={c.caregiver_id} className="p-3 border-r border-indigo-950">
                          <button
                            type="button"
                            onClick={() => {
                              handleDecision(c, 'like');
                              setShowCompareModal(false);
                            }}
                            className="min-h-[44px] w-full px-3 py-1.5 bg-[#D946EF] text-white font-bold text-xs border border-indigo-950 riso-shadow-sm hover:bg-[#c026d3]"
                          >
                            สนใจคนนี้ (Like)
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Direct Message Dialog Modal (Features by page) */}
        {messageTarget && (
          <div className="fixed inset-0 bg-indigo-950/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-indigo-950 p-6 sm:p-8 max-w-lg w-full riso-shadow-xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#D946EF] flex items-center justify-center text-white">
                    <MessageSquareIcon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-black text-lg text-indigo-950">
                    ส่งข้อความหา {messageTarget.display_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMessageTarget(null)}
                  className="w-8 h-8 border border-indigo-950 bg-white hover:bg-stone-100 flex items-center justify-center"
                >
                  <CloseIcon className="w-4 h-4 text-indigo-950" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-950 block font-mono">
                  ข้อความเริ่มต้น (สร้างจากความต้องการของงาน สามารถแก้ไขได้):
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3 text-xs bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] leading-relaxed"
                />
              </div>

              <p className="text-[11px] text-stone-500 font-mono">
                * บันทึกข้อความลงในเครื่อง (localStorage) สำหรับโหมดทดลองใช้งาน
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setMessageTarget(null)}
                  className="min-h-[44px] px-4 py-2 text-xs font-bold border border-indigo-950 bg-white hover:bg-stone-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="min-h-[44px] px-6 py-2 text-xs font-black bg-indigo-950 text-white border border-indigo-950 riso-shadow-sm hover:bg-[#2E1065] flex items-center gap-1.5 riso-btn-active"
                >
                  <span>ส่งข้อความ</span>
                  <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
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

export default function FamilyApplicantsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono">กำลังโหลดรายการผู้สมัคร...</div>}>
      <ApplicantsContent />
    </Suspense>
  );
}
