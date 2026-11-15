'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckIcon, SparklesIcon, CloseIcon } from '@/components/Icons';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'match';
}

interface ToastContextType {
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'match') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, description?: string, type: 'success' | 'info' | 'match' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 border-2 border-indigo-950 riso-shadow-lg flex items-start gap-3 transition-all animate-in slide-in-from-right-4 duration-200 ${
              toast.type === 'match'
                ? 'bg-pink-100 text-pink-950'
                : toast.type === 'info'
                ? 'bg-sky-50 text-sky-950'
                : 'bg-white text-indigo-950'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full border border-indigo-950 flex items-center justify-center shrink-0 mt-0.5 ${
                toast.type === 'match'
                  ? 'bg-[#D946EF] text-white'
                  : toast.type === 'info'
                  ? 'bg-sky-500 text-white'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {toast.type === 'match' ? (
                <SparklesIcon className="w-4 h-4" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 space-y-0.5">
              <h4 className="font-bold text-xs sm:text-sm">{toast.title}</h4>
              {toast.description && (
                <p className="text-xs text-stone-600 leading-relaxed">{toast.description}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-indigo-950 p-1 shrink-0"
              aria-label="ปิดการแจ้งเตือน"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

