'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { UserIcon, HomeIcon } from '@/components/Icons';
import {
  isUserLoggedIn,
  getCurrentUser,
  logout,
  startFreshRegistration,
  CurrentUserSession,
} from '@/services/api';

function TopbarInner() {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUserState] = useState<CurrentUserSession | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncAuth = () => {
      const logged = isUserLoggedIn();
      setIsLoggedIn(logged);
      if (logged) {
        setCurrentUserState(getCurrentUser());
      } else {
        setCurrentUserState(null);
      }
    };
    syncAuth();

    window.addEventListener('jg_auth_changed', syncAuth);
    window.addEventListener('jg_user_changed', syncAuth);
    return () => {
      window.removeEventListener('jg_auth_changed', syncAuth);
      window.removeEventListener('jg_user_changed', syncAuth);
    };
  }, []);

  // ซ่อนปุ่ม "เข้าสู่ระบบ" เมื่ออยู่หน้า /auth (หน้า login) หรือ login แล้ว
  const isAuthPage = pathname === '/auth';
  const isRegisterPage = pathname === '/register';
  const isOnboardingPage = pathname === '/family/onboarding' || pathname === '/caregiver/onboarding' || pathname === '/family/post-job';
  const isRegistrationFlow = !isLoggedIn && (isRegisterPage || isOnboardingPage);
  const isHomePage = pathname === '/';
  const isProfilePage = pathname === '/caregiver/profile' || pathname === '/family/profile';
  const isJobsPage = pathname === '/caregiver/jobs' || pathname === '/family/applicants';
  const isMatchesPage = pathname === '/matches';

  // Do not show "เข้าสู่ระบบ" if logged in OR currently on /auth
  const hideSignInButton = isLoggedIn || isAuthPage;

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentUserState(null);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAF9F6] border-b-2 border-indigo-950 px-4 md:px-6 py-2.5 flex items-center justify-between">
      {/* Top-Left: JobGist brand logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center transition-transform hover:scale-[1.02]">
          <Image
            src="/logo-with-care.png"
            alt="JobGist with Care"
            width={835}
            height={154}
            className="h-9 md:h-10 w-auto object-contain"
            priority
            unoptimized
          />
        </Link>
      </div>

      {/* Right Navigation: Auth / User State */}
      <div className="flex items-center gap-2">
        {/* Home Button: Back to Homepage */}
        {isHomePage ? (
          <div
            aria-current="page"
            className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 py-2 bg-[#735095] text-white border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-default select-none whitespace-nowrap"
          >
            <HomeIcon className="w-4 h-4 text-white shrink-0" />
            <span className="hidden sm:inline">หน้าแรก</span>
          </div>
        ) : (
          <Link
            href="/"
            onClick={() => {
              // If user was in the process of registering/onboarding, going back Home resets auth session to unauthenticated guest
              if (isRegistrationFlow) {
                logout();
              }
            }}
            aria-label="หน้าแรก"
            title="กลับสู่หน้าแรก"
            className="group min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-2 bg-white text-indigo-950 hover:bg-[#cbc3e3] border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 riso-btn-active text-xs sm:text-sm font-bold whitespace-nowrap transition-colors"
          >
            <HomeIcon className="w-4 h-4 text-indigo-950 shrink-0 transition-colors" />
            <span className="hidden sm:inline">หน้าแรก</span>
          </Link>
        )}

        {/* If in Registration or Onboarding Flow, keep only the Home button */}
        {!isRegistrationFlow && (
          <>
            {isLoggedIn ? (
              /* User is logged in: Show active profile, find family, and match center buttons */
              <div className="flex items-center gap-2">
                {/* Profile Button */}
                {isProfilePage ? (
                  <div
                    aria-current="page"
                    className="min-h-[44px] px-3.5 py-2 bg-[#735095] text-white border-2 border-indigo-950 riso-shadow-sm flex items-center gap-2 text-xs md:text-sm font-bold cursor-default select-none whitespace-nowrap"
                  >
                    <UserIcon className="w-4 h-4 text-white shrink-0" />
                    <span>โปรไฟล์</span>
                  </div>
                ) : (
                  <Link
                    href={currentUser?.role === 'family' ? '/family/profile' : '/caregiver/profile'}
                    title="ดูโปรไฟล์"
                    className="group min-h-[44px] px-3.5 py-2 bg-white text-indigo-950 hover:bg-[#cbc3e3] border-2 border-indigo-950 riso-shadow-sm flex items-center gap-2 text-xs md:text-sm font-bold riso-btn-active whitespace-nowrap transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-950 shrink-0 transition-colors" />
                    <span>โปรไฟล์</span>
                  </Link>
                )}

                {/* Find Caregiver (for Family) OR Find Family (for Caregiver) */}
                {isJobsPage ? (
                  <div
                    aria-current="page"
                    className="min-h-[44px] px-3.5 py-2 bg-[#735095] text-white border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 text-xs md:text-sm font-bold cursor-default select-none whitespace-nowrap"
                  >
                    <span>{currentUser?.role === 'family' ? 'หาผู้ดูแล' : 'หาครอบครัว'}</span>
                  </div>
                ) : (
                  <Link
                    href={currentUser?.role === 'family' ? '/family/applicants' : '/caregiver/jobs'}
                    aria-label={currentUser?.role === 'family' ? 'หาผู้ดูแล' : 'หาครอบครัว'}
                    title={currentUser?.role === 'family' ? 'ค้นหาผู้ดูแลที่ตรงใจ (ผู้สมัคร)' : 'ค้นหางาน / หาครอบครัว (Swiping UI)'}
                    className="min-h-[44px] px-3.5 py-2 bg-white text-indigo-950 hover:bg-[#cbc3e3] border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 riso-btn-active text-xs md:text-sm font-bold whitespace-nowrap transition-colors"
                  >
                    <span>{currentUser?.role === 'family' ? 'หาผู้ดูแล' : 'หาครอบครัว'}</span>
                  </Link>
                )}

                {/* Match Center Button */}
                {isMatchesPage ? (
                  <div
                    aria-current="page"
                    className="min-h-[44px] px-3.5 py-2 bg-[#735095] text-white border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 text-xs md:text-sm font-bold cursor-default select-none whitespace-nowrap"
                  >
                    <span>ศูนย์การจับคู่</span>
                  </div>
                ) : (
                  <Link
                    href="/matches"
                    aria-label="ศูนย์การจับคู่"
                    title="การจับคู่และข้อมูลติดต่อ (Match Center)"
                    className="min-h-[44px] px-3.5 py-2 bg-white text-indigo-950 hover:bg-[#cbc3e3] border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5 riso-btn-active text-xs md:text-sm font-bold whitespace-nowrap transition-colors"
                  >
                    <span>ศูนย์การจับคู่</span>
                  </Link>
                )}
              </div>
            ) : (
              /* User is guest / unauthenticated */
              <div className="flex items-center gap-2">
                {/* เข้าสู่ระบบ: Do not show if on /auth?mode=signin */}
                {!hideSignInButton && (
                  <Link
                    href="/auth?mode=signin"
                    aria-label="เข้าสู่ระบบ"
                    title="เข้าสู่ระบบ"
                    className="min-h-[44px] px-3 md:px-3.5 py-2 text-xs md:text-sm font-bold bg-white text-indigo-950 border-2 border-indigo-950 riso-shadow-sm hover:bg-[#cbc3e3] flex items-center justify-center riso-btn-active whitespace-nowrap transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Link>
                )}

                {/* สร้างบัญชี: ตรงไปหน้าเลือกบทบาท (Register Role Selection) */}
                <Link
                  href="/register"
                  onClick={() => startFreshRegistration()}
                  aria-label="สร้างบัญชี"
                  title="เริ่มต้นสร้างบัญชีผู้ใช้งาน"
                  className="min-h-[44px] px-3 md:px-3.5 py-2 text-xs md:text-sm font-bold bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow hover:bg-[#c026d3] flex items-center gap-1.5 riso-btn-active whitespace-nowrap"
                >
                  <UserIcon className="w-4 h-4 text-white shrink-0" />
                  <span>สร้างบัญชี</span>
                </Link>
              </div>
            )}
          </>
        )}

        {/* Mobile menu toggle (only if not in registration flow) */}
        {!isRegistrationFlow && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="เปิดเมนูนำทาง"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center border-2 border-indigo-950 bg-white riso-shadow-sm"
          >
            <div className="w-5 flex flex-col gap-1">
              <span className="block h-0.5 w-full bg-indigo-950" />
              <span className="block h-0.5 w-full bg-indigo-950" />
              <span className="block h-0.5 w-full bg-indigo-950" />
            </div>
          </button>
        )}
      </div>

      {/* Mobile Drawer */}
      {!isRegistrationFlow && mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#FAF9F6] border-b-2 border-indigo-950 p-4 flex flex-col gap-2.5 md:hidden shadow-lg z-50">
          {isLoggedIn ? (
            <div className="flex items-center justify-between pb-3 border-b-2 border-indigo-950">
              {!isProfilePage ? (
                <Link
                  href={currentUser?.role === 'caregiver' ? '/caregiver/profile' : currentUser?.role === 'family' ? '/family/applicants' : '/register'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] px-3.5 py-1.5 text-xs font-bold bg-white text-indigo-950 border-2 border-indigo-950 riso-shadow-sm hover:bg-stone-50 flex items-center justify-center gap-1.5"
                >
                  <UserIcon className="w-4 h-4 text-indigo-950 shrink-0" />
                  <span>โปรไฟล์</span>
                </Link>
              ) : (
                <div className="text-xs font-bold text-stone-500 py-1">หน้าโปรไฟล์ของคุณ</div>
              )}
            </div>
          ) : (
            <div className={`grid ${hideSignInButton ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pb-2 border-b-2 border-indigo-950`}>
              {!hideSignInButton && (
                <Link
                  href="/auth?mode=signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3 py-2 text-center text-xs font-bold bg-white text-indigo-950 hover:bg-[#cbc3e3] border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
              )}
              <Link
                href="/register"
                onClick={() => {
                  startFreshRegistration();
                  setMobileMenuOpen(false);
                }}
                className="min-h-[44px] px-3 py-2 text-center text-xs font-bold bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center gap-1.5"
              >
                <UserIcon className="w-4 h-4 text-white" />
                <span>สร้างบัญชี</span>
              </Link>
            </div>
          )}

          <Link
            href="/caregiver/onboarding"
            onClick={() => setMobileMenuOpen(false)}
            className="min-h-[44px] px-4 py-2.5 font-bold border-2 border-indigo-950 bg-white text-indigo-950 riso-shadow-sm flex items-center justify-between"
          >
            <span>สำหรับผู้ดูแล (สร้างโปรไฟล์)</span>
            <span className="text-xs font-mono text-[#D946EF]">CG →</span>
          </Link>
          <Link
            href="/caregiver/jobs"
            onClick={() => setMobileMenuOpen(false)}
            className="min-h-[44px] px-4 py-2.5 font-bold border-2 border-indigo-950 bg-white text-indigo-950 riso-shadow-sm flex items-center justify-between"
          >
            <span>สำหรับผู้ดูแล (ค้นหางาน / Swipe)</span>
            <span className="text-xs font-mono text-indigo-950">Jobs →</span>
          </Link>
          <Link
            href="/family/post-job"
            onClick={() => setMobileMenuOpen(false)}
            className="min-h-[44px] px-4 py-2.5 font-bold border-2 border-indigo-950 bg-white text-indigo-950 riso-shadow-sm flex items-center justify-between"
          >
            <span>สำหรับครอบครัว (โพสต์งาน)</span>
            <span className="text-xs font-mono text-[#1E1B4B]">Family →</span>
          </Link>
          <Link
            href="/family/applicants"
            onClick={() => setMobileMenuOpen(false)}
            className="min-h-[44px] px-4 py-2.5 font-bold border-2 border-indigo-950 bg-white text-indigo-950 riso-shadow-sm flex items-center justify-between"
          >
            <span>สำหรับครอบครัว (ดูผู้สมัคร / เปรียบเทียบ)</span>
            <span className="text-xs font-mono text-indigo-950">Applicants →</span>
          </Link>
          <Link
            href="/matches"
            onClick={() => setMobileMenuOpen(false)}
            className="min-h-[44px] px-4 py-2.5 font-bold border-2 border-indigo-950 bg-white text-indigo-950 riso-shadow-sm flex items-center justify-between"
          >
            <span>ศูนย์การจับคู่และข้อมูลติดต่อ</span>
            <span className="text-xs font-mono text-indigo-950">Matches →</span>
          </Link>
        </div>
      )}
    </header>
  );
}

export default function Topbar() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-50 bg-[#FAF9F6] border-b-2 border-indigo-950 px-4 md:px-6 py-2.5 flex items-center justify-between min-h-[65px]">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo-with-care.png"
                alt="JobGist with Care"
                width={835}
                height={154}
                className="h-9 md:h-10 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-bold bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow flex items-center gap-1.5">
              <span>สร้างบัญชี</span>
            </div>
          </div>
        </header>
      }
    >
      <TopbarInner />
    </Suspense>
  );
}
