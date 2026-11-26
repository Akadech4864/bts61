import { useEffect, useState } from 'react';
import { CalendarDays, GraduationCap, House, Settings, Users } from 'lucide-react';
import { cx } from '../lib/utils';

/**
 * เมนูหลักของแอพ จัดเป็น 3 หมวดใหญ่ที่เมนูด้านล่าง (ที่เหลืออยู่ในปุ่ม "เมนูอื่น" บนหัวของทุกหน้า)
 * - ทำเนียบรุ่น
 * - ตาราง: ตารางสอน / ตารางเวร
 * - หลักสูตร: ข้อมูล / อาจารย์ / ประวัติ / เอกสาร
 */
export const TABS = [
  { id: 'home', label: 'หน้าแรก', icon: House },
  { id: 'directory', label: 'ทำเนียบรุ่น', icon: Users },
  { id: 'schedule', label: 'ตาราง', title: 'ตารางสอน / ตารางเวร', icon: CalendarDays },
  { id: 'course', label: 'หลักสูตร', icon: GraduationCap },
  { id: 'settings', label: 'ตั้งค่า / แอดมิน', icon: Settings },
];
/** ชื่อเมนูเดิมที่ย้ายไปรวมกัน (ใช้กับแท็บที่จำไว้ในเครื่อง) */
export const TAB_ALIASES = { about: 'course', instructors: 'course', docs: 'course', classes: 'schedule', duty: 'schedule' };
/** มุมมองย่อยของเมนูเดิม เมื่อถูกเรียกด้วยชื่อเก่า เช่น ui.go('classes', { date }) */
export const ALIAS_VIEWS = { classes: { sub: 'classes' }, duty: { sub: 'duty' }, docs: { tab: 'docs' }, instructors: { tab: 'instructors' }, about: { tab: 'info' } };
export const DOCK_LIMIT = 4;
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

export default function BottomNav({ tab, onChange, adminActive, dots }) {
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
              {((t.id === 'settings' && adminActive) || (dots && dots[t.id])) && (
                <span className="absolute left-1/2 top-2 ml-3 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
