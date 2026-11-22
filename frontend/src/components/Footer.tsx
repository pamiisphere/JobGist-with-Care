'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resetPlatformData } from '@/services/api';

export default function Footer() {
  const router = useRouter();
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลทดลองทั้งหมดกลับสู่ค่าเริ่มต้นใช่หรือไม่?')) {
      resetPlatformData();
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        window.location.href = '/';
      }, 300);
    }
  };

  return (
    <footer className="mt-auto border-t-2 border-indigo-950 bg-[#F4F4F0] text-indigo-950 pt-10 pb-8 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand / Info */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-indigo-950">JobGist with Care</span>
            <span className="text-xs px-2 py-0.5 bg-[#D946EF] text-white font-mono font-bold border border-indigo-950">
              BETA
            </span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">
            แพลตฟอร์มจับคู่งานดูแลผู้สูงอายุและผู้ป่วยในประเทศไทยแบบสองฝั่ง จ้างตรง ไม่ผ่านนายหน้าหักหัวคิว
            แปลงความต้องการด้วย AI ภาษาไทย และคุ้มครองความเป็นส่วนตัวตามมาตรฐาน PDPA
          </p>
          <div className="text-xs font-mono text-stone-600 bg-white border border-indigo-950 p-2.5 riso-shadow-sm">
            <span className="font-bold text-[#D946EF] block mb-1">🔒 PDPA Data Isolation:</span>
            พิกัดบ้านและเบอร์โทรศัพท์ถูกเข้ารหัสซ่อนไว้ เจ้าของเห็นคนเดียว และจะเปิดเผยเฉพาะเมื่อทั้งสองฝ่ายกดถูกใจตรงกัน (Mutual Match) เท่านั้น
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider mb-3 text-indigo-950 font-mono">
            เส้นทางผู้ดูแล
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/caregiver/onboarding" className="hover:text-[#D946EF] underline underline-offset-4">
                สร้างโปรไฟล์ 5 ขั้น
              </Link>
            </li>
            <li>
              <Link href="/caregiver/profile" className="hover:text-[#D946EF] underline underline-offset-4">
                ตรวจทานโปรไฟล์ AI
              </Link>
            </li>
            <li>
              <Link href="/caregiver/jobs" className="hover:text-[#D946EF] underline underline-offset-4">
                ฟีดงานสำหรับผู้ดูแล (Swipe)
              </Link>
            </li>
          </ul>
        </div>

        {/* Family Links & Data Reset */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider mb-3 text-indigo-950 font-mono">
            เส้นทางครอบครัว & การทดสอบ
          </h4>
          <ul className="space-y-2 text-sm mb-4">
            <li>
              <Link href="/family/post-job" className="hover:text-[#D946EF] underline underline-offset-4">
                โพสต์หาคนดูแล
              </Link>
            </li>
            <li>
              <Link href="/family/applicants" className="hover:text-[#D946EF] underline underline-offset-4">
                ดูผู้สมัครและเปรียบเทียบ
              </Link>
            </li>
            <li>
              <Link href="/matches" className="hover:text-[#D946EF] underline underline-offset-4">
                ศูนย์การจับคู่ (Matches)
              </Link>
            </li>
            <li>
              <Link href="/ai-lab" className="hover:text-[#D946EF] underline underline-offset-4">
                AI Lab: ทดสอบการจับคู่และสรุป
              </Link>
            </li>
          </ul>

          <button
            onClick={handleReset}
            className="w-full min-h-[44px] px-3 py-2 text-xs font-mono font-bold bg-white text-rose-700 border-2 border-indigo-950 riso-shadow-sm hover:bg-rose-50 riso-btn-active flex items-center justify-center gap-1.5"
          >
            <span>↺ ล้างข้อมูลทดลอง (Reset Seed)</span>
          </button>
          {resetSuccess && (
            <p className="text-[14px] font-mono text-emerald-700 font-bold mt-1.5 text-center">
              ✓ รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-stone-300 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-stone-600 gap-2">
        <p>© 2026 JobGist with Care. Powered by Supabase Schema v3 & FastAPI LLM Engine.</p>
        <p className="flex items-center gap-2">
          <span>Senior Project · MUIC Computer Engineering</span>
          <span>•</span>
          <span>2026</span>
        </p>
      </div>
    </footer>
  );
}

