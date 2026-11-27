import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, GraduationCap, UserRound, CalendarCheck2, ChevronDown, ChevronRight, ClipboardCheck, ClipboardList, ExternalLink, FileText, FolderOpen,
  GripVertical, Info, Link2, Paperclip, Pencil, PlayCircle, Plus, Presentation, Search, Trash2, Users, X,
} from 'lucide-react';
import { EmptyState, Skeleton, SubTabs } from '../components/ui';
import { useToast } from '../components/Toast';
import RecordForm from '../components/RecordForm';
import InstructorSheet from '../components/InstructorSheet';
import { GroupsView } from './InstructorsPage';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx, daysBetween, formatDate, normalize, queryTokens, timeRange, toISODate, useNow } from '../lib/utils';
import { buildPeopleIndex, bySort, detailLines, faceOf, FEATURED_SUBJECT, kindTone, safeHref, speakerKey } from '../lib/course';
import { Photo } from '../components/Avatar';
import { scrollToY } from '../lib/scroll';
import { buildSubjects, categoryLabel, DOC_CATEGORIES, docCategory, fileSizeLabel, hostOf, subjectKey } from '../lib/docs';

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
function SessionList({ sessions, today, onOpen, docsByDate = {} }) {
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
              {c.speaker && <span className="mt-0.5 block text-[12.5px] leading-snug text-navy-700">ผู้บรรยาย: {c.speaker}</span>}
              {c.secretary && <span className="block text-[12px] leading-snug text-slate-500">เลขาฯวิชา: {c.secretary}</span>}
            </span>
            {docsByDate[c.class_date] > 0 && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-navy-500/10 px-2 py-0.5 text-[11px] font-semibold text-navy-700" title="เอกสารของคาบนี้">
                <Paperclip className="h-3 w-3" /> {docsByDate[c.class_date]}
              </span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        );
      })}
    </div>
  );
}

const CAT_ICONS = { slide: Presentation, doc: FileText, video: PlayCircle, link: Link2, form: ClipboardCheck, other: Paperclip };
const CAT_TONES = {
  slide: 'bg-orange-500/12 text-orange-700',
  doc: 'bg-navy-500/10 text-navy-700',
  video: 'bg-rose-500/12 text-rose-700',
  link: 'bg-sky-500/12 text-sky-700',
  form: 'bg-emerald-500/12 text-emerald-700',
  other: 'bg-slate-500/10 text-slate-600',
};
const CAT_ORDER = DOC_CATEGORIES.map((c) => c.value);

/**
 * ลากเรียงลำดับ: กดค้างที่ไอคอน ⋮⋮ แล้วลากขึ้น/ลง (มือถือและเมาส์) หรือใช้ปุ่มลูกศรขึ้น/ลงบนคีย์บอร์ด
 * ระหว่างลากเรียงรายการใหม่ทันทีที่ผ่านกึ่งกลางแถวอื่น ปล่อยแล้วค่อยบันทึก
 */
function useDragOrder(items, onReorder) {
  const [drag, setDrag] = useState(null); // { id, ids }
  const rows = useRef(new Map());
  const live = useRef({});
  live.current = { drag, items, onReorder };
  // ลำดับที่แสดง (ใช้ CSS order — ไม่ย้าย DOM ระหว่างลาก นิ้ว/เมาส์จึงไม่หลุดจากแถว)
  const pos = new Map((drag ? drag.ids : items.map((d) => d.id)).map((id, i) => [id, i]));
  const commit = (ids) => {
    const { items: cur, onReorder: save } = live.current;
    if (ids.join('|') !== cur.map((d) => d.id).join('|')) save(ids);
  };

  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return undefined;
    const move = (e) => {
      const d = live.current.drag;
      if (!d) return;
      const y = e.clientY;
      const others = d.ids.filter((x) => x !== d.id);
      let at = others.length;
      for (let i = 0; i < others.length; i += 1) {
        const el = rows.current.get(others[i]);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y < r.top + r.height / 2) { at = i; break; }
      }
      const next = [...others.slice(0, at), d.id, ...others.slice(at)];
      if (next.join('|') !== d.ids.join('|')) setDrag({ ...d, ids: next });
      // ลากใกล้ขอบจอ เลื่อนหน้าให้อัตโนมัติ
      if (y < 90) scrollToY(window.scrollY - 14);
      else if (y > window.innerHeight - 110) scrollToY(window.scrollY + 14);
    };
    const up = () => {
      const d = live.current.drag;
      setDrag(null);
      if (d) commit(d.ids);
    };
    const cancel = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProps = (id) => ({
    onPointerDown: (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      setDrag({ id, ids: items.map((d) => d.id) });
    },
    onKeyDown: (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const ids = items.map((d) => d.id);
      const i = ids.indexOf(id);
      const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      commit(ids);
    },
  });
  const rowRef = (id) => (el) => {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  };
  return { pos, dragId: drag && drag.id, handleProps, rowRef };
}

const NO_REORDER = () => {};

/** เอกสาร/สื่อการสอน: ไอคอนตามหมวด, ชื่อ, หมวด · ขนาดไฟล์หรือเว็บไซต์ · คาบเรียน แตะเพื่อเปิด */
function DocList({ docs, onEdit, onDelete, onReorder, canEdit, showSubject = false }) {
  const { pos, dragId, handleProps, rowRef } = useDragOrder(docs, onReorder || NO_REORDER);
  const sortable = !!onReorder && docs.length > 1;
  return (
    <div className={cx('glass flex flex-col rounded-3xl px-2 py-1.5', dragId && 'select-none')}>
      {docs.map((d) => {
        const i = pos.get(d.id);
        const cat = docCategory(d);
        const Icon = CAT_ICONS[cat] || FileText;
        const href = safeHref(d.url);
        const meta = [categoryLabel(cat), d.file_id ? fileSizeLabel(d.file_size) : hostOf(d.url), d.class_date ? formatDate(d.class_date, 'medium') : '']
          .filter(Boolean).join(' · ');
        const body = (
          <>
            <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', CAT_TONES[cat] || CAT_TONES.other)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug text-navy-900">{d.title}</span>
              {showSubject && <span className="block truncate text-[12px] font-medium text-gold-700">{d.subject}</span>}
              <span className="block truncate text-[12px] text-slate-500">{meta}</span>
              {d.detail && <span className="line-clamp-2 block text-[13px] leading-snug text-slate-600">{d.detail}</span>}
              {d.uploaded_by && <span className="block truncate text-[11.5px] text-slate-400">แนบโดย {d.uploaded_by}</span>}
            </span>
            {href && <ExternalLink className="h-4 w-4 shrink-0 text-navy-400" />}
          </>
        );
        return (
          <div
            key={d.id}
            ref={rowRef(d.id)}
            style={{ order: i }}
            className={cx(
              'flex items-center gap-1',
              i > 0 && 'border-t border-white/60',
              dragId === d.id && 'relative z-10 rounded-2xl bg-white/90 shadow-lg ring-1 ring-navy-200',
            )}
          >
            {sortable && (
              <button
                type="button"
                {...handleProps(d.id)}
                aria-label={`ลากเพื่อย้ายลำดับ: ${d.title}`}
                title="กดค้างแล้วลากเพื่อเรียงลำดับ"
                className={cx('-mr-1 grid h-10 w-7 shrink-0 touch-none select-none place-items-center rounded-lg transition hover:text-navy-500', dragId === d.id ? 'cursor-grabbing text-navy-500' : 'cursor-grab text-slate-300')}
              >
                <GripVertical className="h-5 w-5" />
              </button>
            )}
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/50">
                {body}
              </a>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5">{body}</div>
            )}
            {onDelete && (!canEdit || canEdit(d)) && (
              <button
                type="button"
                onClick={() => onDelete(d)}
                aria-label="ลบเอกสารนี้"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {onEdit && (!canEdit || canEdit(d)) && <EditButton onClick={() => onEdit(d)} />}
          </div>
        );
      })}
    </div>
  );
}

const autoOrder = (a, b) => CAT_ORDER.indexOf(docCategory(a)) - CAT_ORDER.indexOf(docCategory(b))
  || (a.class_date || '9999').localeCompare(b.class_date || '9999') || (Number(a.sort) || 9999) - (Number(b.sort) || 9999);
// ผลค้นหารวมทุกวิชา: เรียงตามหมวด > คาบเรียน
const sortDocs = (list) => [...list].sort(autoOrder);
// เอกสารของวิชา: ลำดับที่แอดมินลากเรียงไว้มาก่อน รายการใหม่ที่ยังไม่ได้จัดลำดับต่อท้ายตามหมวด
const sortSubjectDocs = (list) => [...list].sort((a, b) => (Number(a.sort) || 99999) - (Number(b.sort) || 99999) || autoOrder(a, b));

function AddButton({ onClick, children = 'แนบเอกสาร' }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-navy-500/10 px-3 text-[13px] font-semibold text-navy-800 transition active:scale-95">
      <Plus className="h-4 w-4" /> {children}
    </button>
  );
}

function InfoCard({ item, onEdit }) {
  const [open, setOpen] = useState(false);
  const lines = detailLines(item.detail);
  const href = safeHref(item.url);
  const expandable = lines.length > 0 || !!href;
  return (
    <section className="glass rounded-3xl">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => expandable && setOpen((v) => !v)}
          aria-expanded={expandable ? open : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3.5 text-left"
        >
          <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-navy-900">{item.title}</span>
          {expandable && <ChevronDown className={cx('h-5 w-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />}
        </button>
        {onEdit && <EditButton onClick={() => onEdit(item)} />}
      </div>
      {open && (
        <div className="-mt-1 px-4 pb-4">
          {lines.length > 0 && (
            <ul className="space-y-1.5">
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
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-navy-700">
              <ExternalLink className="h-3.5 w-3.5" /> เปิดลิงก์
            </a>
          )}
        </div>
      )}
    </section>
  );
}

/** อาจารย์ผู้สอนของวิชา: ผู้บรรยายแต่ละท่านพร้อมวันที่สอน และเลขาฯวิชา (แตะเพื่อดูประวัติ) */
function TeacherList({ sessions, findPerson, onOpenIns, onDate }) {
  const speakers = [];
  const byKey = new Map();
  sessions.forEach((c) => {
    if (!c.speaker) return;
    const key = speakerKey(c.speaker);
    if (!byKey.has(key)) {
      const entry = { key, name: c.speaker, match: findPerson(c.speaker), dates: [] };
      byKey.set(key, entry);
      speakers.push(entry);
    }
    const entry = byKey.get(key);
    if (!entry.dates.includes(c.class_date)) entry.dates.push(c.class_date);
  });
  const secretaries = [...new Set(sessions.map((c) => c.secretary).filter(Boolean))];
  if (!speakers.length && !secretaries.length) {
    return <p className="glass rounded-3xl px-4 py-5 text-center text-[13px] text-slate-500">ยังไม่ประกาศชื่อผู้บรรยาย — จะแสดงเมื่อมีตารางรายสัปดาห์</p>;
  }
  return (
    <div className="glass rounded-3xl px-2 py-1.5">
      {speakers.map((sp, i) => {
        const ins = sp.match && sp.match.type === 'instructor' ? sp.match.rec : null;
        const face = sp.match ? (
          <Photo member={faceOf(sp.match.rec)} width={160} className="h-11 w-11 shrink-0 rounded-full object-[center_20%]" textClass="text-xs" />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-500/10 text-slate-400"><UserRound className="h-5 w-5" /></span>
        );
        return (
          <div key={sp.key} className={cx('flex items-start gap-3 px-2 py-2.5', i > 0 && 'border-t border-white/60')}>
            {ins ? <button type="button" onClick={() => onOpenIns(ins.id)} aria-label={`ประวัติ ${sp.name}`}>{face}</button> : face}
            <div className="min-w-0 flex-1">
              {ins ? (
                <button type="button" onClick={() => onOpenIns(ins.id)} className="text-left text-[14.5px] font-semibold leading-snug text-navy-900">
                  {sp.name} <ChevronRight className="inline h-4 w-4 align-[-3px] text-navy-400" />
                </button>
              ) : (
                <p className="text-[14.5px] font-semibold leading-snug text-navy-900">{sp.name}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {sp.dates.map((d) => (
                  <button key={d} type="button" onClick={() => onDate(d)} className="rounded-full bg-navy-500/10 px-2 py-0.5 text-[11.5px] font-medium text-navy-700 transition active:scale-95">
                    {formatDate(d, 'medium')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      {secretaries.length > 0 && (
        <p className={cx('px-2 py-2.5 text-[12.5px] leading-snug text-slate-600', speakers.length && 'border-t border-white/60')}>
          <span className="font-semibold text-slate-700">เลขาฯวิชา:</span> {secretaries.join(' · ')}
        </p>
      )}
    </div>
  );
}

/** หน้ารายวิชา: เอกสาร/สื่อการสอน งานที่ต้องส่ง คาบเรียน และข้อมูลประกอบของวิชานั้น */
function SubjectDetail({ subject, today, onBack, onEdit, onAttach, onEditDoc, onDeleteDoc, onReorderDocs, canEditDoc, study = false }) {
  const { data } = useStore();
  const [openIns, setOpenIns] = useState(null);
  const ui = useUI();
  const { name, docs, tasks, infos, sessions } = subject;
  const nextTask = tasks.find((t) => t.due_date && t.due_date >= today);
  const nextSession = sessions.find((c) => c.class_date >= today);
  const hasGroups = subjectKey(name) === subjectKey(FEATURED_SUBJECT) && (data.instructors || []).some((i) => i.group_no);
  const instructors = useMemo(() => [...(data.instructors || [])].sort(bySort), [data.instructors]);
  const findPerson = useMemo(() => buildPeopleIndex(data.instructors, data.staff), [data.instructors, data.staff]);
  const docsByDate = {};
  docs.forEach((d) => { if (d.class_date) docsByDate[d.class_date] = (docsByDate[d.class_date] || 0) + 1; });

  // แท็บย่อย: แสดงเฉพาะหัวข้อที่มีข้อมูล (เอกสารแสดงเสมอเพื่อให้แนบได้) — หน้าเดียวไม่ยาวเกินไป
  const parts = (study
    ? [
      { value: 'tasks', label: 'กำหนดส่ง', show: tasks.length > 0 },
      { value: 'groups', label: 'อาจารย์', show: hasGroups },
      { value: 'docs', label: 'เอกสาร', show: true },
      { value: 'infos', label: 'แนวทาง', show: infos.length > 0 },
      { value: 'sessions', label: 'คาบพบ', show: sessions.length > 0 },
    ]
    : [
      { value: 'teachers', label: 'อาจารย์', show: true },
      { value: 'docs', label: 'เอกสาร', show: true },
      { value: 'sessions', label: 'คาบเรียน', show: sessions.length > 0 },
      { value: 'tasks', label: 'งาน', show: tasks.length > 0 },
      { value: 'infos', label: 'ข้อมูล', show: infos.length > 0 },
    ]).filter((x) => x.show);
  const [active, setActive] = useState(() => {
    const asked = ui.view && ui.view.part;
    return parts.some((x) => x.value === asked) ? asked : parts[0].value;
  });
  const current = parts.some((x) => x.value === active) ? active : parts[0].value;

  return (
    <div>
      {onBack && (
        <button type="button" onClick={onBack} className="mb-2 inline-flex h-9 items-center gap-1.5 rounded-full pr-3 text-[14px] font-semibold text-navy-700 transition active:opacity-70">
          <ArrowLeft className="h-[18px] w-[18px]" /> วิชาทั้งหมด
        </button>
      )}

      <section className="glass-dark relative overflow-hidden rounded-3xl p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10" />
        <p className="text-xs font-semibold text-gold-300">
          {study ? 'งานเขียนรายงานเชิงวิชาการรายบุคคล' : sessions.length ? `${sessions.length} คาบ · เริ่ม ${formatDate(subject.first, 'medium')}` : 'วิชา'}
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">{name}</h2>
        {(nextTask || nextSession) && (
          <div className="mt-3 space-y-1.5 text-[13px] text-white/85">
            {nextSession && (
              <p className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 shrink-0 text-gold-300" />
                <span>
                  เรียนครั้งถัดไป: <strong className="font-semibold text-white">{formatDate(nextSession.class_date, 'medium')}</strong> {timeRange(nextSession.start_time, nextSession.end_time)}
                </span>
              </p>
            )}
            {nextTask && (
              <p className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 shrink-0 text-gold-300" />
                <span>
                  ส่งงานถัดไป: <strong className="font-semibold text-white">{nextTask.title}</strong> · {formatDate(nextTask.due_date, 'medium')} ({dueLabel(daysBetween(today, nextTask.due_date))})
                </span>
              </p>
            )}
          </div>
        )}
        {hasGroups && !study && (
          <button
            type="button"
            onClick={() => ui.go('course', { tab: 'instructors', mode: 'groups' })}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-semibold ring-1 ring-inset ring-white/25 transition active:scale-95"
          >
            <Users className="h-4 w-4" /> อาจารย์ประจำกลุ่ม <ChevronRight className="h-4 w-4 text-white/60" />
          </button>
        )}
      </section>

      <SubTabs
        className="mt-4"
        options={parts.map(({ value, label }) => ({ value, label }))}
        value={current}
        label="หัวข้อของวิชา"
        onChange={(v) => {
          setActive(v);
          ui.remember({ part: v });
        }}
      />

      {[current].map((part) => {
        if (part === 'teachers') {
          return (
            <div key={part}>
              <SectionTitle icon={GraduationCap}>อาจารย์ผู้สอน</SectionTitle>
              <TeacherList sessions={sessions} findPerson={findPerson} onOpenIns={setOpenIns} onDate={(date) => ui.go('classes', { date })} />
            </div>
          );
        }
        if (part === 'docs') {
          return (
            <div key={part}>
              <SectionTitle icon={Presentation} right={onAttach && <AddButton onClick={() => onAttach(name)} />}>{study ? 'เอกสาร / แบบฟอร์ม / ตัวอย่าง' : 'เอกสาร / สื่อการสอน'}</SectionTitle>
              {onReorderDocs && docs.length > 1 && (
                <p className="-mt-1 mb-1.5 flex items-center gap-1 px-1 text-[12px] text-slate-500">
                  <GripVertical className="h-3.5 w-3.5" /> กดค้างที่ไอคอนนี้แล้วลากขึ้น-ลง เพื่อเรียงลำดับเอกสาร
                </p>
              )}
              {docs.length ? (
                <DocList docs={sortSubjectDocs(docs)} onEdit={onEditDoc} onDelete={onDeleteDoc} onReorder={onReorderDocs} canEdit={canEditDoc} />
              ) : (
                <p className="glass rounded-3xl px-4 py-5 text-center text-[13px] text-slate-500">ยังไม่มีเอกสาร</p>
              )}
            </div>
          );
        }
        if (part === 'tasks' && tasks.length) {
          return (
            <div key={part}>
              <SectionTitle icon={ClipboardList}>{study ? 'ขั้นตอน / กำหนดส่งงาน' : 'กำหนดส่งงาน'}</SectionTitle>
              <TaskList tasks={tasks} today={today} onEdit={onEdit} />
            </div>
          );
        }
        if (part === 'groups' && hasGroups) {
          return (
            <div key={part}>
              <SectionTitle icon={Users}>อาจารย์ประจำกลุ่ม</SectionTitle>
              <GroupsView instructors={instructors} members={data.members} onOpen={setOpenIns} bare />
            </div>
          );
        }
        if (part === 'sessions' && sessions.length) {
          return (
            <div key={part}>
              <SectionTitle icon={CalendarCheck2}>{study ? 'คาบพบอาจารย์ / นำเสนอ' : 'คาบเรียน'}</SectionTitle>
              <SessionList sessions={sessions} today={today} docsByDate={docsByDate} onOpen={(date) => ui.go('classes', { date })} />
            </div>
          );
        }
        if (part === 'infos' && infos.length) {
          return (
            <div key={part}>
              <SectionTitle icon={Info}>{study ? 'แนวทางการเขียน / เกณฑ์' : 'ข้อมูลประกอบ'}</SectionTitle>
              <div className="space-y-3">
                {infos.map((item) => <InfoCard key={item.id} item={item} onEdit={onEdit} />)}
              </div>
            </div>
          );
        }
        return null;
      })}
      <InstructorSheet ins={instructors.find((x) => x.id === openIns) || null} onClose={() => setOpenIns(null)} />
    </div>
  );
}

/**
 * แท็บ "วิชา" (เมนูหลักสูตร): วิชาทั้งหมดตามตารางสอน แต่ละวิชาเก็บเอกสาร/สไลด์/ลิงก์ประกอบการสอนไว้รวมกัน
 * ค้นหาและกรองตามหมวดได้ — ทุกคนแนบไฟล์ (เก็บใน Google Drive แยกโฟลเดอร์ตามวิชา) หรือวางลิงก์ได้ (ขึ้นทันที)
 * ผู้เข้าอบรมแก้ไข/ลบได้เฉพาะเอกสารที่แนบจากเครื่องตัวเอง — แอดมินจัดการได้ทุกรายการ
 */
/** สิทธิ์จัดการเอกสาร: แอดมิน = ทุกรายการ, ผู้เข้าอบรม = แนบใหม่ + แก้ไข/ลบของเครื่องตัวเอง */
function useDocActions(setForm) {
  const { isAdmin, myDocs, deleteRecord, reorderRecords } = useStore();
  const ui = useUI();
  const toast = useToast();
  const mine = new Set(myDocs || []);
  return {
    deleteDoc: async (d) => {
      const what = d.file_id ? 'ไฟล์' : 'ลิงก์';
      const ok = await ui.confirm({ title: `ลบ${what}นี้?`, message: d.title, confirmText: `ลบ${what}`, danger: true });
      if (!ok) return;
      try {
        await deleteRecord('resources', d.id);
        toast.success(`ลบ${what}เรียบร้อย`);
      } catch (err) {
        toast.error(err.message);
      }
    },
    reorderDocs: isAdmin ? async (ids) => {
      try {
        await reorderRecords('resources', ids);
        toast.success('บันทึกลำดับเอกสารแล้ว');
      } catch (err) {
        toast.error(err.message);
      }
    } : undefined,
    edit: isAdmin ? (item) => setForm({ key: Date.now(), collection: 'resources', item }) : null,
    editDoc: (item) => setForm({ key: Date.now(), collection: 'resources', item, public: !isAdmin }),
    canEditDoc: (d) => isAdmin || mine.has(d.id),
    attach: (subject) => setForm({ key: Date.now(), collection: 'resources', item: { subject: subject || '', type: 'link' }, public: !isAdmin }),
  };
}

export function DocsPanel() {
  const { data, status } = useStore();
  const ui = useUI();
  const today = toISODate(useNow(60000));
  const [form, setForm] = useState(null);
  const [openKey, setOpenKey] = useState(() => (ui.view && ui.view.subject ? subjectKey(ui.view.subject) : ''));
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');

  const subjects = useMemo(
    () => buildSubjects(data.classes, data.resources || []).filter((x) => x.key !== subjectKey(FEATURED_SUBJECT)),
    [data.classes, data.resources],
  );
  const allDocs = useMemo(() => subjects.flatMap((x) => x.docs), [subjects]);
  const catCounts = useMemo(() => {
    const out = {};
    allDocs.forEach((d) => { const c = docCategory(d); out[c] = (out[c] || 0) + 1; });
    return out;
  }, [allDocs]);
  const { edit, editDoc, deleteDoc, reorderDocs, canEditDoc, attach } = useDocActions(setForm);
  const open = subjects.find((x) => x.key === openKey) || null;
  // จำว่ากำลังเปิดวิชาไหน (ย้อนกลับจากหน้าอื่นจะกลับมาที่วิชาเดิม)
  useEffect(() => { ui.remember({ tab: 'docs', subject: open ? open.name : '' }); }, [open && open.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const tokens = queryTokens(query);
  const filtering = tokens.length > 0 || cat !== 'all';

  if (status === 'loading') {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-16 w-full rounded-3xl" />)}
      </div>
    );
  }

  let body;
  if (open) {
    body = (
      <SubjectDetail
        subject={open}
        today={today}
        onEdit={edit}
        onAttach={attach}
        onEditDoc={editDoc}
        onDeleteDoc={deleteDoc}
        onReorderDocs={reorderDocs}
        canEditDoc={canEditDoc}
        onBack={() => {
          setOpenKey('');
          window.scrollTo(0, 0);
        }}
      />
    );
  } else if (!subjects.length) {
    body = <EmptyState icon={FolderOpen} title="ยังไม่มีรายวิชา" description="รายวิชาจะแสดงเมื่อมีตารางสอนหรือเอกสารในระบบ" />;
  } else {
    const docHits = filtering
      ? sortDocs(allDocs.filter((d) => (cat === 'all' || docCategory(d) === cat)
        && tokens.every((t) => normalize([d.title, d.detail, d.subject, d.topic, d.file_name].join(' ')).includes(t))))
      : [];
    const subjectHits = tokens.length ? subjects.filter((x) => tokens.every((t) => x.text.includes(t))) : subjects;
    body = (
      <>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาวิชา เอกสาร หรือสไลด์"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="ค้นหาวิชาหรือเอกสาร"
            className="glass h-12 w-full rounded-2xl pl-11 pr-10 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:ring-4 focus:ring-navy-500/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="ล้างคำค้น" className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
              <X className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
        {allDocs.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5" role="tablist" aria-label="หมวดเอกสาร">
            {[{ value: 'all', label: 'ทั้งหมด' }, ...DOC_CATEGORIES.filter((c) => catCounts[c.value])].map((c) => (
              <button
                key={c.value}
                type="button"
                role="tab"
                aria-selected={cat === c.value}
                onClick={() => setCat(c.value)}
                className={cx('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95', cat === c.value ? 'btn-navy text-white' : 'glass text-slate-600')}
              >
                {c.label}{c.value !== 'all' && <span className="ml-1 opacity-70 tabular-nums">{catCounts[c.value]}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="mb-2.5 mt-3 flex items-center justify-between gap-2 px-1">
          <p className="truncate text-[13px] text-slate-500">
            {filtering ? `พบเอกสาร ${docHits.length} รายการ` : `${subjects.length} วิชา · เอกสาร ${allDocs.length} รายการ`}
          </p>
          {attach && <AddButton onClick={() => attach('')} />}
        </div>

        {filtering && (docHits.length ? (
          <DocList docs={docHits} onEdit={editDoc} onDelete={deleteDoc} canEdit={canEditDoc} showSubject />
        ) : (
          <p className="glass rounded-3xl px-4 py-5 text-center text-[13px] text-slate-500">ไม่พบเอกสารที่ตรงกับคำค้น</p>
        ))}

        {cat === 'all' && subjectHits.length > 0 && (
          <div className={cx('space-y-2', filtering && 'mt-5')}>
            {filtering && <p className="px-1 text-[13px] font-semibold text-slate-500">วิชาที่ตรงกับคำค้น</p>}
            {subjectHits.map((x) => {
              const next = x.sessions.find((c) => c.class_date >= today);
              return (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => {
                    setOpenKey(x.key);
                    window.scrollTo(0, 0);
                  }}
                  className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left transition active:scale-[0.99]"
                >
                  <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', x.docs.length ? 'bg-navy-500/10 text-navy-700' : 'bg-slate-500/10 text-slate-400')}>
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-snug text-navy-900">{x.name}</span>
                    <span className="block truncate text-[12px] text-slate-500">
                      {x.sessions.length ? `${x.sessions.length} คาบ · ${next ? `ครั้งถัดไป ${formatDate(next.class_date, 'medium')}` : 'เรียนครบแล้ว'}` : 'ยังไม่มีในตารางสอน'}
                    </span>
                  </span>
                  {x.docs.length > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-navy-500/10 px-2 py-0.5 text-[12px] font-semibold text-navy-700" title="เอกสาร">
                      <Paperclip className="h-3.5 w-3.5" /> {x.docs.length}
                    </span>
                  )}
                  {x.tasks.length > 0 && (
                    <span className="shrink-0 rounded-full bg-gold-400/25 px-2 py-0.5 text-[12px] font-semibold text-gold-700" title="งานที่ต้องส่ง">งาน {x.tasks.length}</span>
                  )}
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {body}
      <RecordForm state={form} onClose={() => setForm(null)} />
    </div>
  );
}

/** แท็บ "เอกสารศึกษา": งานเขียนรายงานเชิงวิชาการรายบุคคล (คล้ายวิทยานิพนธ์) แยกจากวิชาปกติ */
export function StudyPanel() {
  const { data, status } = useStore();
  const today = toISODate(useNow(60000));
  const [form, setForm] = useState(null);
  const { edit, editDoc, deleteDoc, reorderDocs, canEditDoc, attach } = useDocActions(setForm);
  const subject = useMemo(() => {
    const found = buildSubjects(data.classes, data.resources || []).find((x) => x.key === subjectKey(FEATURED_SUBJECT));
    return found || { key: subjectKey(FEATURED_SUBJECT), name: FEATURED_SUBJECT, sessions: [], docs: [], tasks: [], infos: [], first: '' };
  }, [data.classes, data.resources]);
  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }
  return (
    <div>
      <SubjectDetail
        study
        subject={subject}
        today={today}
        onEdit={edit}
        onAttach={attach}
        onEditDoc={editDoc}
        onDeleteDoc={deleteDoc}
        onReorderDocs={reorderDocs}
        canEditDoc={canEditDoc}
      />
      <RecordForm state={form} onClose={() => setForm(null)} />
    </div>
  );
}

export default DocsPanel;
