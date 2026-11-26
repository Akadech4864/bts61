import { useEffect, useMemo, useState } from 'react';
import { MissingMarks } from '../components/MissingMarks';
import DutyHero from '../components/DutyHero';
import { ArrowLeftRight, CalendarClock, ChevronUp, History, Pencil, Plus, Search, ShieldCheck, UserRoundSearch, X } from 'lucide-react';
import MoreMenuButton from '../components/MoreMenu';
import { Photo } from '../components/Avatar';
import { Button, EmptyState, PageHeader, Skeleton, TopBarSentinel } from '../components/ui';
import { SwapDot, SwapForm, SwapHistory, firstNameShort, markOf, swapMarks } from '../components/DutySwap';
import MemberSuggest from '../components/MemberSuggest';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import {
  addDays, cx, daysBetween, fullName, guessMembers, nickOf, normalize, parseISODate, queryTokens, relativeDay, resolveDuty,
  thCompare, toISODate, useNow, usePersistentState,
} from '../lib/utils';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
// คอลัมน์ที่ขึ้นก่อน (หน้าที่อื่นเรียงตามที่พบในข้อมูล)
const ROLE_ORDER = ['เวรทั่วไป', 'เวรรับอาจารย์'];

/** วันจันทร์ของสัปดาห์ที่มีวันนั้น */
function mondayOf(iso) {
  const d = parseISODate(iso);
  return addDays(iso, -((d.getDay() + 6) % 7));
}
const shortDate = (iso) => {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const beYear = (iso) => String(parseISODate(iso).getFullYear() + 543).slice(2);

const FULL_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/** ผู้เข้าเวร (แบบเดียวกับหน้าแรก): รูปวงกลม + ชื่อเล่น + ชื่อจริงฯ + ลำดับที่ + สัญลักษณ์สลับเวร/ข้อมูลไม่ครบ */
function DutyPerson({ member, highlight, onOpen, mark }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(member.id)}
      className={cx(
        'flex w-full min-w-0 items-center gap-2.5 rounded-2xl p-1 text-left transition active:scale-[0.98]',
        highlight ? 'bg-gold-300/45 ring-1 ring-inset ring-gold-400' : 'hover:bg-white/60',
      )}
    >
      <span className="relative shrink-0">
        <Photo member={member} width={160} className="h-12 w-12 rounded-full object-[center_20%] ring-2 ring-white" textClass="text-sm" />
        {member.seq && (
          <span className="absolute -bottom-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-navy-900 px-1 text-[9.5px] font-bold tabular-nums leading-none text-white ring-2 ring-white">
            {member.seq}
          </span>
        )}
        <SwapDot mark={mark} className="absolute -left-1.5 -top-1.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold leading-tight text-navy-900">{nickOf(member)}</span>
        <span className="block truncate text-[12px] text-slate-500">{firstNameShort(member)}</span>
        <MissingMarks member={member} size={16} className="mt-0.5 flex" />
      </span>
    </button>
  );
}

/** การ์ดหน้าที่ 1 ช่อง (เช่น เวรทั่วไป): ชื่อหน้าที่ + ผู้เข้าเวร + หมายเหตุ */
function RoleCard({ role, entries, mineId, onOpen, onEdit, marks }) {
  return (
    <div className="rounded-2xl bg-white/55 p-2.5 ring-1 ring-inset ring-white/80">
      <p className="mb-1.5 truncate px-1 text-[12px] font-semibold text-slate-500">{role}</p>
      {!entries || !entries.length ? (
        <p className="px-1 py-2 text-[13px] text-slate-300">—</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(({ item, people }) => {
            const nobody = !people.members.length && !people.extras.length;
            return (
              <div key={item.id} className="relative">
                {people.members.map((m) => (
                  <DutyPerson key={m.id} member={m} highlight={m.id === mineId} onOpen={onOpen} mark={markOf(marks, item.id, m.id)} />
                ))}
                {people.extras.map((name) => (
                  <p key={name} className="px-1 text-[14px] font-medium leading-snug text-slate-700">{name}</p>
                ))}
                {item.note && <p className={cx('px-1 leading-snug', nobody ? 'py-1 text-[13px] text-slate-600' : 'mt-1 text-[12px] text-gold-700')}>{item.note}</p>}
                {nobody && !item.note && <p className="px-1 py-1 text-[13px] text-slate-400">ยังไม่ระบุ</p>}
                {onEdit && (
                  // ปุ่มแก้ไขเห็นเฉพาะแอดมิน
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label="แก้ไขรายการนี้ (แอดมิน)"
                    title="แก้ไข (เฉพาะแอดมิน)"
                    className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-slate-500 shadow-sm ring-1 ring-white hover:text-navy-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** ตารางเวรแบบการ์ดรายวัน (เหมือน "เวรวันนี้" ในหน้าแรก): 1 การ์ด = 1 วัน แบ่งช่องตามหน้าที่ */
function DutyTable({ weeks, roles, today, mineId, onOpen, onEdit, marks }) {
  const allDays = weeks.flatMap((w) => w.days);
  const anchor = (allDays.find((d) => d.date >= today) || {}).date;
  // เวรวันถัดไปหลังการ์ดเด่น (แสดงท้ายการ์ด)
  const nextDay = anchor ? allDays.find((d) => d.date > anchor) : null;
  const nextInfo = nextDay
    ? { date: nextDay.date, names: roles.flatMap((r) => (nextDay.byRole[r] || []).flatMap((e) => e.people.members.map(nickOf))).join(' / ') }
    : null;
  return (
    <div className="space-y-5">
      {weeks.map((w) => (
        <section key={w.key}>
          <p className="mb-2 px-1 text-[13px] font-bold text-navy-800">{w.label}</p>
          <div className="space-y-2.5">
            {w.days.map((day) => {
              const d = parseISODate(day.date);
              const isToday = day.date === today;
              if (day.date === anchor) {
                // วันนี้ (หรือวันเวรถัดไป) แสดงเป็นการ์ดเด่น แบบเดียวกับวิชาที่กำลังเรียน
                return (
                  <div key={day.date} data-duty-anchor="true">
                    <DutyHero
                      date={day.date}
                      today={today}
                      groups={roles.map((r) => ({ role: r, entries: day.byRole[r] || [] }))}
                      marks={marks}
                      mineId={mineId}
                      onOpen={onOpen}
                      onEdit={onEdit}
                      next={nextInfo}
                    />
                  </div>
                );
              }
              return (
                <article
                  key={day.date}
                  className={cx('glass rounded-3xl p-3', isToday && 'ring-2 ring-gold-400', day.date < today && 'opacity-55')}
                >
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-center leading-none', isToday ? 'btn-gold text-white' : 'bg-navy-500/10 text-navy-800')}>
                      <span>
                        <span className="block text-[17px] font-bold tabular-nums">{d.getDate()}</span>
                        <span className="block text-[10px]">{MONTHS[d.getMonth()]}</span>
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-tight text-navy-900">วัน{FULL_WEEKDAYS[d.getDay()]}</span>
                      <span className="block text-[12px] text-slate-500">{d.getDate()} {MONTHS[d.getMonth()]} {beYear(day.date)}</span>
                    </span>
                    {isToday && <span className="shrink-0 rounded-full bg-gold-400 px-2.5 py-0.5 text-[12px] font-bold text-navy-950">วันนี้</span>}
                  </div>
                  <div className={cx('grid gap-2', roles.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {roles.map((r) => (
                      <RoleCard key={r} role={r} entries={day.byRole[r]} mineId={mineId} onOpen={onOpen} onEdit={onEdit} marks={marks} />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function DutyPage({ switcher }) {
  const { data, status, memberById, isAdmin } = useStore();
  const ui = useUI();
  const today = toISODate(useNow(60000));
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [swapForm, setSwapForm] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mineId, setMineId] = usePersistentState('bts61:duty-me', '');
  const mine = mineId ? memberById.get(mineId) : null;

  const entries = useMemo(
    () =>
      data.duty
        .filter((item) => item.duty_date)
        .map((item) => {
          const people = resolveDuty(item, memberById, data.members);
          const text = normalize(
            [item.shift_or_role, item.note, item.member_names, ...people.members.flatMap((m) => [m.first_name, m.last_name, m.nickname]), ...people.extras].join(' '),
          );
          return { item, people, text, role: item.shift_or_role || 'เวร' };
        })
        .sort((a, b) => a.item.duty_date.localeCompare(b.item.duty_date) || thCompare(a.role, b.role)),
    [data.duty, data.members, memberById],
  );

  // วันเริ่มหลักสูตร (ใช้นับสัปดาห์ที่) = วันจันทร์ของวันแรกสุดในตารางสอน/ตารางเวร
  const courseMonday = useMemo(() => {
    const first = [...data.classes.map((c) => c.class_date), ...data.duty.map((d) => d.duty_date)].filter(Boolean).sort()[0];
    return first ? mondayOf(first) : '';
  }, [data.classes, data.duty]);

  const tokens = useMemo(() => queryTokens(query), [query]);
  const visible = entries.filter(
    (e) => (!mine || e.people.members.some((m) => m.id === mine.id)) && tokens.every((t) => e.text.includes(t)),
  );
  // เริ่มที่เวรวันนี้ (หรือวันเวรถัดไป) เสมอ — วันที่ผ่านมาแล้วซ่อนไว้ กด "ดูวันที่ผ่านมา" เพื่อดูทั้งหมด
  const [showPast, setShowPast] = useState(false);
  const hasUpcoming = visible.some((e) => e.item.duty_date >= today);
  const shown = showPast || !hasUpcoming ? visible : visible.filter((e) => e.item.duty_date >= today);
  const pastDays = new Set(visible.filter((e) => e.item.duty_date < today).map((e) => e.item.duty_date)).size;
  useEffect(() => {
    // เปิดดูวันที่ผ่านมาแล้ว ให้แถววันนี้ยังอยู่บนสุดของจอ (ใต้แถบค้นหา) — เลื่อนขึ้นเองเพื่อดูวันก่อนหน้า
    if (!showPast) return;
    const row = document.querySelector('[data-duty-anchor]');
    if (row) window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 150);
  }, [showPast]);

  const roles = useMemo(() => {
    const found = [...new Set(entries.map((e) => e.role))];
    return [...ROLE_ORDER.filter((r) => found.includes(r)), ...found.filter((r) => !ROLE_ORDER.includes(r))];
  }, [entries]);

  const weeks = useMemo(() => {
    const byDate = new Map();
    shown.forEach((e) => {
      if (!byDate.has(e.item.duty_date)) byDate.set(e.item.duty_date, { date: e.item.duty_date, byRole: {} });
      const day = byDate.get(e.item.duty_date);
      (day.byRole[e.role] = day.byRole[e.role] || []).push(e);
    });
    const out = new Map();
    [...byDate.values()].forEach((day) => {
      const mon = mondayOf(day.date);
      if (!out.has(mon)) {
        const no = courseMonday ? Math.floor(daysBetween(courseMonday, mon) / 7) + 1 : 0;
        const fri = addDays(mon, 4);
        out.set(mon, {
          key: mon,
          label: `${no > 0 ? `สัปดาห์ที่ ${no} · ` : ''}${shortDate(mon)} – ${shortDate(fri)} ${beYear(fri)}`,
          days: [],
        });
      }
      out.get(mon).days.push(day);
    });
    return [...out.values()];
  }, [shown, courseMonday]);

  const marks = useMemo(() => swapMarks(data.swaps), [data.swaps]);
  const pendingSwaps = (data.swaps || []).filter((x) => x.status === 'pending').length;
  const openSwapForm = (item) => {
    let prefill = item;
    if (!prefill && mine) {
      const slot = entries.find((e) => e.item.duty_date >= today && e.people.members.some((m) => m.id === mine.id));
      if (slot) prefill = { from_duty_id: slot.item.id, from_member_id: mine.id };
    }
    setHistoryOpen(false);
    setSwapForm({ key: Date.now(), item: prefill || null });
  };
  const suggestions = useMemo(
    () => (focused && query.trim() ? guessMembers(data.members, query, 5) : []),
    [focused, query, data.members],
  );
  const nextMine = mine ? visible.find((e) => e.item.duty_date >= today) : null;
  const loading = status === 'loading';

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader
        title="ตาราง"
        right={
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Button size="sm" icon={Plus} onClick={() => ui.openDutyForm(null)} className="shrink-0">
                เพิ่มเวร
              </Button>
            )}
            <MoreMenuButton />
          </div>
        }
      >
        {switcher}
      </PageHeader>

      {/* ค้นหาเวรของตัวเอง: พิมพ์ชื่อแล้วแตะเลือก ระบบจะจำไว้ในเครื่องนี้ */}
      <TopBarSentinel />
      <div className="topbar sticky-glass sticky top-0 z-20 -mx-4 px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="ค้นหาเวรของฉัน — พิมพ์ชื่อหรือชื่อเล่น"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="ค้นหาเวร"
            className="glass h-12 w-full rounded-2xl pl-11 pr-10 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:ring-4 focus:ring-navy-500/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setQuery('')}
              aria-label="ล้างคำค้น"
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          )}
          <MemberSuggest
            items={suggestions}
            title="แตะเพื่อดูเฉพาะเวรของคนนี้"
            onPick={(m) => {
              setMineId(m.id);
              setQuery('');
              document.activeElement && document.activeElement.blur();
            }}
          />
        </div>
      </div>

      {mine && (
        <div className="glass mb-1 mt-1 flex items-center gap-3 rounded-2xl p-2.5 ring-1 ring-inset ring-gold-300">
          <Photo member={mine} width={96} className="h-11 w-11 shrink-0 rounded-full" textClass="text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">เวรของ {nickOf(mine)} <span className="font-normal text-slate-500">· {fullName(mine)}</span></p>
            <p className="truncate text-[13px] text-gold-700">
              {nextMine ? `เวรถัดไป: ${relativeDay(nextMine.item.duty_date, today)} — ${nextMine.role}` : 'ยังไม่มีเวรที่กำลังจะถึง'}
            </p>
          </div>
          <button type="button" onClick={() => setMineId('')} className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-navy-700 hover:bg-white/70">
            ดูทั้งหมด
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-10 w-56 rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      ) : !entries.length ? (
        <EmptyState icon={ShieldCheck} title="ยังไม่มีตารางเวรในระบบ" description="ผู้ดูแลระบบเพิ่มตารางเวรได้จากเมนู ตั้งค่า/แอดมิน" />
      ) : (
        <>
          {/* ขอสลับเวร / ประวัติการสลับเวร */}
          <div className="mb-2.5 mt-2 flex items-center gap-2">
            <Button size="sm" variant="soft" icon={ArrowLeftRight} onClick={() => openSwapForm(null)}>
              ขอสลับเวร
            </Button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="relative inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-navy-700 hover:bg-white/60"
            >
              <History className="h-4 w-4" /> ประวัติการสลับ
              {pendingSwaps > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold tabular-nums text-navy-950" title="คำขอที่รออนุมัติ">
                  {pendingSwaps}
                </span>
              )}
            </button>
          </div>

          {hasUpcoming && pastDays > 0 && (
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              aria-expanded={showPast}
              className="mb-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-white/50 text-[13px] font-semibold text-navy-700 ring-1 ring-inset ring-white/70 transition active:scale-[0.99]"
            >
              <ChevronUp className={cx('h-4 w-4 transition-transform', !showPast && 'rotate-180')} />
              {showPast ? 'ซ่อนวันที่ผ่านมา · เริ่มที่วันนี้' : `ดูทั้งหมด (รวมวันที่ผ่านมา ${pastDays} วัน)`}
            </button>
          )}

          {weeks.length === 0 ? (
            <EmptyState
              icon={mine || query ? UserRoundSearch : CalendarClock}
              title="ไม่พบรายการเวร"
              description={mine || query ? 'ลองล้างคำค้น หรือกด "ดูทั้งหมด" เพื่อดูเวรของทุกคน' : undefined}
            />
          ) : (
            <DutyTable
              weeks={weeks}
              roles={roles}
              today={today}
              mineId={mine && mine.id}
              onOpen={ui.openProfile}
              onEdit={isAdmin ? ui.openDutyForm : null}
              marks={marks}
            />
          )}
          <p className="mt-4 px-2 text-center text-xs leading-relaxed text-slate-400">
            แตะชื่อเพื่อดูเบอร์โทร · หากลาหรือติดภารกิจในวันเวร ให้ขอสลับเวรกับเพื่อน แล้วรอแอดมินอนุมัติ
          </p>
          <p className="mt-2 flex items-center justify-center gap-3 text-[11.5px] text-slate-400">
            <span className="inline-flex items-center gap-1"><SwapDot mark="pending" /> รออนุมัติสลับ</span>
            <span className="inline-flex items-center gap-1"><SwapDot mark="swapped" /> สลับเวรแล้ว</span>
          </p>
        </>
      )}

      <SwapForm state={swapForm} onClose={() => setSwapForm(null)} />
      {historyOpen && <SwapHistory open onClose={() => setHistoryOpen(false)} onEdit={(item) => openSwapForm(item)} />}
    </div>
  );
}
