'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { UserIcon } from '@/components/Icons';
import {
  isUserLoggedIn,
  getCurrentUser,
  logout,
  CurrentUserSession,
} from '@/services/api';

function TopbarInner() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUserState] = useState<CurrentUserSession | null>(null);

  useEffect(() => {
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

  // Do not show "เข้าสู่ระบบ" if logged in OR currently on /auth
  const hideSignInButton = isLoggedIn || isAuthPage;

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentUserState(null);
    router.push('/auth?mode=signin');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAF9F6] border-b-2 border-indigo-950 px-4 md:px-6 py-2.5 flex items-center justify-between">
      {/* Top-Left: JobGist brand logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center transition-transform hover:scale-[1.02]">
          <Image
            src="/logo-v2.png"
            alt="JobGist with Care"
            width={120}
            height={370}
            className="h-10 md:h-10 w-auto object-contain"
            priority
            unoptimized
          />
        </Link>
      </div>

      {/* Right Navigation: Auth / User State */}
      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          /* User is logged in: Show active profile pill & logout button */
          <div className="flex items-center gap-2">
            <div className="min-h-[44px] px-3 py-1 bg-white border-2 border-indigo-950 riso-shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-indigo-950 truncate max-w-[120px] sm:max-w-[180px]">
                  {currentUser?.display_name || 'ผู้ใช้งาน'}
                </span>
                <span className="text-[10px] font-mono">
                  {currentUser?.role === 'caregiver' ? (
                    <span className="text-[#D946EF] font-bold">ผู้ดูแล</span>
                  ) : currentUser?.role === 'family' ? (
                    <span className="text-indigo-950 font-bold">ครอบครัว</span>
                  ) : (
                    <Link
                      href="/register"
                      title="คลิกเพื่อเลือกฝั่งผู้ใช้งาน"
                      className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 border border-amber-400 font-bold inline-flex items-center gap-0.5"
                    >
                      รอเลือกบทบาท ⚡
                    </Link>
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              className="min-h-[44px] px-3 md:px-3.5 py-2 text-xs md:text-sm font-bold bg-white text-stone-700 hover:text-indigo-950 border-2 border-indigo-950 riso-shadow-sm hover:bg-stone-50 flex items-center justify-center riso-btn-active whitespace-nowrap"
            >
              ออกจากระบบ
            </button>
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
                className="min-h-[44px] px-3 md:px-3.5 py-2 text-xs md:text-sm font-bold bg-white text-indigo-950 border-2 border-indigo-950 riso-shadow-sm hover:bg-stone-50 flex items-center justify-center riso-btn-active whitespace-nowrap"
              >
                เข้าสู่ระบบ
              </Link>
            )}

            {/* สร้างบัญชี */}
            <Link
              href="/auth?mode=signup"
              aria-label="สร้างบัญชี"
              title="เริ่มต้นสร้างบัญชีผู้ใช้งาน"
              className="min-h-[44px] px-3 md:px-3.5 py-2 text-xs md:text-sm font-bold bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow hover:bg-[#c026d3] flex items-center gap-1.5 riso-btn-active whitespace-nowrap"
            >
              <UserIcon className="w-4 h-4 text-white shrink-0" />
              <span>สร้างบัญชี</span>
            </Link>
          </div>
        )}

        {/* Mobile menu toggle */}
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
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#FAF9F6] border-b-2 border-indigo-950 p-4 flex flex-col gap-2.5 md:hidden shadow-lg z-50">
          {isLoggedIn ? (
            <div className="flex items-center justify-between pb-3 border-b-2 border-indigo-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-indigo-950">{currentUser?.display_name}</div>
                  <div className="text-[10px] font-mono">
                    {currentUser?.role === 'caregiver' ? (
                      <span className="text-[#D946EF] font-bold">ผู้ดูแล</span>
                    ) : currentUser?.role === 'family' ? (
                      <span className="text-indigo-950 font-bold">ครอบครัว</span>
                    ) : (
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-amber-800 bg-amber-100 px-1.5 py-0.5 border border-amber-400 font-bold"
                      >
                        รอเลือกบทบาท ⚡
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="min-h-[44px] px-3 py-1.5 text-xs font-bold bg-white text-stone-700 border-2 border-indigo-950 riso-shadow-sm hover:bg-stone-50"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className={`grid ${hideSignInButton ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pb-2 border-b-2 border-indigo-950`}>
              {!hideSignInButton && (
                <Link
                  href="/auth?mode=signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3 py-2 text-center text-xs font-bold bg-white text-indigo-950 border-2 border-indigo-950 riso-shadow-sm flex items-center justify-center"
                >
                  เข้าสู่ระบบ
                </Link>
              )}
              <Link
                href="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
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
                src="/logo-v2.png"
                alt="JobGist with Care"
                width={120}
                height={370}
                className="h-10 md:h-10 w-auto object-contain"
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
