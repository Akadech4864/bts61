import { useEffect, useState } from 'react';
import { CalendarDays, FolderOpen, GraduationCap, Landmark, LayoutGrid, Settings, ShieldCheck, Users } from 'lucide-react';
import { cx } from '../lib/utils';

/** เมนูทั้งหมดของแอพ — 5 รายการแรกอยู่ที่เมนูด้านล่าง ที่เหลืออยู่ในแถบ "เมนูอื่น" ด้านบน */
export const TABS = [
  { id: 'directory', label: 'ทำเนียบรุ่น', icon: Users },
  { id: 'classes', label: 'ตารางสอน', icon: CalendarDays },
  { id: 'duty', label: 'ตารางเวร', icon: ShieldCheck },
  { id: 'instructors', label: 'อาจารย์', icon: GraduationCap },
  { id: 'docs', label: 'เอกสาร', title: 'งาน / เอกสาร', icon: FolderOpen },
  { id: 'about', label: 'เกี่ยวกับหลักสูตร', icon: Landmark },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
];
export const DOCK_LIMIT = 5;
export const DOCK_TABS = TABS.slice(0, DOCK_LIMIT);
export const MORE_TABS = TABS.slice(DOCK_LIMIT);

/** ซ่อนเมื่อเลื่อนลง แสดงทันทีเมื่อเลื่อนขึ้นหรืออยู่บนสุดของหน้า */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = Math.max(window.scrollY, 0);
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = Math.max(window.scrollY, 0);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const dy = y - lastY;
      if (y < 56) {
        setHidden(false);
        lastY = y;
      } else if (dy > 8) {
        setHidden(true);
        lastY = y;
      } else if (dy < -6 && y < max - 4) {
        // y < max: กันการเด้งกลับของ iOS ตอนสุดหน้า
        setHidden(false);
        lastY = y;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

/**
 * แถบ "เมนูอื่น" ด้านบนสุดของทุกหน้า: รวมเมนูที่เกินจากเมนูด้านล่าง (เกิน 5 รายการ)
 * ไอคอนตารางที่หัวแถบบอกว่ายังมีเมนูอื่นอยู่ตรงนี้
 */
export function MoreBar({ tab, onChange, adminActive }) {
  if (!MORE_TABS.length) return null;
  return (
    <nav className="morebar" aria-label="เมนูอื่น">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4">
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-500">
          <LayoutGrid className="h-3.5 w-3.5" /> เมนูอื่น
        </span>
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
          {MORE_TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition active:scale-95',
                  active ? 'btn-navy text-white' : 'glass text-navy-800',
                )}
              >
                <Icon className="h-[15px] w-[15px]" strokeWidth={active ? 2.3 : 2} />
                {t.label}
                {t.id === 'settings' && adminActive && <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-label="เข้าสู่ระบบแอดมินอยู่" />}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function BottomNav({ tab, onChange, adminActive }) {
  const hidden = useHideOnScroll();

  useEffect(() => {
    document.documentElement.dataset.navHidden = hidden ? 'true' : 'false';
  }, [hidden]);

  return (
    <nav className="dock" data-hidden={hidden ? 'true' : 'false'} aria-label="เมนูหลัก">
      <div
        className="grid gap-1 glass rounded-[28px] p-1.5 shadow-[0_16px_40px_-12px_rgba(11,28,54,0.45)]"
        style={{ gridTemplateColumns: `repeat(${DOCK_TABS.length}, minmax(0, 1fr))` }}
      >
        {DOCK_TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex h-[54px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[20px] transition-all duration-200 active:scale-95',
                active ? 'btn-navy text-white' : 'text-slate-600 hover:bg-white/60 hover:text-navy-800',
              )}
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.9} />
              <span className="max-w-full truncate px-0.5 text-[11px] font-medium leading-none">{t.label}</span>
              {t.id === 'settings' && adminActive && (
                <span className="absolute right-3.5 top-2 h-2 w-2 rounded-full bg-gold-400 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
