'use client';

import { fileToSmallDataUrl } from '@/lib/image';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserRole } from '@/types/database';
import {
  setCurrentUser,
  setUserLoggedIn,
  saveRegisteredAccount,
  findAccountByEmail,
  getPostLoginRedirect,
  restoreDemoAccount,
  RegisteredAccount,
  CurrentUserSession,
  getNameInitial,
  LIVE,
  liveSignIn,
  savePendingSignup,
  LIVE_DEMO,
  markTaskStart,
} from '@/services/api';
import { ChevronRightIcon, HomeIcon } from '@/components/Icons';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryMode = searchParams.get('mode');
  const mode: 'signin' | 'signup' = queryMode === 'signup' ? 'signup' : 'signin';

  // Objective 1: start the "signup" timer when the sign-up form opens
  useEffect(() => {
    if (mode === 'signup') markTaskStart('signup');
  }, [mode]);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'unspecified'>('unspecified');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Sign In handler: looks up real account & redirects according to account onboarding status
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (LIVE) {
      try {
        const session = await liveSignIn(email, password);
        const next = searchParams.get('next');
        const { path, reason } = getPostLoginRedirect(session);
        setToastMsg(`เข้าสู่ระบบสำเร็จ! ${reason}`);
        setTimeout(() => router.push(next && next !== '/auth' ? next : path), 400);
      } catch (err) {
        setToastMsg((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const trimmedEmail = email.trim().toLowerCase();
      let account = findAccountByEmail(trimmedEmail);

      // ถ้ายังไม่พบบัญชีที่เคยบันทึกไว้ (เช่น ผู้ใช้ทดสอบพิมพ์อีเมลใหม่มาเข้าสู่ระบบ)
      // ให้สร้าง account ใหม่ แต่ตั้ง role เป็น null (ยังไม่ได้เลือกฝั่ง)
      if (!account) {
        const userId = `user-${Date.now()}`;
        account = {
          id: userId,
          email: trimmedEmail,
          password: password,
          display_name: trimmedEmail.split('@')[0],
          phone: '0810000000',
          line_id: null,
          role: null, // ยังไม่ได้เลือกฝั่ง
          created_at: new Date().toISOString(),
        };
        saveRegisteredAccount(account);
      }

      // บันทึก Session ปัจจุบัน
      const userSession: CurrentUserSession = {
        id: account.id,
        role: account.role, // null, 'caregiver', หรือ 'family'
        display_name: account.display_name,
        phone: account.phone,
        line_id: account.line_id,
        email: account.email,
      };
      setCurrentUser(userSession);
      setUserLoggedIn(true);

      // ตรวจสอบและนำไปหน้าที่ถูกต้องตามสถานะจริงของบัญชี
      const { path, reason } = getPostLoginRedirect(userSession);
      setToastMsg(`เข้าสู่ระบบสำเร็จ! ${reason}`);
      setTimeout(() => router.push(path), 600);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up handler -> creates account with role = null, then routes to /register (Two Sides Role Selection)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (LIVE) {
      // the account is created in /register once the user picks a side (role is required by the DB)
      if (password.length < 6) {
        setToastMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        setLoading(false);
        return;
      }
      savePendingSignup({
        email: email.trim().toLowerCase(),
        password,
        display_name: displayName,
        phone,
        line_id: lineId || null,
      });
      setToastMsg('ขั้นต่อไป: เลือกบทบาทการใช้งานเพื่อสร้างบัญชี');
      setTimeout(() => router.push('/register'), 400);
      setLoading(false);
      return;
    }
    try {
      const userId = `user-${Date.now()}`;
      const trimmedEmail = email.trim().toLowerCase();

      // บันทึกบัญชีใหม่ (role เป็น null เพราะยังไม่ได้เลือกฝั่ง)
      const newAccount: RegisteredAccount = {
        id: userId,
        email: trimmedEmail,
        password: password,
        display_name: displayName,
        phone: phone || '0810000000',
        line_id: lineId || null,
        avatar_url: avatarUrl || null,
        gender: gender || 'unspecified',
        role: null, // ยังไม่เลือกฝั่งแน่นอน!
        created_at: new Date().toISOString(),
      };
      saveRegisteredAccount(newAccount);

      // ตั้งค่า Current User Session
      setCurrentUser({
        id: userId,
        role: null, // role: null ป้องกันการเลือกฝั่งให้เอง
        display_name: displayName,
        phone: phone || '0810000000',
        line_id: lineId || null,
        email: trimmedEmail,
        avatar_url: avatarUrl || null,
        gender: gender || 'unspecified',
      });
      setUserLoggedIn(true);

      setToastMsg('สร้างบัญชีสำเร็จ! กำลังนำท่านไปเลือกบทบาทการใช้งาน...');
      setTimeout(() => {
        router.push('/register');
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Quick Login Switcher
  const handleQuickLogin = (
    id: string,
    userRole: UserRole,
    name: string,
    userPhone: string,
    redirectPath: string
  ) => {
    if (LIVE) {
      // real seeded demo accounts in Supabase (see backend/scripts/seed_demo.py)
      setLoading(true);
      liveSignIn(userRole === 'caregiver' ? LIVE_DEMO.emails.caregiver : LIVE_DEMO.emails.family, LIVE_DEMO.password)
        .then(() => {
          setToastMsg(`เข้าสู่ระบบเป็น: ${name}`);
          setTimeout(() => router.push(redirectPath), 300);
        })
        .catch((err) => setToastMsg(`บัญชีทดสอบยังไม่พร้อม: ${(err as Error).message}`))
        .finally(() => setLoading(false));
      return;
    }
    // รีเซ็ต/คืนค่าข้อมูลตัวอย่างมาตรฐานของบัญชีทดสอบด่วนทันที
    if (id === 'cg-1-wimon' || id === 'fam-1-wanwimon') {
      restoreDemoAccount(id);
    }
    setCurrentUser({ id, role: userRole, display_name: name, phone: userPhone });
    setUserLoggedIn(true);
    setToastMsg(`เข้าสู่ระบบเป็น: ${name}`);
    setTimeout(() => router.push(redirectPath), 400);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1E1B4B]">
      {/* Minimal Header: Logo on the left, Home button on the right */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6] border-b-2 border-indigo-950 px-4 md:px-6 py-2.5 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center transition-transform hover:scale-[1.02]">
          <Image
            src="/logo-with-care.png"
            alt="JobGist with Care"
            width={835}
            height={154}
            className="h-6 sm:h-6.5 md:h-7 w-auto object-contain"
            priority
            unoptimized
          />
        </Link>

        {/* Single Home Button */}
        <Link
          href="/"
          aria-label="หน้าแรก"
          title="กลับสู่หน้าแรก"
          className="group min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-2 bg-white text-indigo-950 hover:bg-[#cbc3e3] border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 riso-btn-active text-xs sm:text-sm font-bold whitespace-nowrap transition-colors"
        >
          <HomeIcon className="w-4 h-4 text-indigo-950 shrink-0 transition-colors" />
          <span className="hidden sm:inline">หน้าแรก</span>
        </Link>
      </header>

      {/* Full-screen centered card */}
      <main className="flex-1 bg-[#735095] flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-xl bg-white border-2 border-indigo-950 p-6 sm:p-8 riso-shadow-xl space-y-6">

          {/* ===================== SIGN IN MODE ===================== */}
          {mode === 'signin' ? (
            <>
              {/* Header */}
              <div className="text-center space-y-1 border-b-2 border-indigo-950 pb-5">
                <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">เข้าสู่ระบบ</h1>
                <p className="text-xs sm:text-sm text-stone-500">
                  ข้อมูลจะถูกจัดเก็บตามมาตรฐาน PDPA
                </p>
              </div>

              {/* Quick Sandbox Driver Accounts */}
              <div className="bg-[#FAF9F6] border-2 border-indigo-950 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    บัญชีทดสอบด่วน (1-Click)
                  </span>
                  <span className="text-xs font-mono text-stone-500">สำหรับทดสอบระบบ</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin(
                        'cg-1-wimon',
                        'caregiver',
                        'คุณวิมล ชัยชนะ (PN)',
                        '0814567890',
                        '/caregiver/jobs'
                      )
                    }
                    className="min-h-[44px] p-2 bg-white border border-indigo-950 hover:bg-stone-50 text-left font-bold riso-shadow-sm flex flex-col justify-center riso-btn-active"
                  >
                    <span className="text-indigo-950">👩‍⚕️ คุณวิมล (ผู้ดูแล)</span>
                    <span className="text-xs text-stone-500 font-normal">ดูฟีดงาน / Swipe UI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin(
                        'fam-1-wanwimon',
                        'family',
                        'คุณวรรณวิมล',
                        '0829991122',
                        '/family/applicants'
                      )
                    }
                    className="min-h-[44px] p-2 bg-white border border-indigo-950 hover:bg-stone-50 text-left font-bold riso-shadow-sm flex flex-col justify-center riso-btn-active"
                  >
                    <span className="text-indigo-950">🏡 คุณวรรณวิมล (ครอบครัว)</span>
                    <span className="text-xs text-stone-500 font-normal">ดูผู้สมัคร / เปรียบเทียบ</span>
                  </button>
                </div>
              </div>

              {/* Sign-In Form: Email + Password only */}
              <form onSubmit={handleSignIn} autoComplete="off" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-indigo-950 mb-1 block">
                    อีเมล (Email) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="login_email"
                    id="login_email"
                    required
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-indigo-950 block">
                      รหัสผ่าน (Password) <span className="text-rose-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email || '');
                        setForgotSent(false);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-bold text-indigo-950 underline underline-offset-2 hover:text-[#D946EF] cursor-pointer"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <input
                    type="password"
                    name="login_password"
                    id="login_password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] font-mono"
                  />
                </div>

                <div className="flex items-center justify-center gap-3 text-xs text-stone-500 text-center">
                  <span>
                    ยังไม่มีบัญชี?{' '}
                    <Link
                      href="/register"
                      className="font-bold text-indigo-950 underline underline-offset-2 hover:text-[#D946EF]"
                    >
                      สร้างบัญชีใหม่
                    </Link>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[50px] font-black text-sm text-white bg-indigo-950 hover:bg-[#2E1065] border-2 border-indigo-950 riso-shadow-lg flex items-center justify-center gap-2 riso-btn-active transition-all"
                >
                  {loading ? (
                    <span className="font-mono animate-pulse">กำลังดำเนินการ...</span>
                  ) : (
                    <>
                      <span>เข้าสู่ระบบ</span>
                      <ChevronRightIcon className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* ===================== SIGN UP MODE ===================== */
            <>
              {/* Header */}
              <div className="text-center space-y-1 border-b-2 border-indigo-950 pb-5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D946EF] px-2 py-0.5 bg-[#FAF9F6] border border-indigo-950">
                  SUPABASE AUTH V3 • TRIGGER HANDLE_NEW_USER
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
                  สร้างบัญชีผู้ใช้งาน
                </h1>
                <p className="text-xs sm:text-sm text-stone-600">
                  ข้อมูลเบอร์โทรศัพท์และพิกัดส่วนตัวจะถูกจัดเก็บตามมาตรฐาน PDPA
                </p>
              </div>

              {/* Sign-Up Form: Display Name, Phone, LINE ID, Email, Password */}
              <form onSubmit={handleSignUp} autoComplete="off" className="space-y-4">
                {/* Profile Photo Upload */}
                <div className="p-3.5 bg-[#FAF9F6] border-2 border-indigo-950">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile preview"
                          className="w-14 h-14 object-cover border-2 border-indigo-950 bg-white"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-indigo-950 text-white font-mono font-bold text-lg flex items-center justify-center border-2 border-indigo-950">
                          {getNameInitial(displayName, 'ผ')}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <span className="text-xs font-bold text-indigo-950 block">
                        รูปโปรไฟล์ (ไม่บังคับ)
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-50 text-indigo-950 border border-indigo-950 text-xs font-bold riso-btn-active">
                          <span>{avatarUrl ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                fileToSmallDataUrl(file).then(setAvatarUrl).catch(() => undefined);
                              }
                            }}
                          />
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            className="text-xs text-rose-600 hover:text-rose-800 underline font-bold"
                          >
                            ลบรูป
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display Name & Gender Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-indigo-950 mb-1 block">
                      ชื่อที่ใช้แสดงบนระบบ (Display Name) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="signup_display_name"
                      id="signup_display_name"
                      required
                      autoComplete="off"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="เช่น พี่วันเพ็ญ ดูแลดี หรือ สมศรี ชัยชนะ"
                      className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-950 mb-1 block">
                      เพศ
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'female' | 'male' | 'unspecified')}
                      className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                    >
                      <option value="male">ชาย</option>
                      <option value="female">หญิง</option>
                      <option value="unspecified">ไม่ระบุ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-950 mb-1 flex items-center justify-between">
                    <span>
                      เบอร์โทรศัพท์ติดต่อ (Phone) <span className="text-rose-600">*</span>
                    </span>
                    <span className="text-sm font-mono text-stone-500">
                      {phone.length}/10 หลัก
                    </span>
                  </label>
                  <input
                    type="tel"
                    name="signup_phone"
                    id="signup_phone"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    autoComplete="off"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="เช่น 0812345678"
                    className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] font-mono placeholder:text-stone-400"
                  />
                  <span className="text-sm text-stone-500 mt-1 block">
                    * ซ่อนเป็นความลับ จะแสดงให้อีกฝ่ายเห็นเฉพาะหลัง Match เท่านั้น (กรอกเฉพาะตัวเลข 10 หลัก)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-950 mb-1 block">
                    LINE ID (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    name="signup_line_id"
                    id="signup_line_id"
                    autoComplete="off"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="ไอดีไลน์สำหรับติดต่อสื่อสาร"
                    className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-950 mb-1 block">
                    อีเมล (Email) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="signup_email"
                    id="signup_email"
                    required
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-950 mb-1 block">
                    รหัสผ่าน (Password) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="password"
                    name="signup_password"
                    id="signup_password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] font-mono"
                  />
                </div>

                <p className="text-xs text-stone-500 text-center">
                  มีบัญชีอยู่แล้ว?{' '}
                  <Link
                    href="/auth?mode=signin"
                    className="font-bold text-indigo-950 underline underline-offset-2 hover:text-[#D946EF]"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[50px] font-black text-sm text-white bg-[#D946EF] hover:bg-[#c026d3] border-2 border-indigo-950 riso-shadow-lg flex items-center justify-center gap-2 riso-btn-active transition-all"
                >
                  {loading ? (
                    <span className="font-mono animate-pulse">กำลังดำเนินการ...</span>
                  ) : (
                    <>
                      <span>ยืนยันและดำเนินการต่อ</span>
                      <ChevronRightIcon className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {toastMsg && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-900 text-emerald-950 font-bold text-xs text-center riso-shadow-sm">
              {toastMsg}
            </div>
          )}
        </div>

        {/* Modal: Forgot Password */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-indigo-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border-4 border-indigo-950 max-w-md w-full p-6 riso-shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-3">
                <h3 className="text-lg font-black text-indigo-950">
                  รีเซ็ตรหัสผ่าน (Reset Password)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1 text-stone-500 hover:text-indigo-950 border border-transparent hover:border-indigo-950"
                >
                  ✕
                </button>
              </div>

              {!forgotSent ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!forgotEmail.trim()) return;
                    setForgotSent(true);
                  }}
                  className="space-y-4"
                >
                  <p className="text-xs text-stone-600 leading-relaxed">
                    กรุณากรอกอีเมลที่ใช้สมัครบัญชี JobGist with Care เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ
                  </p>
                  <div>
                    <label className="text-xs font-bold text-indigo-950 mb-1 block">
                      อีเมล (Email) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full min-h-[44px] px-3.5 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 min-h-[44px] px-4 py-2 font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 border-2 border-indigo-950 riso-shadow-sm riso-btn-active"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 min-h-[44px] px-4 py-2 font-black text-xs bg-indigo-950 hover:bg-[#2E1065] text-white border-2 border-indigo-950 riso-shadow-sm riso-btn-active"
                    >
                      ส่งลิงก์รีเซ็ต
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 border-2 border-indigo-950 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-indigo-950">ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว</h4>
                    <p className="text-xs text-stone-600">
                      ระบบได้ส่งคำขอรีเซ็ตรหัสผ่านไปยัง <span className="font-mono font-bold text-indigo-950">{forgotEmail}</span> กรุณาตรวจสอบกล่องจดหมายของคุณ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full min-h-[44px] px-4 py-2 font-black text-xs bg-indigo-950 hover:bg-[#2E1065] text-white border-2 border-indigo-950 riso-shadow-sm riso-btn-active"
                  >
                    เข้าใจแล้ว ปิดหน้าต่าง
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
          <span className="font-mono text-sm text-indigo-950 animate-pulse">กำลังโหลด...</span>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
