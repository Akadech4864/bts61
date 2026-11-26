import { useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Search, ShieldCheck, UserRoundSearch, X } from 'lucide-react';
import MoreMenuButton from '../components/MoreMenu';
import { Photo } from '../components/Avatar';
import { Button, EmptyState, PageHeader, Segmented, Skeleton, TopBarSentinel } from '../components/ui';
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

/** ผู้เข้าเวร: รูปหน้าตรง + ชื่อเล่น + ชื่อ-สกุล + ลำดับที่ แตะเพื่อเปิดข้อมูลในทำเนียบรุ่น */
function DutyPerson({ member, highlight, onOpen }) {
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
        <Photo member={member} width={160} className="h-14 w-14 rounded-full object-[center_20%] ring-2 ring-white shadow-sm" textClass="text-base" />
        {member.seq && (
          <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-navy-900 px-1 text-[10px] font-bold tabular-nums leading-none text-white ring-2 ring-white">
            {member.seq}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-bold leading-tight text-navy-900">{nickOf(member)}</span>
        <span className="mt-0.5 block truncate text-[13px] leading-tight text-slate-700">{member.first_name}</span>
        {member.last_name && <span className="block truncate text-[12px] leading-tight text-slate-500">{member.last_name}</span>}
      </span>
    </button>
  );
}

function DutyCell({ entries, mineId, onOpen, onEdit }) {
  if (!entries || !entries.length) return <span className="block px-1 text-center text-slate-300">—</span>;
  return (
    <div className="space-y-1.5">
      {entries.map(({ item, people }) => {
        const nobody = !people.members.length && !people.extras.length;
        return (
          <div key={item.id} className="relative">
            {people.members.map((m) => (
              <DutyPerson key={m.id} member={m} highlight={m.id === mineId} onOpen={onOpen} />
            ))}
            {people.extras.map((name) => (
              <p key={name} className="px-1 text-[14px] font-medium leading-snug text-slate-700">{name}</p>
            ))}
            {item.note && (
              <p className={cx('px-1 leading-snug', nobody ? 'py-1 text-[13px] text-slate-600' : 'mt-1 text-[12px] text-gold-700')}>{item.note}</p>
            )}
            {nobody && !item.note && <p className="px-1 py-1 text-[13px] text-slate-400">ยังไม่ระบุ</p>}
            {onEdit && (
              // ปุ่มแก้ไขเห็นเฉพาะแอดมิน — วางมุมขวาบนแบบเล็ก ไม่กินพื้นที่ชื่อ
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label="แก้ไขรายการนี้ (แอดมิน)"
                title="แก้ไข (เฉพาะแอดมิน)"
                className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-white/80 text-slate-400 shadow-sm ring-1 ring-white hover:text-navy-800"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** ตารางเวรรายสัปดาห์: 1 แถว = 1 วัน, 1 คอลัมน์ = 1 หน้าที่ */
function DutyTable({ weeks, roles, today, mineId, onOpen, onEdit }) {
  const dateCol = 62;
  return (
    <div className="glass overflow-x-auto rounded-3xl">
      <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: dateCol + roles.length * 140 }}>
        <colgroup>
          <col style={{ width: dateCol }} />
          {roles.map((r) => <col key={r} />)}
        </colgroup>
        <thead className="bg-white/55 text-[12px] text-slate-500">
          <tr>
            <th scope="col" className="px-2 py-2.5 text-center font-semibold">วันที่</th>
            {roles.map((r) => (
              <th key={r} scope="col" className="px-2.5 py-2.5 text-[13px] font-bold text-navy-800">{r}</th>
            ))}
          </tr>
        </thead>
        {weeks.map((w) => (
          <tbody key={w.key} className="divide-y divide-white/70">
            <tr>
              <td colSpan={roles.length + 1} className="bg-navy-500/[0.07] px-3 py-1.5 text-[12px] font-semibold text-navy-800">
                {w.label}
              </td>
            </tr>
            {w.days.map((day) => {
              const d = parseISODate(day.date);
              const isToday = day.date === today;
              return (
                <tr key={day.date} className={cx(isToday ? 'bg-gold-300/25' : '', day.date < today && 'opacity-55')}>
                  <td className="px-1 py-3 text-center align-middle">
                    <p className="text-[12px] font-semibold leading-none text-slate-500">{WEEKDAYS[d.getDay()]}</p>
                    <p className="mt-1 text-[26px] font-bold leading-none text-navy-900 tabular-nums">{d.getDate()}</p>
                    <p className="mt-1 text-[11px] leading-none text-slate-500">{MONTHS[d.getMonth()]}</p>
                    {isToday && <span className="mt-1.5 inline-block rounded-full bg-gold-400 px-2 text-[10px] font-bold leading-5 text-navy-950">วันนี้</span>}
                  </td>
                  {roles.map((r) => (
                    <td key={r} className="px-2 py-2.5 align-middle">
                      <DutyCell entries={day.byRole[r]} mineId={mineId} onOpen={onOpen} onEdit={onEdit} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export default function DutyPage({ switcher }) {
  const { data, status, memberById, isAdmin } = useStore();
  const ui = useUI();
  const today = toISODate(useNow(60000));
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [range, setRange] = useState('upcoming'); // upcoming = ตั้งแต่วันนี้ | all = ทั้งหมด
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
  const shown = range === 'upcoming' ? visible.filter((e) => e.item.duty_date >= today) : visible;

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

  const dayCount = (list) => new Set(list.map((e) => e.item.duty_date)).size;
  const upcomingDays = dayCount(visible.filter((e) => e.item.duty_date >= today));
  const allDays = dayCount(visible);
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
          <div className="mb-2.5 mt-2 flex items-center justify-between gap-3">
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: 'upcoming', label: 'ที่จะถึง', title: `ตั้งแต่วันนี้ ${upcomingDays} วัน` },
                { value: 'all', label: 'ทั้งหมด', title: `ทั้งหมด ${allDays} วัน` },
              ]}
            />
          </div>

          {weeks.length === 0 ? (
            <EmptyState
              icon={mine || query ? UserRoundSearch : CalendarClock}
              title={range === 'upcoming' ? 'ไม่มีเวรที่กำลังจะถึง' : 'ไม่พบรายการเวร'}
              description={mine || query ? 'ลองล้างคำค้น หรือกด "ดูทั้งหมด" เพื่อดูเวรของทุกคน' : undefined}
              action={range === 'upcoming' && allDays > 0 ? (
                <Button variant="soft" size="sm" onClick={() => setRange('all')}>ดูรายการย้อนหลัง</Button>
              ) : null}
            />
          ) : (
            <DutyTable
              weeks={weeks}
              roles={roles}
              today={today}
              mineId={mine && mine.id}
              onOpen={ui.openProfile}
              onEdit={isAdmin ? ui.openDutyForm : null}
            />
          )}
          <p className="mt-4 px-2 text-center text-xs leading-relaxed text-slate-400">
            แตะชื่อเพื่อดูเบอร์โทร · หากลาหรือติดภารกิจในวันเวร ให้เปลี่ยนเวรให้เรียบร้อย
          </p>
        </>
      )}
    </div>
  );
}
