'use client';

/**
 * LIVE mode only: loads the signed-in user's data from Supabase before pages render,
 * sends signed-out users to /auth, keeps each role on its own pages, and shows write errors.
 * Without Supabase env vars it renders children unchanged (mock mode).
 */
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LIVE, hydrateLive, getCurrentUser } from '@/services/api';
import { sb } from '@/services/live';

const PUBLIC_PATHS = ['/', '/auth', '/register'];

function homeFor(role: string | null) {
  return role === 'caregiver' ? '/caregiver/jobs' : role === 'family' ? '/family/applicants' : '/register';
}

export default function LiveGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [ready, setReady] = useState(!LIVE);
  const [error, setError] = useState('');

  // first load: restore the Supabase session and fill the cache
  useEffect(() => {
    if (!LIVE) return;
    let alive = true;
    hydrateLive().finally(() => alive && setReady(true));
    const { data } = sb().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') void hydrateLive();
    });
    const onErr = (e: Event) => setError((e as CustomEvent).detail?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    window.addEventListener('jg_live_error', onErr);
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      window.removeEventListener('jg_live_error', onErr);
    };
  }, []);

  // route guard
  useEffect(() => {
    if (!LIVE || !ready) return;
    const cur = getCurrentUser();
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!cur.id) {
      if (!isPublic) router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pathname.startsWith('/caregiver') && cur.role !== 'caregiver') router.replace(homeFor(cur.role));
    if (pathname.startsWith('/family') && cur.role !== 'family') router.replace(homeFor(cur.role));
  }, [pathname, ready, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] text-indigo-950">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-indigo-950 border-t-[#D946EF] animate-spin" />
          <p className="text-sm font-bold">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] bg-rose-50 border-2 border-rose-700 text-rose-900 px-4 py-3 text-sm shadow-lg">
          <div className="flex items-start gap-3">
            <span className="font-bold">บันทึกข้อมูลไม่สำเร็จ</span>
            <button onClick={() => setError('')} className="ml-auto font-bold" aria-label="ปิด">✕</button>
          </div>
          <p className="mt-1 break-words text-xs">{error}</p>
        </div>
      )}
    </>
  );
}
