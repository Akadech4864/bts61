import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cx } from '../lib/utils';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const STYLES = {
  success: { icon: CircleCheck, tone: 'text-emerald-400' },
  error: { icon: TriangleAlert, tone: 'text-rose-400' },
  info: { icon: Info, tone: 'text-gold-300' },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (type, message, duration) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-2), { id, type, message }]);
      setTimeout(() => dismiss(id), duration || (type === 'error' ? 5000 : 3000));
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (m, d) => show('success', m, d),
      error: (m, d) => show('error', m, d),
      info: (m, d) => show('info', m, d),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
          aria-live="polite"
        >
          {items.map((t) => {
            const { icon: Icon, tone } = STYLES[t.type];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => dismiss(t.id)}
                className="pointer-events-auto flex max-w-md animate-toast items-start gap-2.5 glass-dark rounded-2xl px-4 py-3 text-left text-sm font-medium"
              >
                <Icon className={cx('mt-0.5 h-[18px] w-[18px] shrink-0', tone)} />
                <span className="leading-snug">{t.message}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
