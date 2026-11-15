'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';
import {
  SparklesIcon,
  ShieldCheckIcon,
  HeartIcon,
  CheckIcon,
} from '@/components/Icons';

export default function LandingPage() {
  const [interactiveTab, setInteractiveTab] = useState<'fit' | 'profile'>('fit');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      <Topbar />

      {/* Hero Section: Editorial Print Studio Style (Full Screen) */}
      <section className="min-h-[calc(100vh-65px)] flex items-center border-b-2 border-indigo-950 px-4 md:px-8 py-10 md:py-16 relative overflow-hidden">
        {/* Decorative Halftone Print Dots in corners */}
        <div className="absolute top-0 right-0 w-48 h-48 riso-halftone opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 riso-halftone-magenta opacity-25 pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-indigo-950 riso-shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D946EF] animate-ping" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950">
                สองฝั่ง หนึ่งแพลตฟอร์ม • ไม่มีค่านายหน้า
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-[#1E1B4B]">
              จับคู่งานดูแลผู้สูงอายุและผู้ป่วย <br className="hidden sm:inline" />
              <span className="text-[#D946EF] decoration-indigo-950 decoration-wavy decoration-2">
                จ้างตรง ด้วยภาษาไทย 100%
              </span>
            </h1>

            <p className="text-base sm:text-lg text-stone-700 leading-relaxed max-w-xl font-medium">
              ผู้ดูแลไม่ต้องเขียนเรซูเม่ เพียงตอบคำถามทีละขั้น AI จะเรียบเรียงโปรไฟล์ให้ทันที
              ส่วนครอบครัวเพียงเล่าอาการ ระบบวิเคราะห์และจับคู่ผู้สมัครที่เหมาะสมที่สุด พร้อมเหตุผลที่โปร่งใส
            </p>

            {/* Value Proof Badges (3 ข้อความยืนยัน) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white border-2 border-indigo-950 p-3 riso-shadow-sm flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-900 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-4 h-4 text-emerald-900" />
                </div>
                <span className="text-xs font-bold leading-tight">ไม่ต้องมีเรซูเม่ ใช้ภาษาพูด</span>
              </div>

              <div className="bg-white border-2 border-indigo-950 p-3 riso-shadow-sm flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-pink-100 border border-pink-900 flex items-center justify-center shrink-0">
                  <HeartIcon className="w-4 h-4 text-[#D946EF]" />
                </div>
                <span className="text-xs font-bold leading-tight">จ้างตรง ไม่หักหัวคิว 0%</span>
              </div>

              <div className="bg-white border-2 border-indigo-950 p-3 riso-shadow-sm flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-900 flex items-center justify-center shrink-0">
                  <ShieldCheckIcon className="w-4 h-4 text-amber-900" />
                </div>
                <span className="text-xs font-bold leading-tight">คุ้มครองข้อมูลส่วนบุคคล PDPA</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Risograph Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border-2 border-indigo-950 riso-shadow-xl p-5 md:p-6 space-y-4 relative">
              {/* Top Card Bar */}
              <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 border border-indigo-950" />
                  <span className="w-3 h-3 rounded-full bg-amber-400 border border-indigo-950" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-indigo-950" />
                </div>

                {/* Interactive Preview Switcher */}
                <div className="flex border border-indigo-950">
                  <button
                    onClick={() => setInteractiveTab('fit')}
                    className={`px-3 py-1 text-xs font-mono font-bold transition-colors ${
                      interactiveTab === 'fit'
                        ? 'bg-indigo-950 text-white'
                        : 'bg-white text-indigo-950 hover:bg-stone-100'
                    }`}
                  >
                    AI Fit Score
                  </button>
                  <button
                    onClick={() => setInteractiveTab('profile')}
                    className={`px-3 py-1 text-xs font-mono font-bold transition-colors ${
                      interactiveTab === 'profile'
                        ? 'bg-[#D946EF] text-white'
                        : 'bg-white text-indigo-950 hover:bg-stone-100'
                    }`}
                  >
                    โปรไฟล์ตัวอย่าง
                  </button>
                </div>
              </div>

              {interactiveTab === 'fit' ? (
                /* 92% AI Fit Score Simulation */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#FAF9F6] border-2 border-indigo-950 p-4 riso-shadow-sm">
                    <div>
                      <span className="text-xs font-mono font-bold text-stone-600 uppercase block">
                        คะแนนความเหมาะสม (AI Fit)
                      </span>
                      <h3 className="font-extrabold text-xl text-indigo-950">พี่วิมล ชัยชนะ (PN)</h3>
                      <p className="text-xs text-stone-600 font-mono">งานดูแลผู้ป่วยสโตรกติดเตียง • ลาดพร้าว (4.2 กม.)</p>
                    </div>

                    <div className="flex flex-col items-center justify-center w-20 h-20 bg-[#D946EF] border-2 border-indigo-950 text-white font-mono shrink-0 riso-shadow-sm">
                      <span className="text-2xl font-black leading-none">92%</span>
                      <span className="text-[10px] font-bold tracking-tighter uppercase mt-0.5">FIT SCORE</span>
                    </div>
                  </div>

                  {/* Why this match fits (Structured pros/cons) */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1 font-mono uppercase">
                      <SparklesIcon className="w-4 h-4 text-[#D946EF]" />
                      เหตุผลที่เหมาะสมกับงานนี้:
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2 bg-emerald-50 border border-emerald-900/30 p-2 text-emerald-950">
                        <CheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>
                          <strong>ตรงทักษะสำคัญครบถ้วน:</strong> ผู้ป่วยติดเตียง, ดูดเสมหะเจาะคอ, อาหารทางสายยาง และล้างแผลกดทับ
                        </span>
                      </li>
                      <li className="flex items-start gap-2 bg-emerald-50 border border-emerald-900/30 p-2 text-emerald-950">
                        <CheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>
                          <strong>มีใบประกาศนียบัตร PN 1 ปี</strong> และผ่านการอบรมหัตถการเฉพาะทาง ตรวจสอบแล้ว
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1 font-mono uppercase">
                      ⚠️ จุดที่ควรสอบถามเพิ่มเติม:
                    </span>
                    <div className="text-xs bg-amber-50 border border-amber-900/30 p-2 text-amber-950">
                      ตกลงเรื่องรอบเวลาพลิกตัวช่วงกลางคืน และรายละเอียดวันหยุดประจำสัปดาห์
                    </div>
                  </div>

                  <Link
                    href="/family/applicants"
                    className="block text-center w-full min-h-[44px] py-2.5 font-bold text-xs bg-white text-indigo-950 border-2 border-indigo-950 riso-shadow-sm hover:bg-stone-50"
                  >
                    ทดลองเปิดหน้าผู้สมัครทั้งหมด (Family Feed) →
                  </Link>
                </div>
              ) : (
                /* Profile Card Simulation */
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-indigo-950 text-white font-mono font-bold text-xl flex items-center justify-center border-2 border-indigo-950 shrink-0 riso-shadow-sm">
                      วิ
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg">พี่วิมล ชัยชนะ</h3>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-900 text-[10px] font-bold">
                          ยืนยันใบรับรองแล้ว
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 font-mono">
                        ผู้ช่วยพยาบาล (PN) • ประสบการณ์ 8 ปี • จตุจักร กทม.
                      </p>
                      <p className="text-xs font-mono font-bold text-[#D946EF] mt-0.5">
                        ฿24,000 - 28,000 / เดือน (อยู่ประจำ / ไป-กลับ)
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-indigo-950 p-3 text-xs leading-relaxed text-stone-800">
                    <span className="font-bold block text-indigo-950 mb-1 font-mono">ข้อความที่ AI สรุปให้:</span>
                    &ldquo;ดิฉันเป็นผู้ช่วยพยาบาล (PN) ประสบการณ์ 8 ปี เชี่ยวชาญการดูแลผู้ป่วยติดเตียงขั้นสูง ดูดเสมหะเจาะคอ ฟีดสายยาง NG tube และล้างแผลกดทับปลอดเชื้อ ใจเย็น อ่อนโยน และเคารพความเป็นส่วนตัว...&rdquo;
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['ติดเตียง', 'สายยาง', 'เจาะคอ/ดูดเสมหะ', 'ทำแผล', 'ฉีดอินซูลิน'].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-bold bg-white border border-indigo-950 text-indigo-950"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href="/caregiver/onboarding"
                    className="block text-center w-full min-h-[44px] py-2.5 font-bold text-xs bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow-sm hover:bg-[#c026d3]"
                  >
                    ลองสร้างโปรไฟล์ของตัวเอง (5 ขั้นตอน) →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step How It Works Section (Full Screen) */}
      <section className="min-h-[calc(100vh-65px)] flex items-center bg-white border-b-2 border-indigo-950 px-4 md:px-8 py-10 md:py-16">
        <div className="max-w-6xl mx-auto w-full space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-950">
              STEP-BY-STEP PROCESS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-indigo-950">ใช้งานอย่างไร ให้เริ่มงานได้ไวและปลอดภัย</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'กรอกหรือเล่าความต้องการ',
                desc: 'ผู้ดูแลเลือกทักษะในฟอร์ม 5 ขั้น ส่วนครอบครัวพิมพ์เล่าอาการคนป่วยด้วยภาษาพูดตามสบาย',
              },
              {
                step: '02',
                title: 'AI เรียบเรียง & สรุปคะแนน',
                desc: 'ระบบสร้างโปรไฟล์ที่ตรวจแก้ได้ และคำนวณคะแนน Fit Score พร้อมระบุข้อดีและจุดที่ควรสอบถาม',
              },
              {
                step: '03',
                title: 'กดถูกใจกันทั้งสองฝ่าย (Swipe)',
                desc: 'คุ้มครองความเป็นส่วนตัว พิกัดและเบอร์จะยังไม่เปิดเผยจนกว่าทั้งสองฝ่ายจะเลือกถูกใจตรงกัน',
              },
              {
                step: '04',
                title: 'เปิดข้อมูลติดต่อ & นัดเริ่มงาน',
                desc: 'เมื่อ Match แล้ว ระบบจะปลดล็อกเบอร์โทรและ LINE ID เพื่อให้โทรคุยหรือสัมภาษณ์ได้โดยตรง',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-[#FAF9F6] border-2 border-indigo-950 p-5 riso-shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <span className="font-mono text-3xl font-black text-[#D946EF] block">{item.step}</span>
                  <h4 className="font-bold text-base text-indigo-950">{item.title}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                </div>
                <div className="h-1 w-12 bg-indigo-950" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
