import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockScroll, pushOverlay } from '../lib/overlay';
import { cx } from '../lib/utils';

/** ผูกหน้าต่างเข้ากับปุ่มย้อนกลับของมือถือ และล็อกการเลื่อนหน้าหลัก */
export function useOverlay(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const release = pushOverlay(() => onCloseRef.current && onCloseRef.current());
    const unlock = lockScroll();
    return () => {
      unlock();
      release();
    };
  }, [open]);
}

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Bottom sheet บนมือถือ / Modal กลางจอบนคอมพิวเตอร์
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md', flush = false, dismissable = true, center = false }) {
  useOverlay(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className={cx('fixed inset-0 z-50 flex justify-center sm:items-center sm:p-6', center ? 'items-center p-5' : 'items-end')}>
      <div
        className="absolute inset-0 animate-fade-in bg-navy-950/40 backdrop-blur-sm"
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx(
          'glass-strong relative flex w-full flex-col overflow-hidden',
          center
            ? 'max-h-[86dvh] animate-pop rounded-3xl'
            : 'max-h-[93dvh] animate-sheet-up rounded-t-[28px] sm:max-h-[88dvh] sm:rounded-3xl',
          SIZES[size],
        )}
      >
        {!center && <div className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300/80 sm:hidden" />}
        {title ? (
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-6 sm:pt-5">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight text-navy-900">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="-mr-1.5 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-navy-950/45 text-white backdrop-blur transition hover:bg-navy-950/60 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain', !flush && 'px-5', !footer && !flush && 'pb-safe')}>
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-white/70 bg-white/60 px-5 pb-safe pt-3 backdrop-blur-xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
