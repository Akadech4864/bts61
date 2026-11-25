import { Photo } from './Avatar';
import { cx, fullName } from '../lib/utils';

/**
 * รายการแนะนำชื่อแบบ Real-time (รูปหน้าตรงขนาดเล็ก + ยศ ชื่อ-สกุล + ชื่อเล่น)
 * วางไว้ใต้ช่องพิมพ์ โดยครอบด้วย element ที่เป็น position: relative
 */
export default function MemberSuggest({ items, onPick, title, className, floating = true }) {
  if (!items || !items.length) return null;
  return (
    <div
      className={cx(
        'glass-strong overflow-hidden rounded-2xl',
        floating && 'absolute inset-x-0 top-full z-30 mt-1.5 animate-pop shadow-xl shadow-navy-900/10',
        className,
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      {title && <p className="border-b border-white/70 px-3.5 py-2 text-xs font-medium text-slate-500">{title}</p>}
      <ul className="max-h-72 overflow-y-auto overscroll-contain py-1">
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onPick(m)}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition hover:bg-navy-500/10 active:bg-navy-500/15"
            >
              <Photo member={m} width={96} className="h-11 w-11 shrink-0 rounded-xl" textClass="text-base" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-navy-900">{fullName(m)}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[m.nickname && `“${m.nickname}”`, m.position].filter(Boolean).join(' · ') || 'ยังไม่มีชื่อเล่น'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
