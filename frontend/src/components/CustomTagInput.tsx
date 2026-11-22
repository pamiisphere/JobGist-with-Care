'use client';

import React, { useState } from 'react';
import { CUSTOM_TAG_LIMIT, CUSTOM_TAG_MAX_LEN } from '@/types/database';

/**
 * Free-text tags for things the standard list doesn't cover (e.g. "ผู้ป่วยไตวาย ฟอกไต").
 * They are shown to the other side and sent to the AI summary as text,
 * but are NOT scored by the rule-based matcher (free text can't be compared reliably).
 */
export default function CustomTagInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  const full = value.length >= CUSTOM_TAG_LIMIT;

  const add = () => {
    const t = draft.replace(/\s+/g, ' ').trim().slice(0, CUSTOM_TAG_MAX_LEN);
    if (!t || full || value.includes(t)) return setDraft('');
    onChange([...value, t]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-indigo-950 block">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          maxLength={CUSTOM_TAG_MAX_LEN}
          disabled={full}
          placeholder={full ? `เพิ่มได้สูงสุด ${CUSTOM_TAG_LIMIT} แท็ก` : placeholder}
          className="flex-1 min-w-0 min-h-[44px] px-3 text-sm bg-white border-2 border-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#D946EF] disabled:bg-stone-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={full || !draft.trim()}
          className="min-h-[44px] px-4 text-sm font-bold bg-[#D946EF] text-white border-2 border-indigo-950 riso-shadow-sm riso-btn-active disabled:opacity-40 shrink-0"
        >
          + เพิ่ม
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((t) => (
            <span
              key={t}
              className="min-h-[40px] pl-3 pr-1 text-sm font-bold bg-amber-50 text-indigo-950 border-2 border-dashed border-indigo-950 flex items-center gap-1"
            >
              {t}
              <button
                type="button"
                aria-label={`ลบแท็ก ${t}`}
                onClick={() => onChange(value.filter((x) => x !== t))}
                className="w-8 h-8 flex items-center justify-center text-lg leading-none text-stone-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-stone-500">
        แท็กที่พิมพ์เองจะแสดงให้อีกฝ่ายเห็น และ AI จะนำไปใช้ตอนสรุป แต่ไม่นำไปคิดคะแนนความเหมาะสม
      </p>
    </div>
  );
}
