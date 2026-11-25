import { useEffect, useState } from 'react';
import { CalendarDays, Settings, ShieldCheck, Users } from 'lucide-react';
import { cx } from '../lib/utils';

export const TABS = [
  { id: 'directory', label: 'ทำเนียบรุ่น', icon: Users },
  { id: 'classes', label: 'ตารางสอน', icon: CalendarDays },
  { id: 'duty', label: 'ตารางเวร', icon: ShieldCheck },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
];

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

export default function BottomNav({ tab, onChange, adminActive }) {
  const hidden = useHideOnScroll();

  useEffect(() => {
    document.documentElement.dataset.navHidden = hidden ? 'true' : 'false';
  }, [hidden]);

  return (
    <nav className="dock" data-hidden={hidden ? 'true' : 'false'} aria-label="เมนูหลัก">
      <div className="grid grid-cols-4 gap-1 glass rounded-[28px] p-1.5 shadow-[0_16px_40px_-12px_rgba(11,28,54,0.45)]">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-[20px] transition-all duration-200 active:scale-95',
                active ? 'btn-navy text-white' : 'text-slate-600 hover:bg-white/60 hover:text-navy-800',
              )}
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.9} />
              <span className="text-[11px] font-medium leading-none">{t.label}</span>
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
