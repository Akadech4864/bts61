import { useMemo, useState } from 'react';
import {
  CalendarCheck2, ChevronRight, ClipboardList, ExternalLink, FileText, FolderOpen, Info, Pencil, Plus, Users,
} from 'lucide-react';
import MoreMenuButton from '../components/MoreMenu';
import { Button, EmptyState, PageHeader, Skeleton } from '../components/ui';
import RecordForm from '../components/RecordForm';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { compareClass, cx, daysBetween, formatDate, thCompare, timeRange, toISODate, useNow } from '../lib/utils';
import { bySort, detailLines, FEATURED_SUBJECT, kindTone, safeHref } from '../lib/course';

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-2 px-1">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
        <Icon className="h-[18px] w-[18px] text-gold-600" /> {children}
      </h2>
      {right}
    </div>
  );
}

function EditButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="แก้ไขรายการนี้"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-white/70 hover:text-navy-800"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}

function dueLabel(days) {
  if (days === 0) return 'วันนี้';
  if (days === 1) return 'พรุ่งนี้';
  if (days > 1) return `อีก ${days} วัน`;
  return 'ผ่านแล้ว';
}

/** กำหนดส่งงาน: เรียงตามวันที่ ไฮไลต์งานถัดไป */
function TaskList({ tasks, today, onEdit }) {
  const nextId = (tasks.find((t) => t.due_date && t.due_date >= today) || {}).id;
  return (
    <ol className="glass relative rounded-3xl px-4 py-2">
      {tasks.map((t, i) => {
        const days = t.due_date ? daysBetween(today, t.due_date) : null;
        const past = days !== null && days < 0;
        const isNext = t.id === nextId;
        return (
          <li key={t.id} className={cx('relative flex gap-3 py-2.5', i > 0 && 'border-t border-white/70', past && 'opacity-55')}>
            <span
              className={cx(
                'mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-center leading-none',
                isNext ? 'btn-gold text-white' : past ? 'bg-slate-500/10 text-slate-500' : 'bg-navy-500/10 text-navy-700',
              )}
            >
              {t.due_date ? (
                <span>
                  <span className="block text-base font-bold tabular-nums">{Number(t.due_date.slice(8, 10))}</span>
                  <span className="block text-[10px]">{formatDate(t.due_date, 'medium').split(' ')[2] || ''}</span>
                </span>
              ) : (
                <ClipboardList className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[15px] font-semibold leading-snug text-navy-900">{t.title}</p>
                {days !== null && (
                  <span className={cx('rounded-full px-2 py-px text-[11px] font-semibold', isNext ? 'bg-gold-400/30 text-gold-700' : past ? 'bg-slate-500/10 text-slate-500' : 'bg-navy-500/10 text-navy-700')}>
                    {dueLabel(days)}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-slate-500">
                {t.due_date ? `${formatDate(t.due_date, 'long')}${t.due_time ? ` · ${t.due_time} น.` : ''}` : 'ยังไม่กำหนดวัน'}
              </p>
              {t.detail && <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{t.detail}</p>}
              {safeHref(t.url) && (
                <a href={safeHref(t.url)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-navy-700">
                  <ExternalLink className="h-3.5 w-3.5" /> เปิดลิงก์
                </a>
              )}
            </div>
            {onEdit && <EditButton onClick={() => onEdit(t)} />}
          </li>
        );
      })}
    </ol>
  );
}

/** กำหนดการเรียนของวิชา (ดึงจากตารางสอน) */
function SessionList({ sessions, today, onOpen }) {
  return (
    <div className="glass rounded-3xl px-2 py-1.5">
      {sessions.map((c, i) => {
        const past = c.class_date < today;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(c.class_date)}
            className={cx('flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/50', i > 0 && 'border-t border-white/60', past && 'opacity-55')}
          >
            <span className="w-12 shrink-0 text-center">
              <span className="block text-[11px] text-slate-400">ครั้งที่</span>
              <span className="block text-[15px] font-bold text-navy-900 tabular-nums">{c.session || '–'}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-navy-900">{formatDate(c.class_date, 'long')}</span>
              <span className="block text-[12px] text-slate-500">
                {timeRange(c.start_time, c.end_time)}
                {c.kind && <span className={cx('ml-1.5 rounded-full px-1.5 py-px text-[11px] font-semibold', kindTone(c.kind))}>{c.kind}</span>}
              </span>
              {c.topic && <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{c.topic}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        );
      })}
    </div>
  );
}

function LinkList({ links, onEdit }) {
  return (
    <div className="glass rounded-3xl px-2 py-1.5">
      {links.map((l, i) => {
        const href = safeHref(l.url);
        const body = (
          <>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-500/10 text-navy-700">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug text-navy-900">{l.title}</span>
              {l.detail && <span className="block text-[13px] leading-snug text-slate-500">{l.detail}</span>}
            </span>
            {href && <ExternalLink className="h-4 w-4 shrink-0 text-navy-400" />}
          </>
        );
        return (
          <div key={l.id} className={cx('flex items-center gap-1', i > 0 && 'border-t border-white/60')}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/50">
                {body}
              </a>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5">{body}</div>
            )}
            {onEdit && <EditButton onClick={() => onEdit(l)} />}
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ item, onEdit }) {
  const lines = detailLines(item.detail);
  return (
    <section className="glass rounded-3xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold leading-snug text-navy-900">{item.title}</h3>
        {onEdit && <EditButton onClick={() => onEdit(item)} />}
      </div>
      {lines.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-snug text-slate-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
              <span className="min-w-0">
                {l.label && <strong className="font-semibold text-navy-900">{l.label}: </strong>}
                {l.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      {safeHref(item.url) && (
        <a href={safeHref(item.url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-navy-700">
          <ExternalLink className="h-3.5 w-3.5" /> เปิดลิงก์
        </a>
      )}
    </section>
  );
}

const sameSubject = (a, b) => a.replace(/^วิชา/, '').trim() === b.replace(/^วิชา/, '').trim();

export default function DocsPage() {
  const { data, status, isAdmin } = useStore();
  const ui = useUI();
  const now = useNow(60000);
  const today = toISODate(now);
  const [form, setForm] = useState(null);

  const subjects = useMemo(() => {
    const names = [...new Set((data.resources || []).map((r) => r.subject || 'ทั่วไป'))];
    return names.sort((a, b) => Number(b === FEATURED_SUBJECT) - Number(a === FEATURED_SUBJECT) || thCompare(a, b));
  }, [data.resources]);
  const [picked, setPicked] = useState(null);
  const subject = picked && subjects.includes(picked) ? picked : subjects[0];

  const items = useMemo(
    () => (data.resources || []).filter((r) => (r.subject || 'ทั่วไป') === subject).sort(bySort),
    [data.resources, subject],
  );
  const tasks = items.filter((r) => r.type === 'task').sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || bySort(a, b));
  const links = items.filter((r) => r.type === 'link');
  const infos = items.filter((r) => r.type === 'info');
  const sessions = useMemo(
    () => (subject ? data.classes.filter((c) => sameSubject(c.subject, subject)).sort(compareClass) : []),
    [data.classes, subject],
  );
  const nextTask = tasks.find((t) => t.due_date && t.due_date >= today);
  const nextSession = sessions.find((c) => c.class_date >= today);
  const hasGroups = subject === FEATURED_SUBJECT && (data.instructors || []).some((i) => i.group_no);
  const edit = isAdmin ? (item) => setForm({ key: Date.now(), collection: 'resources', item }) : null;
  const loading = status === 'loading';

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader
        eyebrow="Assignments & Documents"
        title="งาน / เอกสาร"
        right={
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Button size="sm" icon={Plus} onClick={() => setForm({ key: Date.now(), collection: 'resources', item: { subject: subject || '' } })} className="shrink-0">
                เพิ่ม
              </Button>
            )}
            <MoreMenuButton />
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      ) : !subjects.length ? (
        <EmptyState
          icon={FolderOpen}
          title="ยังไม่มีงานหรือเอกสาร"
          description="งานที่ต้องส่งและเอกสารประกอบการเรียนของแต่ละวิชาจะรวบรวมไว้ที่นี่"
        />
      ) : (
        <>
          {subjects.length > 1 && (
            <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5" role="tablist" aria-label="วิชา">
              {subjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={s === subject}
                  onClick={() => setPicked(s)}
                  className={cx('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95', s === subject ? 'btn-navy text-white' : 'glass text-slate-700')}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <section className="glass-dark relative overflow-hidden rounded-3xl p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10" />
            <p className="text-xs font-semibold text-gold-300">งาน / เอกสารประจำวิชา</p>
            <h2 className="mt-1 text-2xl font-bold leading-tight">{subject}</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['กำหนดส่ง', tasks.length],
                ['ครั้งที่เรียน', sessions.length],
                ['เอกสาร', links.length + infos.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/10 py-2 ring-1 ring-inset ring-white/15">
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                  <p className="text-[11px] text-white/70">{label}</p>
                </div>
              ))}
            </div>
            {(nextTask || nextSession) && (
              <div className="mt-3 space-y-1 text-[13px] text-white/85">
                {nextTask && (
                  <p className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 shrink-0 text-gold-300" />
                    <span>
                      ส่งงานถัดไป: <strong className="font-semibold text-white">{nextTask.title}</strong> · {formatDate(nextTask.due_date, 'medium')} ({dueLabel(daysBetween(today, nextTask.due_date))})
                    </span>
                  </p>
                )}
                {nextSession && (
                  <p className="flex items-center gap-2">
                    <CalendarCheck2 className="h-4 w-4 shrink-0 text-gold-300" />
                    <span>
                      เรียนครั้งถัดไป: <strong className="font-semibold text-white">{nextSession.session ? `ครั้งที่ ${nextSession.session}` : nextSession.subject}</strong> · {formatDate(nextSession.class_date, 'medium')} {timeRange(nextSession.start_time, nextSession.end_time)}
                    </span>
                  </p>
                )}
              </div>
            )}
            {hasGroups && (
              <button
                type="button"
                onClick={() => ui.go('course', { tab: 'instructors', mode: 'groups' })}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-semibold ring-1 ring-inset ring-white/25 transition active:scale-95"
              >
                <Users className="h-4 w-4" /> อาจารย์ประจำกลุ่ม <ChevronRight className="h-4 w-4 text-white/60" />
              </button>
            )}
          </section>

          {tasks.length > 0 && (
            <>
              <SectionTitle icon={ClipboardList}>กำหนดส่งงาน</SectionTitle>
              <TaskList tasks={tasks} today={today} onEdit={edit} />
            </>
          )}

          {sessions.length > 0 && (
            <>
              <SectionTitle icon={CalendarCheck2}>กำหนดการเรียน</SectionTitle>
              <SessionList sessions={sessions} today={today} onOpen={(date) => ui.go('classes', { date })} />
            </>
          )}

          {links.length > 0 && (
            <>
              <SectionTitle icon={FileText}>เอกสาร / สื่อประกอบการเรียน</SectionTitle>
              <LinkList links={links} onEdit={edit} />
            </>
          )}

          {infos.length > 0 && (
            <>
              <SectionTitle icon={Info}>ข้อมูลประกอบ</SectionTitle>
              <div className="space-y-3">
                {infos.map((item) => <InfoCard key={item.id} item={item} onEdit={edit} />)}
              </div>
            </>
          )}

          <p className="mt-6 px-2 text-center text-xs leading-relaxed text-slate-400">
            เอกสารประกอบการเรียนของวิชาอื่นจะทยอยเพิ่มในหน้านี้ (แยกเป็นแท็บตามวิชา)
          </p>
        </>
      )}

      <RecordForm state={form} onClose={() => setForm(null)} />
    </div>
  );
}
