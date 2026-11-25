import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Copy, ExternalLink, Globe, Link2, MessageCircle, MessagesSquare, Music2, Play, Plus, Send, X } from 'lucide-react';
import { inputClass } from './ui';
import { useToast } from './Toast';
import { copyText, cx } from '../lib/utils';
import { MAX_SOCIALS, MAX_SOCIAL_VALUE, SOCIAL_PLATFORMS, parseSocial, platformOf, socialHref, socialText } from '../lib/social';

const GLYPH_ICONS = { music: Music2, play: Play, send: Send, chat: MessageCircle, chats: MessagesSquare, globe: Globe, link: Link2 };

/** ป้ายสีประจำแพลตฟอร์ม (ใช้อักษรย่อ/ไอคอนกลาง ๆ แทนโลโก้) */
export function SocialBadge({ type, className }) {
  const p = platformOf(type);
  const iconName = p.glyph.startsWith('icon:') ? p.glyph.slice(5) : '';
  const Icon = GLYPH_ICONS[iconName];
  return (
    <span
      aria-hidden="true"
      style={{ background: p.bg, color: p.fg || '#fff' }}
      className={cx('grid shrink-0 select-none place-items-center rounded-xl font-bold leading-none shadow-sm ring-1 ring-inset ring-white/25', className || 'h-9 w-9')}
    >
      {Icon ? (
        <Icon className="h-[46%] w-[46%]" strokeWidth={2.4} fill={iconName === 'play' ? 'currentColor' : 'none'} />
      ) : (
        <span className={p.glyph.length > 2 ? 'text-[9px] tracking-tight' : p.glyph.length > 1 ? 'text-[13px]' : 'text-[19px]'}>{p.glyph}</span>
      )}
    </span>
  );
}

let rowSeq = 0;
const newRowKey = () => `s${Date.now().toString(36)}-${++rowSeq}`;
/** ค่าในฐานข้อมูล -> แถวในฟอร์ม (มี key ไว้ให้ React จำแถว) */
export const socialRows = (raw) => parseSocial(raw).map((s) => ({ key: newRowKey(), type: s.type, value: s.value }));
/** แถวในฟอร์ม -> รายการที่จะบันทึก (ตัดแถวที่ยังไม่ได้กรอกทิ้ง) */
export const socialPayload = (rows) =>
  rows.map((r) => ({ type: r.type, value: r.value.trim() })).filter((r) => r.value).slice(0, MAX_SOCIALS);

/**
 * ช่องกรอกโซเชียลมีเดียในฟอร์ม: เลือกแพลตฟอร์มแล้วกด + เพื่อเพิ่มช่องกรอก เพิ่มได้หลายรายการ
 * rows = [{ key, type, value }]
 */
export function SocialEditor({ rows, onChange, disabled }) {
  const firstUnused = () => (SOCIAL_PLATFORMS.find((p) => !rows.some((r) => r.type === p.key)) || SOCIAL_PLATFORMS[0]).key;
  const [picked, setPicked] = useState(firstUnused);
  const inputs = useRef(new Map());
  const focusKey = useRef(''); // แถวที่เพิ่งเพิ่ม รอให้แสดงผลแล้วจึงย้ายเคอร์เซอร์ไปที่ช่องนั้น
  const full = rows.length >= MAX_SOCIALS;

  useEffect(() => {
    const el = focusKey.current && inputs.current.get(focusKey.current);
    if (!el) return;
    focusKey.current = '';
    el.focus();
  }, [rows]);

  function add() {
    if (disabled || full) return;
    const key = newRowKey();
    const next = [...rows, { key, type: picked, value: '' }];
    focusKey.current = key;
    onChange(next);
    // เลื่อนตัวเลือกไปยังแพลตฟอร์มถัดไปที่ยังไม่ได้เพิ่ม เพื่อให้กด + ต่อได้เลย
    const unused = SOCIAL_PLATFORMS.find((p) => !next.some((r) => r.type === p.key));
    if (unused) setPicked(unused.key);
  }

  const update = (key, value) => onChange(rows.map((r) => (r.key === key ? { ...r, value } : r)));
  const remove = (key) => onChange(rows.filter((r) => r.key !== key));

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-slate-600">
        โซเชียลมีเดีย <span className="font-normal text-slate-400">(ไม่บังคับ เพิ่มได้หลายรายการ)</span>
      </span>

      {rows.length > 0 && (
        <ul className="mb-2.5 space-y-2">
          {rows.map((r) => {
            const p = platformOf(r.type);
            return (
              <li key={r.key} className="flex items-center gap-2">
                <SocialBadge type={r.type} className="h-12 w-12" />
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3.5 top-1.5 text-[11px] font-semibold leading-none text-slate-500">{p.label}</span>
                  <input
                    ref={(el) => {
                      if (el) inputs.current.set(r.key, el);
                      else inputs.current.delete(r.key);
                    }}
                    value={r.value}
                    onChange={(e) => update(r.key, e.target.value)}
                    disabled={disabled}
                    maxLength={MAX_SOCIAL_VALUE}
                    placeholder={p.placeholder}
                    aria-label={p.label}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    className={cx(inputClass, 'pb-0 pt-4')}
                  />
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(r.key)}
                    aria-label={`ลบ ${p.label}`}
                    title="ลบรายการนี้"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-rose-500 transition hover:bg-rose-50 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && !full && (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SocialBadge type={picked} className="pointer-events-none absolute left-2 top-2 h-8 w-8 rounded-lg" />
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              aria-label="เลือกโซเชียลมีเดียที่จะเพิ่ม"
              className={cx(inputClass, 'cursor-pointer appearance-none pl-12 pr-10 font-medium')}
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={add}
            aria-label={`เพิ่ม ${platformOf(picked).label}`}
            className="btn-navy inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[15px] font-semibold text-white transition active:scale-[0.97]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.6} /> เพิ่ม
          </button>
        </div>
      )}
      {!disabled && (
        <span className="mt-1 block text-xs text-slate-400">
          {full ? `เพิ่มได้สูงสุด ${MAX_SOCIALS} รายการ` : 'เลือกช่องทาง แล้วกด “+ เพิ่ม” จากนั้นกรอกชื่อบัญชีหรือวางลิงก์โปรไฟล์'}
        </span>
      )}
    </div>
  );
}

/** รายการโซเชียลมีเดียในหน้าข้อมูลสมาชิก: แตะเพื่อเปิดโปรไฟล์ หรือคัดลอก */
export function SocialList({ value }) {
  const toast = useToast();
  const items = parseSocial(value);
  if (!items.length) return null;

  async function onCopy(text) {
    const ok = await copyText(text);
    if (ok) toast.success('คัดลอกแล้ว');
    else toast.error('คัดลอกไม่สำเร็จ');
  }

  return (
    <div className="glass mt-3 rounded-3xl px-4 py-1">
      <p className="pb-0.5 pt-2.5 text-xs text-slate-500">โซเชียลมีเดีย</p>
      <ul className="divide-y divide-white/70">
        {items.map((item, i) => {
          const p = platformOf(item.type);
          const href = socialHref(item);
          const text = socialText(item);
          const body = (
            <>
              <SocialBadge type={item.type} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">{p.label}</span>
                <span className="block truncate text-[15px] font-medium leading-snug text-slate-800">{text}</span>
              </span>
            </>
          );
          const rowClass = 'flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left transition active:opacity-70';
          return (
            <li key={`${item.type}-${i}`} className="flex items-center gap-1">
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass} aria-label={`เปิด ${p.label}: ${text}`}>
                  {body}
                  <ExternalLink className="h-4 w-4 shrink-0 text-navy-400" />
                </a>
              ) : (
                <button type="button" onClick={() => onCopy(item.value)} className={rowClass} aria-label={`คัดลอก ${p.label}: ${text}`}>
                  {body}
                </button>
              )}
              <button
                type="button"
                onClick={() => onCopy(item.value)}
                aria-label={`คัดลอก ${p.label}`}
                title="คัดลอก"
                className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-white/70 hover:text-navy-800 active:scale-95"
              >
                <Copy className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
