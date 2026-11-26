import { useMemo } from 'react';
import { AlarmClock, ArrowLeftRight, CalendarDays, ChevronRight, ClipboardList, Clock, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { Photo } from '../components/Avatar';
import MoreMenuButton from '../components/MoreMenu';
import { Skeleton } from '../components/ui';
import { COURSE_TITLE_SHORT } from '../config';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import {
  addDays, atTime, classStatus, compareClass, cx, daysBetween, formatDate, nickOf, parseISODate, relativeDay, resolveDuty, thCompare,
  timeRange, toISODate, useNow,
} from '../lib/utils';
import { buildPeopleIndex, faceOf, FEATURED_SUBJECT, NON_SUBJECTS } from '../lib/course';
import { subjectKey } from '../lib/docs';
import { firstNameShort } from '../components/DutySwap';

const ROLE_ORDER = ['เวรทั่วไป', 'เวรรับอาจารย์'];

/** "1 ชม. 20 นาที" / "25 นาที" */
function durationLabel(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} นาที`;
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
}

const startOf = (c) => atTime(parseISODate(c.class_date), c.start_time) || parseISODate(c.class_date);
function endOf(c) {
  const day = parseISODate(c.class_date);
  return atTime(day, c.end_time) || (c.start_time ? new Date(startOf(c).getTime() + 3 * 3600000) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59));
}

function Face({ match, className }) {
  if (match) return <Photo member={faceOf(match.rec)} width={160} className={cx('shrink-0 rounded-full object-[center_20%]', className)} textClass="text-xs" />;
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full bg-white/10 text-white/60', className)}>
      <UserRound className="h-1/2 w-1/2" />
    </span>
  );
}

function Section({ icon: Icon, title, action, onAction, children }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
          <Icon className="h-[18px] w-[18px] text-gold-600" /> {title}
        </h2>
        {action && (
          <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[13px] font-semibold text-navy-700 transition active:opacity-70">
            {action} <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** การ์ดเด่น: วิชาที่กำลังเรียน (มีแถบเวลาที่ผ่านไป) หรือวิชาถัดไป (นับถอยหลัง) — เปลี่ยนเองเมื่อหมดเวลา */
function NowCard({ item, live, now, today, after, findPerson, onOpen }) {
  const start = startOf(item);
  const end = endOf(item);
  const progress = live ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;
  const soon = !live && item.class_date === today;
  return (
    <button type="button" onClick={onOpen} className="glass-dark relative block w-full overflow-hidden rounded-3xl p-5 text-left transition active:scale-[0.99]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10" />
      <div className="flex items-center justify-between gap-2">
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', live ? 'bg-emerald-500 text-white' : 'bg-gold-400 text-navy-950')}>
          {live ? <><span className="pulse-dot" /> กำลังเรียนอยู่ตอนนี้</> : soon ? `เริ่มในอีก ${durationLabel(start - now)}` : 'วิชาถัดไป'}
        </span>
        <ChevronRight className="h-5 w-5 text-white/50" />
      </div>
      <h2 className="mt-3 text-[22px] font-bold leading-snug">{item.subject}</h2>
      {item.topic && <p className="mt-1 text-[14px] leading-snug text-white/85">{item.topic}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-white/80">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {item.class_date === today ? timeRange(item.start_time, item.end_time) : `${relativeDay(item.class_date, today)} · ${timeRange(item.start_time, item.end_time)}`}
        </span>
        {item.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {item.location}
          </span>
        )}
      </div>
      {live && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-right text-[12px] text-white/70">เหลืออีก {durationLabel(end - now)}</p>
        </div>
      )}
      {item.speaker && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 pt-3">
          <Face match={findPerson(item.speaker)} className="h-10 w-10 ring-2 ring-white/20" />
          <span className="min-w-0">
            <span className="block text-[11px] text-white/60">อาจารย์ผู้บรรยาย</span>
            <span className="block text-[14px] font-semibold leading-snug">{item.speaker}</span>
          </span>
        </div>
      )}
      {after && (
        <p className="mt-3 border-t border-white/10 pt-2.5 text-[12.5px] text-white/70">
          ต่อจากนี้ <span className="font-semibold text-white">{after.start_time}</span> · {after.subject}
        </p>
      )}
    </button>
  );
}

/** ระดับความเร่งด่วนของกำหนดส่ง */
function urgencyOf(days) {
  if (days <= 1) return { ring: 'ring-2 ring-rose-400', chip: 'bg-rose-500 text-white', bar: 'bg-rose-500' };
  if (days <= 7) return { ring: 'ring-2 ring-amber-300', chip: 'bg-amber-400 text-navy-950', bar: 'bg-amber-400' };
  return { ring: 'ring-1 ring-gold-300/70', chip: 'bg-gold-400/25 text-gold-700', bar: 'bg-gold-400' };
}

const dueText = (days) => (days === 0 ? 'ส่งวันนี้' : days === 1 ? 'ส่งพรุ่งนี้' : `อีก ${days} วัน`);

/** เตือนส่งงานวิชาเอกสารศึกษา: งานถัดไป นับถอยหลัง และความคืบหน้าตามขั้นตอนทั้งหมด */
function StudyReminder({ tasks, today, onOpen }) {
  const nextIndex = tasks.findIndex((t) => t.due_date >= today);
  if (nextIndex === -1) return null;
  const next = tasks[nextIndex];
  const days = daysBetween(today, next.due_date);
  const u = urgencyOf(days);
  return (
    <button type="button" onClick={onOpen} className={cx('glass block w-full rounded-3xl p-4 text-left transition active:scale-[0.99]', u.ring)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-navy-900">
          <AlarmClock className="h-[18px] w-[18px] text-gold-600" /> เตือนส่งงาน · วิชาเอกสารศึกษา
        </span>
        <span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold', u.chip)}>{dueText(days)}</span>
      </div>
      <p className="mt-2 text-[17px] font-bold leading-snug text-navy-900">{next.title}</p>
      <p className="text-[13px] text-slate-600">
        กำหนดส่ง {formatDate(next.due_date, 'long')}{next.due_time ? ` · ${next.due_time} น.` : ''}
      </p>
      {next.detail && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-slate-500">{next.detail}</p>}
      <div className="mt-3 flex items-center gap-1" aria-label={`ขั้นที่ ${nextIndex + 1} จาก ${tasks.length}`}>
        {tasks.map((t, i) => (
          <span key={t.id} className={cx('h-1.5 flex-1 rounded-full', i < nextIndex ? 'bg-emerald-500' : i === nextIndex ? u.bar : 'bg-slate-300/70')} />
        ))}
      </div>
      <p className="mt-1.5 flex items-center justify-between text-[12px] text-slate-500">
        <span>ขั้นที่ {nextIndex + 1} จาก {tasks.length}</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-navy-700">ดูรายละเอียด <ChevronRight className="h-3.5 w-3.5" /></span>
      </p>
    </button>
  );
}

/**
 * หน้าแรก: วันที่ เวลา สัปดาห์ที่ของหลักสูตร, วิชาที่กำลังเรียน/ถัดไป, กำหนดการวันนี้, เวรวันนี้, งานที่ใกล้ถึงกำหนด
 * อัปเดตเองทุก 15 วินาที — เมื่อวิชาจบหรือขึ้นวันใหม่ จะเลื่อนไปรายการถัดไปตามตารางทันที
 */
export default function HomePage() {
  const { data, status, memberById, isAdmin } = useStore();
  const ui = useUI();
  const now = useNow(15000);
  const today = toISODate(now);

  const classes = useMemo(() => [...data.classes].sort(compareClass), [data.classes]);
  const findPerson = useMemo(() => buildPeopleIndex(data.instructors, data.staff), [data.instructors, data.staff]);
  const statusOf = (c) => classStatus(c, now);
  const live = classes.find((c) => statusOf(c) === 'now');
  const upcoming = classes.filter((c) => statusOf(c) === 'upcoming');
  const hero = live || upcoming[0];
  const after = live ? upcoming.find((c) => c.class_date === today) : upcoming[1] && upcoming[1].class_date === today ? upcoming[1] : null;
  const todayClasses = classes.filter((c) => c.class_date === today);

  // สัปดาห์ที่ / วันที่ของหลักสูตร
  const first = classes[0] && classes[0].class_date;
  const last = classes.length ? classes[classes.length - 1].class_date : '';
  let courseLine = '';
  if (first) {
    if (today < first) courseLine = `อีก ${daysBetween(today, first)} วันเริ่มหลักสูตร`;
    else if (today > last) courseLine = 'จบหลักสูตรแล้ว';
    else {
      const d = parseISODate(first);
      const monday = addDays(first, -((d.getDay() + 6) % 7));
      courseLine = `สัปดาห์ที่ ${Math.floor(daysBetween(monday, today) / 7) + 1} ของหลักสูตร`;
    }
  }

  // เวรวันนี้ (ถ้าวันนี้ไม่มี แสดงวันเวรถัดไป)
  const dutyDates = [...new Set(data.duty.map((d) => d.duty_date).filter((x) => x && x >= today))].sort();
  const dutyDate = dutyDates[0] || '';
  const dutyToday = useMemo(
    () => data.duty
      .filter((d) => d.duty_date === dutyDate)
      .map((d) => ({ item: d, role: d.shift_or_role || 'เวร', people: resolveDuty(d, memberById, data.members) }))
      .sort((a, b) => {
        const ia = ROLE_ORDER.indexOf(a.role);
        const ib = ROLE_ORDER.indexOf(b.role);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || thCompare(a.role, b.role);
      }),
    [data.duty, data.members, memberById, dutyDate],
  );
  const pendingSwaps = (data.swaps || []).filter((s) => s.status === 'pending').length;

  // งานที่ต้องส่ง: เอกสารศึกษาแสดงเป็นการ์ดเตือนแยก วิชาอื่นแสดงในรายการด้านล่าง
  const isStudy = (r) => subjectKey(r.subject) === subjectKey(FEATURED_SUBJECT);
  const allTasks = (data.resources || [])
    .filter((r) => r.type === 'task' && r.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const studyTasks = allTasks.filter(isStudy);
  const tasks = allTasks.filter((r) => !isStudy(r) && r.due_date >= today).slice(0, 3);

  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const loading = status === 'loading';

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <header className="pt-safe">
        <div className="flex items-center gap-3 pb-2 pt-5">
          <img src="./logo.jpg" alt="" className="h-11 w-11 shrink-0 rounded-full bg-white object-cover shadow-[0_6px_16px_-6px_rgb(11_28_54/0.4)] ring-2 ring-white/80" />
          <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-navy-900">{COURSE_TITLE_SHORT}</p>
          <MoreMenuButton />
        </div>
        <div className="flex items-end justify-between gap-3 pb-1 pt-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gold-600">{courseLine || 'วันนี้'}</p>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-navy-900">{formatDate(today, 'long')}</h1>
          </div>
          <p className="shrink-0 text-[34px] font-bold leading-none tracking-tight text-navy-900 tabular-nums" aria-label={`เวลา ${clock} น.`}>{clock}</p>
        </div>
      </header>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-36 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          <div className="mt-4">
            {hero ? (
              <NowCard
                item={hero}
                live={!!live}
                now={now}
                today={today}
                after={after}
                findPerson={findPerson}
                onOpen={() => ui.go('classes', { date: hero.class_date })}
              />
            ) : (
              <div className="glass rounded-3xl p-5 text-center text-[14px] text-slate-500">ไม่มีวิชาที่กำลังจะมาถึง</div>
            )}
          </div>

          {studyTasks.some((t) => t.due_date >= today) && (
            <div className="mt-3">
              <StudyReminder tasks={studyTasks} today={today} onOpen={() => ui.go('course', { tab: 'study' })} />
            </div>
          )}

          {todayClasses.length > 0 && (
            <Section icon={CalendarDays} title="กำหนดการวันนี้" action="ตารางสอน" onAction={() => ui.go('classes', { date: today })}>
              <ol className="glass rounded-3xl px-2 py-1.5">
                {todayClasses.map((c, i) => {
                  const st = statusOf(c);
                  const minor = NON_SUBJECTS.test(c.subject) && !c.topic;
                  return (
                    <li key={c.id} className={cx(i > 0 && 'border-t border-white/60')}>
                      <button
                        type="button"
                        onClick={() => ui.go('classes', { date: today })}
                        className={cx('flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/50', st === 'past' && 'opacity-50')}
                      >
                        <span className="w-[52px] shrink-0 text-[14px] font-bold tabular-nums text-navy-900">{c.start_time || 'ทั้งวัน'}</span>
                        <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', st === 'now' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : st === 'past' ? 'bg-slate-300' : 'bg-gold-400')} />
                        <span className="min-w-0 flex-1">
                          <span className={cx('block truncate leading-snug', minor ? 'text-[14px] text-slate-600' : 'text-[14.5px] font-semibold text-navy-900')}>{c.subject}</span>
                          {c.topic && <span className="block truncate text-[12px] text-slate-500">{c.topic}</span>}
                        </span>
                        {st === 'now' && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">ตอนนี้</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}

          {dutyToday.length > 0 && (
            <Section icon={ShieldCheck} title={dutyDate === today ? 'เวรวันนี้' : `เวรถัดไป · ${relativeDay(dutyDate, today)}`} action="ตารางเวร" onAction={() => ui.go('duty')}>
              <div className="grid grid-cols-2 gap-2.5">
                {dutyToday.map(({ item, role, people }) => (
                  <div key={item.id} className="glass rounded-3xl p-3">
                    <p className="mb-2 truncate text-[12px] font-semibold text-slate-500">{role}</p>
                    {people.members.map((m) => (
                      <button key={m.id} type="button" onClick={() => ui.openProfile(m.id)} className="flex w-full items-center gap-2.5 rounded-2xl text-left transition active:scale-[0.98]">
                        <Photo member={m} width={160} className="h-12 w-12 shrink-0 rounded-full object-[center_20%] ring-2 ring-white" textClass="text-sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-bold leading-tight text-navy-900">{nickOf(m)}</span>
                          <span className="block truncate text-[12px] text-slate-500">{firstNameShort(m)}</span>
                        </span>
                      </button>
                    ))}
                    {people.extras.map((name) => <p key={name} className="text-[13px] text-slate-700">{name}</p>)}
                    {!people.members.length && !people.extras.length && <p className="text-[13px] leading-snug text-slate-500">{item.note || 'ยังไม่ระบุ'}</p>}
                  </div>
                ))}
              </div>
              {pendingSwaps > 0 && (
                <button type="button" onClick={() => ui.go('duty')} className="mt-2 flex w-full items-center gap-2 rounded-2xl bg-amber-400/20 px-3 py-2 text-left text-[13px] font-semibold text-amber-800">
                  <ArrowLeftRight className="h-4 w-4" /> มีคำขอสลับเวรรออนุมัติ {pendingSwaps} รายการ{isAdmin ? ' · แตะเพื่อพิจารณา' : ''}
                </button>
              )}
            </Section>
          )}

          {tasks.length > 0 && (
            <Section icon={ClipboardList} title="งานวิชาอื่นที่ใกล้ถึงกำหนดส่ง">
              <div className="glass rounded-3xl px-2 py-1.5">
                {tasks.map((t, i) => {
                  const days = daysBetween(today, t.due_date);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => ui.go('course', { tab: 'docs', subject: t.subject })}
                      className={cx('flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/50', i > 0 && 'border-t border-white/60')}
                    >
                      <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-center leading-none', i === 0 ? 'btn-gold text-white' : 'bg-navy-500/10 text-navy-700')}>
                        <span>
                          <span className="block text-base font-bold tabular-nums">{Number(t.due_date.slice(8, 10))}</span>
                          <span className="block text-[10px]">{formatDate(t.due_date, 'medium').split(' ')[2] || ''}</span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-navy-900">{t.title}</span>
                        <span className="block truncate text-[12px] text-slate-500">{t.subject}</span>
                      </span>
                      <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', days <= 3 ? 'bg-rose-500/12 text-rose-700' : 'bg-navy-500/10 text-navy-700')}>
                        {days === 0 ? 'วันนี้' : days === 1 ? 'พรุ่งนี้' : `อีก ${days} วัน`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
