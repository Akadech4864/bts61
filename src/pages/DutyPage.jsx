import { useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Search, ShieldCheck, StickyNote, UserRoundSearch, X } from 'lucide-react';
import { Photo } from '../components/Avatar';
import { Button, EmptyState, PageHeader, Segmented, Skeleton, TopBarSentinel } from '../components/ui';
import MemberSuggest from '../components/MemberSuggest';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import {
  cx, formatDate, fullName, guessMembers, nickOf, normalize, parseISODate, queryTokens, relativeDay, resolveDuty,
  thCompare, toISODate, useNow, usePersistentState,
} from '../lib/utils';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/** ชิปผู้เข้าเวร: รูปหน้าตรง + ชื่อเล่น แตะเพื่อเปิดข้อมูลในทำเนียบรุ่น */
function PersonChip({ member, highlight, dark, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(member.id)}
      className={cx(
        'inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left transition active:scale-95',
        dark
          ? highlight ? 'bg-gold-400 text-navy-950' : 'bg-white/10 text-white ring-1 ring-inset ring-white/15'
          : highlight ? 'bg-gold-300/40 text-navy-900 ring-1 ring-inset ring-gold-400' : 'bg-white/70 text-navy-900 ring-1 ring-inset ring-white',
      )}
    >
      <Photo member={member} width={96} className="h-9 w-9 shrink-0 rounded-full" textClass="text-sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{nickOf(member)}</span>
        <span className={cx('block truncate text-[11px] leading-tight', dark ? (highlight ? 'text-navy-900/70' : 'text-white/60') : 'text-slate-500')}>
          {member.nickname ? member.first_name : member.last_name}
        </span>
      </span>
    </button>
  );
}

function People({ people, mineId, dark, onOpen }) {
  if (!people.members.length && !people.extras.length) {
    return <p className={cx('text-[13px]', dark ? 'text-white/50' : 'text-slate-400')}>ยังไม่ระบุผู้เข้าเวร</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {people.members.map((m) => (
        <PersonChip key={m.id} member={m} highlight={m.id === mineId} dark={dark} onOpen={onOpen} />
      ))}
      {people.extras.map((name) => (
        <span key={name} className={cx('inline-flex h-11 items-center rounded-full px-3.5 text-sm font-medium', dark ? 'bg-white/10 text-white' : 'bg-white/70 text-slate-700')}>
          {name}
        </span>
      ))}
    </div>
  );
}

function DutyCard({ entry, mineId, today, onOpen, onEdit }) {
  const { item, people } = entry;
  const d = parseISODate(item.duty_date);
  const past = item.duty_date < today;
  return (
    <article className={cx('glass relative flex gap-3 rounded-3xl p-4', past && 'opacity-70')}>
      <div className="grid h-[60px] w-[52px] shrink-0 place-items-center rounded-2xl bg-navy-500/10 text-navy-900 ring-1 ring-inset ring-white/70">
        <div className="text-center leading-none">
          <p className="text-[10px] font-medium text-navy-500">{d ? WEEKDAYS[d.getDay()] : ''}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{d ? d.getDate() : '–'}</p>
          <p className="mt-0.5 text-[10px] font-medium text-navy-500">{d ? MONTHS[d.getMonth()] : ''}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gold-600">{relativeDay(item.duty_date, today)}</p>
        <h3 className="pr-8 text-[15px] font-semibold leading-snug text-navy-900">{item.shift_or_role || 'เวร'}</h3>
        <div className="mt-2.5">
          <People people={people} mineId={mineId} onOpen={onOpen} />
        </div>
        {item.note && (
          <p className="mt-2.5 flex items-start gap-2 text-[13px] text-gold-700">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{item.note}</span>
          </p>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="แก้ไขรายการนี้"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/70 hover:text-navy-800"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}

/** การ์ดเด่น "เวรวันนี้" อยู่บนสุดเสมอ */
function TodayCard({ entries, today, mine, isAdmin, onOpen, onEdit }) {
  return (
    <section className="glass-dark rounded-3xl p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gold-400/10" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-semibold text-navy-950">
            <ShieldCheck className="h-3.5 w-3.5" /> เวรวันนี้
          </span>
          <p className="mt-2 text-[15px] font-medium text-white/85">{formatDate(today, 'long')}</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 text-[15px] text-white/60">{mine ? `วันนี้ ${nickOf(mine)} ไม่มีเวร` : 'วันนี้ยังไม่มีรายการเวรในระบบ'}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {entries.map(({ item, people }) => (
            <div key={item.id} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-[16px] font-semibold leading-snug">{item.shift_or_role || 'เวร'}</h3>
                {isAdmin && (
                  <button type="button" onClick={() => onEdit(item)} aria-label="แก้ไขรายการนี้" className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <People people={people} mineId={mine && mine.id} dark onOpen={onOpen} />
              {item.note && <p className="mt-2 text-[13px] text-gold-200">หมายเหตุ: {item.note}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DutyPage() {
  const { data, status, memberById, isAdmin } = useStore();
  const ui = useUI();
  const today = toISODate(useNow(60000));
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [mineId, setMineId] = usePersistentState('bts61:duty-me', '');
  const mine = mineId ? memberById.get(mineId) : null;

  const entries = useMemo(
    () =>
      data.duty
        .map((item) => {
          const people = resolveDuty(item, memberById, data.members);
          const text = normalize(
            [item.shift_or_role, item.note, item.member_names, ...people.members.flatMap((m) => [m.first_name, m.last_name, m.nickname]), ...people.extras].join(' '),
          );
          return { item, people, text };
        })
        .sort((a, b) => (a.item.duty_date || '').localeCompare(b.item.duty_date || '') || thCompare(a.item.shift_or_role, b.item.shift_or_role)),
    [data.duty, data.members, memberById],
  );

  const tokens = useMemo(() => queryTokens(query), [query]);
  const visible = entries.filter(
    (e) => (!mine || e.people.members.some((m) => m.id === mine.id)) && tokens.every((t) => e.text.includes(t)),
  );
  const todays = visible.filter((e) => e.item.duty_date === today);
  const upcoming = visible.filter((e) => e.item.duty_date > today);
  const past = visible.filter((e) => e.item.duty_date < today).reverse();
  const list = tab === 'upcoming' ? upcoming : past;
  const suggestions = useMemo(
    () => (focused && query.trim() ? guessMembers(data.members, query, 5) : []),
    [focused, query, data.members],
  );
  const nextMine = mine ? [...todays, ...upcoming][0] : null;
  const loading = status === 'loading';

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader
        eyebrow="Duty Roster"
        title="ตารางเวร"
        right={
          isAdmin ? (
            <Button size="sm" icon={Plus} onClick={() => ui.openDutyForm(null)} className="shrink-0">
              เพิ่มเวร
            </Button>
          ) : null
        }
      />

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
        <div className="glass mb-3 mt-1 flex items-center gap-3 rounded-2xl p-2.5 ring-1 ring-inset ring-gold-300">
          <Photo member={mine} width={96} className="h-11 w-11 shrink-0 rounded-full" textClass="text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">เวรของ {nickOf(mine)} <span className="font-normal text-slate-500">· {fullName(mine)}</span></p>
            <p className="truncate text-[13px] text-gold-700">
              {nextMine
                ? `เวรถัดไป: ${relativeDay(nextMine.item.duty_date, today)} — ${nextMine.item.shift_or_role || 'เวร'}`
                : 'ยังไม่มีเวรที่กำลังจะถึง'}
            </p>
          </div>
          <button type="button" onClick={() => setMineId('')} className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-navy-700 hover:bg-white/70">
            ดูทั้งหมด
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-2 space-y-3">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          <div className="mt-2">
            <TodayCard entries={todays} today={today} mine={mine} isAdmin={isAdmin} onOpen={ui.openProfile} onEdit={ui.openDutyForm} />
          </div>

          <div className="mb-3 mt-5 flex items-center justify-between gap-3">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'upcoming', label: `กำลังจะถึง (${upcoming.length})` },
                { value: 'past', label: `ย้อนหลัง (${past.length})` },
              ]}
            />
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={entries.length ? (mine || query ? UserRoundSearch : CalendarClock) : ShieldCheck}
              title={
                !entries.length ? 'ยังไม่มีตารางเวรในระบบ'
                  : tab === 'upcoming' ? 'ไม่มีเวรที่กำลังจะถึง' : 'ไม่มีรายการย้อนหลัง'
              }
              description={
                !entries.length ? 'ผู้ดูแลระบบเพิ่มตารางเวรได้จากเมนู ตั้งค่า/แอดมิน'
                  : mine || query ? 'ลองล้างคำค้น หรือกด "ดูทั้งหมด" เพื่อดูเวรของทุกคน' : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {list.map((entry) => (
                <DutyCard
                  key={entry.item.id}
                  entry={entry}
                  mineId={mine && mine.id}
                  today={today}
                  onOpen={ui.openProfile}
                  onEdit={isAdmin ? () => ui.openDutyForm(entry.item) : null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
