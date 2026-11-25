import { forwardRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cx } from '../lib/utils';

export const inputClass =
  'h-12 w-full rounded-xl border border-white/80 bg-white/75 px-3.5 shadow-[inset_0_1px_2px_rgb(11_28_54/0.06)] text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10 disabled:bg-white/40 disabled:text-slate-500';

export function Spinner({ className }) {
  return <LoaderCircle className={cx('animate-spin', className || 'h-5 w-5')} />;
}

const BUTTON_VARIANTS = {
  primary: 'btn-navy text-white hover:brightness-110',
  gold: 'btn-gold text-white hover:brightness-105',
  secondary: 'glass text-navy-900 hover:bg-white/80',
  soft: 'bg-navy-500/10 text-navy-800 hover:bg-navy-500/15',
  ghost: 'text-navy-700 hover:bg-navy-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  dangerSoft: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15',
};
const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-12 px-4 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-5 text-base gap-2 rounded-2xl',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-[18px] w-[18px]" /> : Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
      {children}
    </button>
  );
});

export function IconButton({ icon: Icon, label, className, tone = 'default', ...rest }) {
  const tones = {
    default: 'text-slate-500 hover:bg-white/70 hover:text-navy-900',
    danger: 'text-rose-500 hover:bg-rose-50',
    onDark: 'text-white/80 hover:bg-white/10 hover:text-white',
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-95', tones[tone], className)}
      {...rest}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function Field({ label, hint, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-slate-600">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const TextInput = forwardRef(function TextInput({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputClass, className)} {...rest} />;
});

export function TextArea({ className, ...rest }) {
  return <textarea className={cx(inputClass, 'h-auto min-h-[88px] resize-y py-3 leading-relaxed', className)} {...rest} />;
}

/** ช่องกรอกข้อความพร้อมรายการแนะนำ (แตะเลือกได้ หรือพิมพ์ค่าอื่นเอง) */
export function SuggestInput({ value, onChange, options, disabled, onBlur, ...rest }) {
  const [focused, setFocused] = useState(false);
  const q = String(value || '').trim().toLowerCase();
  const list = focused
    ? options.filter((o) => o && o.toLowerCase() !== q && (!q || o.toLowerCase().includes(q))).slice(0, 8)
    : [];
  return (
    <div className="relative">
      <TextInput
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          if (onBlur) onBlur(e);
        }}
        autoComplete="off"
        {...rest}
      />
      {list.length > 0 && (
        <div
          className="no-scrollbar absolute inset-x-0 top-full z-20 mt-1.5 flex gap-1.5 overflow-x-auto glass-strong rounded-xl p-1.5"
          onMouseDown={(e) => e.preventDefault()}
        >
          {list.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setFocused(false);
              }}
              className="shrink-0 rounded-lg bg-navy-500/10 px-3 py-1.5 text-sm font-medium text-navy-800 hover:bg-navy-500/15"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, disabled, label, description, busy }) {
  return (
    <label className={cx('flex items-center gap-3 py-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{description}</span>}
      </span>
      {busy && <Spinner className="h-4 w-4 text-slate-400" />}
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-gradient-to-b peer-checked:from-navy-600 peer-checked:to-navy-900 peer-focus-visible:ring-4 peer-focus-visible:ring-navy-500/30" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('glass inline-flex rounded-2xl p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={o.title || o.label}
            title={o.title || o.label}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition',
              size === 'sm' ? 'h-8 min-w-8 px-2 text-[13px]' : 'h-9 min-w-9 px-3 text-sm',
              active ? 'btn-navy text-white' : 'text-slate-600 hover:bg-white/60 hover:text-navy-800',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('glass rounded-3xl', className)} {...rest}>
      {children}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton rounded-2xl', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full glass text-navy-500">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <p className="text-base font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, right, children }) {
  return (
    <header className="pt-safe">
      <div className="flex items-end justify-between gap-3 pb-3 pt-5">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">{eyebrow}</p>}
          <h1 className="truncate text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}
