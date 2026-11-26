import { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { MORE_TABS } from './BottomNav';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx } from '../lib/utils';

/**
 * ปุ่ม "เมนูอื่น" บนหัวของทุกหน้า (แถวเดียวกับปุ่มรีเฟรช) — รวมเมนูที่เกินจากเมนูด้านล่าง 5 รายการ
 * จุดสีทองบนปุ่ม = เข้าสู่ระบบแอดมินอยู่
 */
export default function MoreMenuButton() {
  const ui = useUI();
  const { isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!MORE_TABS.length) return null;
  const onMorePage = MORE_TABS.some((t) => t.id === ui.tab);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="เมนูอื่น"
        title="เมนูอื่น"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          'relative grid h-11 w-11 place-items-center rounded-full transition active:scale-95',
          onMorePage || open ? 'btn-navy text-white' : 'glass text-navy-700',
        )}
      >
        <LayoutGrid className="h-5 w-5" />
        {isAdmin && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold-400 ring-2 ring-white" />}
      </button>
      {open && (
        <div role="menu" aria-label="เมนูอื่น" className="absolute right-0 top-full z-40 mt-2 w-56 animate-pop rounded-2xl bg-white/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(11,28,54,0.45)] ring-1 ring-black/5 backdrop-blur-xl">
          <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold text-slate-500">เมนูอื่น</p>
          {MORE_TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === ui.tab;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  ui.go(t.id);
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[14px] font-medium transition',
                  active ? 'bg-navy-500/10 text-navy-900' : 'text-navy-900 hover:bg-white/70',
                )}
              >
                <Icon className="h-[18px] w-[18px] text-navy-600" />
                <span className="flex-1">{t.label}</span>
                {t.id === 'settings' && isAdmin && <span className="rounded-full bg-gold-400/25 px-2 py-px text-[11px] font-semibold text-gold-700">แอดมิน</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
