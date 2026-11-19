'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import { ChevronRightIcon } from '@/components/Icons';
import {
  getCurrentUser,
  updateUserAccountRole,
  startFreshRegistration,
  LIVE,
  hasPendingSignup,
  liveCompleteSignup,
} from '@/services/api';

export default function RegisterRoleSelectionPage() {
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);

  const handleSelectRole = async (role: 'caregiver' | 'family', destination: string) => {
    if (LIVE) {
      const cur = getCurrentUser();
      if (cur.id) {
        // already signed in: the role is fixed at sign-up
        router.push(cur.role === 'family' ? '/family/applicants' : cur.role === 'caregiver' ? '/caregiver/jobs' : destination);
        return;
      }
      if (!hasPendingSignup()) {
        router.push('/auth?mode=signup');
        return;
      }
      if (busy) return;
      setBusy(true);
      try {
        await liveCompleteSignup(role);
        router.push(destination);
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    const cur = getCurrentUser();
    if (cur?.id && cur.id !== 'fam-1-wanwimon' && cur.id !== 'cg-1-wimon') {
      updateUserAccountRole(cur.id, role);
    } else {
      startFreshRegistration(role);
    }
    router.push(destination);
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      {/* Full-Screen Two Sides Role Selection */}
      <main className="flex-1 min-h-[calc(100vh-65px)] flex items-center justify-center px-4 md:px-8 py-10 md:py-16 w-full">
        <div className="max-w-6xl mx-auto w-full space-y-8 md:space-y-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D946EF]">
              WORKFLOW ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-indigo-950">
              สองฝั่ง หนึ่งแพลตฟอร์ม ออกแบบเพื่อคนไทย
            </h2>
            <p className="text-sm text-stone-600">
              แก้ปัญหาการเขียนเรซูเม่ของผู้ดูแล และลดความซับซ้อนทางการแพทย์ของครอบครัว
            </p>
          </div>

          {/* 2 Roles Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Caregiver Side Card */}
            <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-lg flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#D946EF] text-white">
                    SIDE A : CAREGIVERS
                  </span>
                  <span className="text-xs font-mono text-stone-500">ตอบ 5 ขั้นตอน</span>
                </div>

                <h3 className="text-2xl font-black text-indigo-950">สำหรับผู้ดูแลผู้สูงอายุ & ผู้ป่วย</h3>
                <p className="text-sm text-stone-700 leading-relaxed">
                  ไม่ต้องเครียดกับการเขียนเรซูเม่ เพียงแตะเลือกบทบาท ประสบการณ์ และเลือกความถนัดใน 12 เคสมาตรฐาน
                  ระบบจะสร้างข้อความแนะนำตัวแบบมืออาชีพให้คุณตรวจสอบและแก้ไขได้ทันที
                </p>

                <div className="space-y-2 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-indigo-950 flex items-center justify-center font-bold">1</span>
                    <span>เลือกความคุ้นเคย: เคยทำจริง / ผ่านอบรม / พร้อมเรียนรู้</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-indigo-950 flex items-center justify-center font-bold">2</span>
                    <span>ถ่ายรูปใบรับรอง แนบหลักฐานให้ครอบครัวเชื่อมั่น</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-indigo-950 flex items-center justify-center font-bold">3</span>
                    <span>ฟีดงานแสดงเฉพาะงานที่อยู่ในระยะเดินทางและทักษะตรงกัน</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRole('caregiver', '/caregiver/onboarding')}
                className="w-full min-h-[48px] px-5 py-3 bg-[#D946EF] text-white font-bold border-2 border-indigo-950 riso-shadow hover:bg-[#c026d3] text-center flex items-center justify-center gap-2 riso-btn-active"
              >
                <span>เริ่มต้นสร้างโปรไฟล์ผู้ดูแล</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Family Side Card */}
            <div className="bg-white border-2 border-indigo-950 p-6 riso-shadow-lg flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-950 text-white">
                    SIDE B : FAMILIES
                  </span>
                  <span className="text-xs font-mono text-stone-500">พิมพ์ภาษาพูด</span>
                </div>

                <h3 className="text-2xl font-black text-indigo-950">สำหรับครอบครัวที่ต้องการหาคนดูแล</h3>
                <p className="text-sm text-stone-700 leading-relaxed">
                  พิมพ์เล่าอาการคุณพ่อคุณแม่เป็นภาษาพูดธรรมดา ระบบตรวจจับความต้องการออกมาเป็นหมวดหมู่ 12 เคสโดยอัตโนมัติ
                  แล้วค้นหาผู้ดูแลที่ตรงเงื่อนไข พร้อมบอกชัดเจนว่าทำไมถึงเหมาะ และจุดไหนควรสอบถามเพิ่ม
                </p>

                <div className="space-y-2 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-indigo-950 flex items-center justify-center font-bold">1</span>
                    <span>ตัวช่วยตรวจจับคีย์เวิร์ดอาการและหัตถการแบบเรียลไทม์</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-indigo-950 flex items-center justify-center font-bold">2</span>
                    <span>จัดอันดับด้วย Fit Score 99 คะแนน พร้อมสรุปเหตุผลเข้าใจง่าย</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-indigo-950 flex items-center justify-center font-bold">3</span>
                    <span>ตารางเปรียบเทียบผู้สมัคร 2-3 คนเคียงข้างกันในหน้าเดียว</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRole('family', '/family/onboarding')}
                className="w-full min-h-[48px] px-5 py-3 bg-indigo-950 text-white font-bold border-2 border-indigo-950 riso-shadow hover:bg-[#2E1065] text-center flex items-center justify-center gap-2 riso-btn-active"
              >
                <span>โพสต์ประกาศหาผู้ดูแล</span>
                <ChevronRightIcon className="w-4 h-4 text-[#D946EF]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}