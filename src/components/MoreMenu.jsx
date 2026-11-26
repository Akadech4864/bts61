import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, MessageCircle, MessageSquareWarning, Phone } from 'lucide-react';
import ReportSheet from './ReportSheet';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx } from '../lib/utils';
import { DEVELOPER, developerLine, developerTel, versionLabel } from '../lib/about';

/**
 * ปุ่ม "เมนูอื่น" ที่เมนูด้านล่าง (ช่องขวาสุด): ตั้งค่า/แอดมิน, แจ้งปัญหา, ผู้พัฒนาระบบ และเวอร์ชันแอป
 * tabs = เมนูที่ไม่อยู่บนแถบล่าง (เช่น ตั้งค่า) | จุดสีทอง = เข้าสู่ระบบแอดมินอยู่
 */
export default function MoreMenuDock({ tabs = [], activeTab, onGo }) {
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

  const onMorePage = tabs.some((t) => t.id === activeTab);
  const itemClass = 'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[14px] font-medium text-navy-900 transition hover:bg-navy-500/5';

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="เมนูอื่น"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          'relative flex h-[54px] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[20px] transition-all duration-200 active:scale-95',
          onMorePage || open ? 'btn-navy text-white' : 'text-slate-600 hover:bg-white/60 hover:text-navy-800',
        )}
      >
        <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={onMorePage || open ? 2.2 : 1.9} />
        <span className="max-w-full truncate px-0.5 text-[11px] font-medium leading-none">เมนูอื่น</span>
        {isAdmin && <span className="absolute left-1/2 top-2 ml-3 h-2.5 w-2.5 rounded-full bg-gold-400 ring-2 ring-white" />}
      </button>

      {open && (
        <div role="menu" aria-label="เมนูอื่น" className="absolute bottom-full right-0 mb-3 w-[17rem] animate-pop rounded-2xl bg-white/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(11,28,54,0.45)] ring-1 ring-black/5 backdrop-blur-xl">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  (onGo || ui.go)(t.id);
                }}
                className={cx(itemClass, t.id === activeTab && 'bg-navy-500/10')}
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
