import { ChevronRight, Pencil } from 'lucide-react';
import { Photo } from './Avatar';
import { SwapDot, markOf } from './DutySwap';
import { cx, formatDate, nickOf, relativeDay, shortName } from '../lib/utils';

/**
 * การ์ดเด่นของเวร (แบบเดียวกับการ์ด "กำลังเรียนอยู่ตอนนี้"): ผู้เข้าเวรวันนี้ หรือวันเวรถัดไป
 * groups = [{ role, entries: [{ item, people }] }] | next = { date, names } เวรวันถัดไป (ถ้ามี)
 */
export default function DutyHero({ date, today, groups, marks, mineId, onOpen, onEdit, next, hideDate = false, onMore }) {
  const isToday = date === today;
  return (
    <section className="glass-dark relative overflow-hidden rounded-3xl p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10" />
      <div className="flex items-center justify-between gap-2">
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', isToday ? 'bg-emerald-500 text-white' : 'bg-gold-400 text-navy-950')}>
          {isToday ? <><span className="pulse-dot" /> เข้าเวรวันนี้</> : `เวรถัดไป · ${relativeDay(date, today)}`}
        </span>
        {onMore && (
          <button type="button" onClick={onMore} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-white/60 transition active:opacity-70">
            ตารางเวร <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      {!hideDate && <h2 className="mt-3 text-[20px] font-bold leading-snug">{formatDate(date, 'long')}</h2>}

      <div className={cx(hideDate ? 'mt-3' : 'mt-4', 'grid gap-3', groups.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
        {groups.map(({ role, entries }) => (
          <div key={role} className="min-w-0 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-inset ring-white/10">
            <p className="mb-2 truncate text-[12px] font-semibold text-gold-200">{role}</p>
            {!entries.length && <p className="text-[13px] text-white/40">—</p>}
            {entries.map(({ item, people }) => {
              const nobody = !people.members.length && !people.extras.length;
              return (
                <div key={item.id} className="relative space-y-2">
                  {people.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onOpen(m.id)}
                      className={cx('flex w-full min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1 text-center transition active:scale-[0.97]', m.id === mineId && 'bg-gold-400/20 ring-1 ring-gold-300/60')}
                    >
                      <span className="relative">
                        <Photo member={m} width={240} className="h-[72px] w-[72px] rounded-full object-[center_20%] ring-2 ring-white/40" textClass="text-xl" />
                        {m.seq && (
                          <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold tabular-nums leading-none text-navy-950 ring-2 ring-navy-900">
                            {m.seq}
                          </span>
                        )}
                        {marks && <SwapDot mark={markOf(marks, item.id, m.id)} className="absolute -left-1 -top-1 ring-navy-900" />}
                      </span>
                      <span className="block w-full truncate text-[17px] font-bold leading-tight">{nickOf(m)}</span>
                      {/* ยศ/คำนำหน้า + ชื่อจริงฯ */}
                      <span className="-mt-1 block w-full truncate text-[12.5px] text-white/70">{shortName(m)}</span>
                    </button>
                  ))}
                  {people.extras.map((name) => <p key={name} className="text-[14px] font-medium text-white/90">{name}</p>)}
                  {item.note && <p className={cx('leading-snug', nobody ? 'text-[13px] text-white/80' : 'text-center text-[11.5px] text-gold-200')}>{item.note}</p>}
                  {nobody && !item.note && <p className="text-[13px] text-white/40">ยังไม่ระบุ</p>}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      aria-label="แก้ไขรายการนี้ (แอดมิน)"
                      className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white/80 ring-1 ring-white/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {next && (
        <p className="mt-4 border-t border-white/10 pt-3 text-[12.5px] text-white/70">
          เวรถัดไป <span className="font-semibold text-white">{relativeDay(next.date, today)}</span>
          {next.names ? ` · ${next.names}` : ''}
        </p>
      )}
    </section>
  );
}
