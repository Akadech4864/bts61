import { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, BookOpen, CalendarDays, CalendarSearch, ChevronRight, Clock, MapPin, Pencil, Plus, StickyNote, UserRound } from 'lucide-react';
import { subjectKey } from '../lib/docs';
import MoreMenuButton from '../components/MoreMenu';
import { Photo } from '../components/Avatar';
import InstructorSheet from '../components/InstructorSheet';
import { Button, EmptyState, PageHeader, Skeleton, TopBarSentinel } from '../components/ui';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import {
  addDays, classStatus, compareClass, cx, daysBetween, formatDate, parseISODate, relativeDay, timeRange, toISODate, useNow,
} from '../lib/utils';
import { buildPeopleIndex, faceOf, kindTone } from '../lib/course';

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** วันที่ในแถบเลือกวัน: ต่อเนื่องตลอดช่วงหลักสูตร (ถ้าช่วงยาวเกินไปจะแสดงเฉพาะวันที่มีเรียน) */
function buildStrip(classes, today, selected) {
  const withClass = new Set(classes.map((c) => c.class_date).filter(Boolean));
  const all = [...new Set([...withClass, today, selected])].sort();
  const first = all[0];
  const last = all[all.length - 1];
  let days;
  if (withClass.size === 0) {
    days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 3));
    if (!days.includes(selected)) days = [...days, selected].sort();
  } else if (daysBetween(first, last) <= 160) {
    days = Array.from({ length: daysBetween(first, last) + 1 }, (_, i) => addDays(first, i));
  } else {
    days = all;
  }
  return days.map((iso) => ({ iso, has: withClass.has(iso) }));
}

function DateStrip({ days, selected, today, onSelect }) {
  const scroller = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    const box = scroller.current;
    const el = activeRef.current;
    if (!box || !el) return;
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [selected, days.length]);

  return (
    <div ref={scroller} className="no-scrollbar relative -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 pt-1">
      {days.map(({ iso, has }, i) => {
        const d = parseISODate(iso);
        const active = iso === selected;
        const isToday = iso === today;
        const showMonth = i === 0 || d.getDate() === 1 || days[i - 1].iso.slice(0, 7) !== iso.slice(0, 7);
        return (
          <button
            key={iso}
            ref={active ? activeRef : null}
            type="button"
            onClick={() => onSelect(iso)}
            aria-pressed={active}
            aria-label={formatDate(iso, 'long')}
            className={cx(
              'relative flex h-[76px] w-[54px] shrink-0 flex-col items-center justify-center rounded-2xl transition active:scale-95',
              active
                ? 'btn-navy text-white'
                : isToday
                  ? 'glass text-navy-900 ring-2 ring-inset ring-gold-400'
                  : 'glass text-slate-700',
              !has && !active && !isToday && 'opacity-55',
            )}
          >
            <span className={cx('text-[10px] font-medium leading-none', active ? 'text-white/70' : isToday ? 'text-gold-600' : 'text-slate-400')}>
              {isToday ? 'วันนี้' : showMonth ? MONTHS[d.getMonth()] : WEEKDAYS[d.getDay()]}
            </span>
            <span className="mt-1 text-xl font-bold leading-none tabular-nums">{d.getDate()}</span>
            <span className={cx('mt-1 text-[10px] leading-none', active ? 'text-white/70' : 'text-slate-400')}>
              {isToday || showMonth ? WEEKDAYS[d.getDay()] : MONTHS[d.getMonth()]}
            </span>
            <span className={cx('absolute bottom-1.5 h-1 w-1 rounded-full', has ? (active ? 'bg-gold-300' : 'bg-gold-500') : 'bg-transparent')} />
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, isNext }) {
  if (status === 'now') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
        <span className="pulse-dot" /> กำลังเรียน
      </span>
    );
  }
  if (isNext) {
    return <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[11px] font-semibold text-gold-700">วิชาถัดไป</span>;
  }
  if (status === 'past') {
    return <span className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-slate-500">เรียนจบแล้ว</span>;
  }
  return null;
}

/** รูปหน้าอาจารย์/ผู้บริหาร (ถ้าจับคู่ชื่อได้) หรือไอคอนแทน */
function Face({ match, className, dark = false }) {
  if (match) return <Photo member={faceOf(match.rec)} width={160} className={cx('shrink-0 rounded-full object-[center_20%]', className)} textClass="text-xs" />;
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full', dark ? 'bg-white/10 text-white/60' : 'bg-slate-500/10 text-slate-400', className)}>
      <UserRound className="h-1/2 w-1/2" />
    </span>
  );
}

/** แถวผู้บรรยาย / เลขาฯวิชา พร้อมรูป — แตะเพื่อดูข้อมูลอาจารย์ */
function PersonRow({ name, label, match, onOpen, small = false }) {
  if (!name) return null;
  const body = (
    <>
      <Face match={match} className={small ? 'h-7 w-7' : 'h-10 w-10'} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] leading-tight text-slate-400">{label}</span>
        <span className={cx('block leading-snug', small ? 'text-[13px] text-slate-600' : 'text-[14px] font-semibold text-navy-900')}>{name}</span>
      </span>
      {match && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
    </>
  );
  if (!match) return <div className="flex items-center gap-2.5">{body}</div>;
  return (
    <button type="button" onClick={() => onOpen(match)} className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2.5 rounded-2xl px-1 py-0.5 text-left transition hover:bg-white/60 active:scale-[0.99]">
      {body}
    </button>
  );
}

function ClassCard({ item, status, isNext, onEdit, findPerson, onPerson, mainRoom, docCount = 0, onDocs }) {
  const minor = !item.speaker && !item.secretary && !item.topic && !item.kind && !item.session;
  const room = item.location && item.location !== mainRoom ? item.location : '';
  return (
    <article
      className={cx(
        'glass relative flex gap-3 transition',
        minor ? 'rounded-2xl px-4 py-2.5' : 'rounded-3xl p-4',
        status === 'now' ? 'ring-2 ring-emerald-500/70' : isNext ? 'ring-2 ring-gold-300' : '',
        status === 'past' && 'opacity-60',
      )}
    >
      <div className="w-[58px] shrink-0 text-center">
        <p className={cx('font-bold leading-tight tabular-nums', minor ? 'text-[14px] text-slate-600' : 'text-[17px] text-navy-900')}>{item.start_time || 'ทั้งวัน'}</p>
        {item.end_time && !minor && (
          <>
            <div className="mx-auto my-1 h-3 w-px bg-slate-300" />
            <p className="text-sm font-medium leading-tight text-slate-500 tabular-nums">{item.end_time}</p>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1 border-l border-slate-100 pl-3">
        <div className={cx('flex flex-wrap items-center gap-1.5 pr-8', minor ? (status === 'now' || isNext ? 'mb-1' : 'hidden') : 'mb-1.5 min-h-6')}>
          <StatusBadge status={status} isNext={isNext} />
          {item.kind && <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', kindTone(item.kind))}>{item.kind}</span>}
          {item.session && <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium text-slate-500">ครั้งที่ {item.session}</span>}
          {docCount > 0 && (
            <button
              type="button"
              onClick={onDocs}
              title="เอกสารประกอบการสอนของวิชานี้"
              className="inline-flex items-center gap-1 rounded-full bg-navy-500/10 px-2 py-0.5 text-[11px] font-semibold text-navy-700 transition active:scale-95"
            >
              <Paperclip className="h-3 w-3" /> เอกสาร {docCount}
            </button>
          )}
        </div>
        <h3 className={cx('leading-snug', minor ? 'text-[14.5px] font-medium text-slate-700' : 'text-[16px] font-semibold text-navy-900')}>
          {item.subject}
          {minor && item.end_time && <span className="ml-1.5 text-[12.5px] font-normal tabular-nums text-slate-400">ถึง {item.end_time}</span>}
        </h3>
        {item.topic && <p className="mt-0.5 text-[14px] leading-snug text-slate-700">{item.topic}</p>}
        {(item.speaker || item.secretary) && (
          <div className="mt-2.5 space-y-1.5">
            <PersonRow name={item.speaker} label="อาจารย์ผู้บรรยาย" match={findPerson(item.speaker)} onOpen={onPerson} />
            <PersonRow name={item.secretary} label="เลขาฯวิชา" match={findPerson(item.secretary)} onOpen={onPerson} small />
          </div>
        )}
        <div className={cx('space-y-1 text-[13px] text-slate-600', (room || item.note) && 'mt-2')}>
          {room && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> <span>{room}</span>
            </p>
          )}
          {item.note && (
            <p className="flex items-start gap-2 text-gold-700">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{item.note}</span>
            </p>
          )}
        </div>
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

/** การ์ดเด่นด้านบน: วิชาที่กำลังเรียนอยู่ หรือวิชาถัดไป */
function HeroCard({ item, live, today, onJump, findPerson }) {
  return (
    <button
      type="button"
      onClick={onJump}
      className="glass-dark block w-full rounded-3xl p-5 text-left transition active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10" />
      <div className="flex items-center justify-between gap-2">
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', live ? 'bg-emerald-500 text-white' : 'bg-gold-400 text-navy-950')}>
          {live ? <><span className="pulse-dot" /> กำลังเรียนอยู่ตอนนี้</> : 'วิชาถัดไป'}
        </span>
        <ChevronRight className="h-5 w-5 text-white/50" />
      </div>
      <h2 className="mt-3 text-xl font-bold leading-snug">{item.subject}</h2>
      {item.topic && <p className="mt-1 text-[14px] leading-snug text-white/85">{item.topic}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-white/80">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {live ? timeRange(item.start_time, item.end_time) : `${relativeDay(item.class_date, today)} · ${timeRange(item.start_time, item.end_time)}`}
        </span>
        {item.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {item.location}
          </span>
        )}
      </div>
      {item.speaker && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 pt-3">
          <Face match={findPerson(item.speaker)} className="h-10 w-10 ring-2 ring-white/20" dark />
          <span className="min-w-0">
            <span className="block text-[11px] text-white/60">อาจารย์ผู้บรรยาย</span>
            <span className="block text-[14px] font-semibold leading-snug">{item.speaker}</span>
          </span>
        </div>
      )}
    </button>
  );
}

export default function ClassPage({ switcher }) {
  const { data, status, isAdmin } = useStore();
  const ui = useUI();
  const now = useNow(30000);
  const today = toISODate(now);
  // เปิดจากหน้าอื่นพร้อมวันที่ (เช่น แตะวันที่ของวิชาในหน้าอาจารย์/เอกสาร)
  const [selected, setSelected] = useState(() => (ui.view && ui.view.date) || today);

  const classes = useMemo(() => [...data.classes].sort(compareClass), [data.classes]);
  const findPerson = useMemo(() => buildPeopleIndex(data.instructors, data.staff), [data.instructors, data.staff]);
  const [sheetIns, setSheetIns] = useState(null);
  const onPerson = (match) => (match.type === 'instructor' ? setSheetIns(match.rec) : ui.go('course', { tab: 'info' }));
  const statusOf = useMemo(() => new Map(classes.map((c) => [c.id, classStatus(c, now)])), [classes, now]);
  const live = classes.find((c) => statusOf.get(c.id) === 'now');
  const next = classes.find((c) => statusOf.get(c.id) === 'upcoming');
  const hero = live || next;

  const days = useMemo(() => buildStrip(classes, today, selected), [classes, today, selected]);
  const dayClasses = classes.filter((c) => c.class_date === selected);
  const mainRoom = useMemo(() => {
    const count = new Map();
    classes.forEach((c) => c.location && count.set(c.location, (count.get(c.location) || 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }, [classes]);
  const dayInMainRoom = dayClasses.some((c) => c.location === mainRoom);
  // จำนวนเอกสารประกอบการสอนของแต่ละวิชา (เมนูหลักสูตร > วิชา)
  const docCounts = useMemo(() => {
    const out = {};
    (data.resources || []).forEach((r) => { if (r.type === 'link' || !r.type) { const k = subjectKey(r.subject); out[k] = (out[k] || 0) + 1; } });
    return out;
  }, [data.resources]);
  const loading = status === 'loading';

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader
        title="ตาราง"
        right={
          <div className="flex shrink-0 items-center gap-2">
            {selected !== today && (
              <button type="button" onClick={() => setSelected(today)} className="btn-gold h-10 rounded-full px-3.5 text-sm font-semibold text-white transition active:scale-95">
                วันนี้
              </button>
            )}
            <label className="glass relative grid h-11 w-11 cursor-pointer place-items-center rounded-full text-navy-700" title="เลือกวันที่">
              <CalendarSearch className="h-5 w-5" />
              <input
                type="date"
                value={selected}
                onChange={(e) => e.target.value && setSelected(e.target.value)}
                aria-label="เลือกวันที่"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <MoreMenuButton />
          </div>
        }
      >
        {switcher}
      </PageHeader>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          {hero && hero.class_date !== selected && <HeroCard item={hero} live={!!live} today={today} onJump={() => setSelected(hero.class_date)} findPerson={findPerson} />}

          <div className="mt-3" />
          <TopBarSentinel />
          <div className="topbar sticky-glass sticky top-0 z-20 -mx-4 px-4 py-2">
            <DateStrip days={days} selected={selected} today={today} onSelect={setSelected} />
          </div>

          <div className="mb-3 mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-bold text-navy-900">{formatDate(selected, 'long')}</h2>
              <p className="text-[13px] text-slate-500">
                {selected === today ? 'วันนี้ · ' : ''}
                {dayClasses.length ? `${dayClasses.length} รายการ` : 'ไม่มีรายการสอน'}
              </p>
              {dayInMainRoom && (
                <p className="flex items-center gap-1 truncate text-[12px] text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{mainRoom}</span>
                </p>
              )}
            </div>
            {isAdmin && (
              <Button size="sm" icon={Plus} onClick={() => ui.openClassForm({ class_date: selected })} className="shrink-0">
                เพิ่มวิชา
              </Button>
            )}
          </div>

          {dayClasses.length === 0 ? (
            <EmptyState
              icon={classes.length ? CalendarDays : BookOpen}
              title={classes.length ? 'วันนี้ไม่มีรายการสอน' : 'ยังไม่มีตารางสอนในระบบ'}
              description={
                classes.length
                  ? next
                    ? `วิชาถัดไป: ${relativeDay(next.class_date, today)}`
                    : 'เลือกวันอื่นจากแถบวันที่ด้านบน (วันที่มีจุดสีทองคือวันที่มีเรียน)'
                  : 'ผู้ดูแลระบบเพิ่มตารางสอนได้จากเมนู ตั้งค่า/แอดมิน'
              }
              action={
                next && classes.length ? (
                  <Button variant="soft" size="sm" onClick={() => setSelected(next.class_date)}>
                    ไปยังวิชาถัดไป
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="space-y-3">
              {dayClasses.map((c) => (
                <ClassCard
                  key={c.id}
                  item={c}
                  status={statusOf.get(c.id)}
                  isNext={!!next && next.id === c.id && !live}
                  onEdit={isAdmin ? () => ui.openClassForm(c) : null}
                  findPerson={findPerson}
                  mainRoom={mainRoom}
                  docCount={docCounts[subjectKey(c.subject)] || 0}
                  onDocs={() => ui.go('course', { tab: 'docs', subject: c.subject })}
                  onPerson={onPerson}
                />
              ))}
            </div>
          )}
        </>
      )}
      <InstructorSheet ins={sheetIns} onClose={() => setSheetIns(null)} />
    </div>
  );
}
