import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, MessageCircle, MessageSquareWarning, Phone } from 'lucide-react';
import { MORE_TABS } from './BottomNav';
import ReportSheet from './ReportSheet';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx } from '../lib/utils';
import { DEVELOPER, developerLine, developerTel, versionLabel } from '../lib/about';

/**
 * ปุ่ม "เมนูอื่น" บนหัวของทุกหน้า: ตั้งค่า/แอดมิน, แจ้งปัญหา, เวอร์ชันแอป และผู้พัฒนาระบบ
 * จุดสีทองบนปุ่ม = เข้าสู่ระบบแอดมินอยู่
 */
export default function MoreMenuButton() {
  const ui = useUI();
  const { isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
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

  const onMorePage = MORE_TABS.some((t) => t.id === ui.tab);
  const itemClass = 'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[14px] font-medium text-navy-900 transition hover:bg-white/70';

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
        <div role="menu" aria-label="เมนูอื่น" className="absolute right-0 top-full z-40 mt-2 w-[17rem] animate-pop rounded-2xl bg-white/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(11,28,54,0.45)] ring-1 ring-black/5 backdrop-blur-xl">
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
                className={cx(itemClass, active && 'bg-navy-500/10')}
              >
                <Icon className="h-[18px] w-[18px] text-navy-600" />
                <span className="flex-1">{t.label}</span>
                {t.id === 'settings' && isAdmin && <span className="rounded-full bg-gold-400/25 px-2 py-px text-[11px] font-semibold text-gold-700">แอดมิน</span>}
              </button>
            );
          })}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setReport(true);
            }}
            className={itemClass}
          >
            <MessageSquareWarning className="h-[18px] w-[18px] text-navy-600" />
            <span className="flex-1">แจ้งปัญหา / ข้อเสนอแนะ</span>
          </button>

          <div className="mx-1 mt-1.5 border-t border-slate-200/80 px-1.5 pb-1 pt-2.5">
            <p className="text-[11px] font-semibold text-slate-500">ผู้พัฒนาระบบ</p>
            <p className="text-[13px] font-semibold leading-snug text-navy-900">{DEVELOPER.name}</p>
            <p className="text-[12px] text-slate-500">({DEVELOPER.nick})</p>
            <div className="mt-2 flex gap-1.5">
              <a href={developerTel} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-navy-500/10 text-[12px] font-semibold text-navy-800">
                <Phone className="h-3.5 w-3.5" /> {DEVELOPER.phone}
              </a>
              <a href={developerLine} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#06C755] text-[12px] font-semibold text-white">
                <MessageCircle className="h-3.5 w-3.5" /> {DEVELOPER.line}
              </a>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">เวอร์ชัน {versionLabel()}</p>
          </div>
        </div>
      )}
      <ReportSheet open={report} onClose={() => setReport(false)} />
    </div>
  );
}
