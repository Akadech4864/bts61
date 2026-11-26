import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, GraduationCap, Pencil, Phone, Plus, UserRound, Users } from 'lucide-react';
import { Photo } from '../components/Avatar';
import { Sheet } from '../components/Sheet';
import { Button, EmptyState, PageHeader, Segmented, Skeleton, TopBarSentinel } from '../components/ui';
import RecordForm from '../components/RecordForm';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { compareClass, cx, formatDate, phoneDigits, formatPhone, telHref, thCompare, toArabicDigits } from '../lib/utils';
import {
  bySort, compareCode, faceOf, isLead, NON_SUBJECTS, parseLinks, parseSubjects, speakerKey, subjectTitle,
} from '../lib/course';

const MODES = [
  { value: 'subjects', label: 'รายวิชา' },
  { value: 'groups', label: 'ประจำกลุ่ม' },
  { value: 'speakers', label: 'ผู้บรรยาย' },
];

function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-500/10 text-slate-600',
    gold: 'bg-gold-400/25 text-gold-700',
    navy: 'bg-navy-500/10 text-navy-700',
    violet: 'bg-violet-500/15 text-violet-700',
  };
  return <span className={cx('inline-flex shrink-0 items-center rounded-full px-2 py-px text-[11px] font-semibold leading-5', tones[tone])}>{children}</span>;
}

function InstructorRow({ ins, role, onOpen, compact = false }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(ins.id)}
      className={cx('flex w-full items-center gap-3 text-left transition active:scale-[0.99]', compact ? 'py-2' : 'glass rounded-3xl p-2.5')}
    >
      <Photo member={faceOf(ins)} width={240} className="h-14 w-14 shrink-0 rounded-2xl object-[center_25%]" textClass="text-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold leading-snug text-navy-900">{ins.name}</span>
        {ins.position && <span className="block truncate text-xs text-slate-500">{ins.position}</span>}
        <span className="mt-1 flex flex-wrap gap-1">
          {role && <Badge tone={isLead(role) ? 'gold' : 'navy'}>{role}</Badge>}
          {ins.kind === 'e' && !(role || '').includes('พิเศษ') && <Badge tone="violet">อาจารย์พิเศษ</Badge>}
          {!compact && ins.group_no && <Badge>ประจำกลุ่ม {ins.group_no}</Badge>}
        </span>
      </span>
    </button>
  );
}

/* ------------------------------ รายละเอียดอาจารย์ ------------------------------ */

function InstructorSheet({ ins, onClose, onEdit }) {
  if (!ins) return null;
  const links = parseLinks(ins.links);
  return (
    <Sheet open onClose={onClose} title="ข้อมูลอาจารย์">
      <div className="space-y-4 pb-5">
        <div className="flex gap-4">
          <Photo member={faceOf(ins)} width={400} eager className="aspect-[3/4] w-28 shrink-0 rounded-3xl object-[center_25%] shadow-[0_10px_24px_-12px_rgb(11_28_54/0.5)] ring-2 ring-white" textClass="text-4xl" />
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-lg font-bold leading-snug text-navy-900">{ins.name}</h3>
            {ins.position && <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{ins.position}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={ins.kind === 'e' ? 'violet' : 'navy'}>{ins.kind === 'e' ? 'อาจารย์พิเศษ' : 'อาจารย์ประจำ'}</Badge>
              {ins.group_no && <Badge tone="gold">อาจารย์ประจำกลุ่ม {ins.group_no}</Badge>}
            </div>
          </div>
        </div>

        {(ins.expertise || ins.education) && (
          <div className="glass divide-y divide-white/70 rounded-3xl px-4">
            {ins.expertise && (
              <div className="py-3">
                <p className="text-xs text-slate-500">หัวข้อ / ความเชี่ยวชาญ</p>
                <p className="text-[15px] leading-snug text-slate-800">{toArabicDigits(ins.expertise)}</p>
              </div>
            )}
            {ins.education && (
              <div className="py-3">
                <p className="text-xs text-slate-500">วุฒิการศึกษา</p>
                <p className="text-[15px] leading-snug text-slate-800">{toArabicDigits(ins.education)}</p>
              </div>
            )}
          </div>
        )}

        {ins.subjectList.length > 0 && (
          <div className="glass rounded-3xl px-4 py-3">
            <p className="mb-1.5 text-xs text-slate-500">วิชาที่สอนในหลักสูตร ({ins.subjectList.length} วิชา)</p>
            <ul className="space-y-2">
              {ins.subjectList.map((s) => (
                <li key={s.name} className="flex items-start gap-2 text-[14px] leading-snug text-slate-800">
                  <span className="mt-0.5 min-w-9 shrink-0 rounded-md bg-navy-500/10 px-1.5 text-center text-[11px] font-semibold leading-5 text-navy-700">{s.code || '•'}</span>
                  <span className="min-w-0 flex-1">
                    {subjectTitle(s)}
                    {s.role && <span className={cx('ml-1 text-[12px]', isLead(s.role) ? 'font-semibold text-gold-700' : 'text-slate-500')}>({s.role})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(links.length > 0 || phoneDigits(ins.phone)) && (
          <div className="grid gap-2">
            {phoneDigits(ins.phone) && (
              <a href={telHref(ins.phone)} className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white">
                <Phone className="h-[18px] w-[18px]" /> โทร {formatPhone(ins.phone)}
              </a>
            )}
            {links.map((l, i) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[0.98]',
                  i === 0 ? 'btn-navy text-white' : 'glass text-navy-800',
                )}
              >
                <ExternalLink className="h-[18px] w-[18px]" /> {l.label}
              </a>
            ))}
          </div>
        )}

        {onEdit && (
          <Button variant="secondary" icon={Pencil} className="w-full" onClick={onEdit}>
            แก้ไขข้อมูลอาจารย์
          </Button>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------ มุมมอง: รายวิชา ------------------------------ */

function SubjectsView({ instructors, subjects, selected, onOpen }) {
  if (selected === 'all') {
    return (
      <div className="space-y-2.5">
        <p className="px-1 text-[13px] text-slate-500">อาจารย์ทั้งหมด {instructors.length} ท่าน · แตะชื่อวิชาด้านบนเพื่อดูอาจารย์ของแต่ละวิชา</p>
        {instructors.map((ins) => (
          <InstructorRow key={ins.id} ins={ins} onOpen={onOpen} role={ins.subjectList.length ? `สอน ${ins.subjectList.length} วิชา` : ''} />
        ))}
      </div>
    );
  }
  const subject = subjects.find((s) => s.name === selected);
  if (!subject) return null;
  return (
    <div className="space-y-2.5">
      <div className="glass-dark rounded-3xl p-4">
        <p className="text-xs font-semibold text-gold-300">{subject.code ? `วิชา ${subject.code}` : 'วิชา'}</p>
        <h2 className="mt-0.5 text-lg font-bold leading-snug">{subjectTitle(subject)}</h2>
        <p className="mt-1 text-[13px] text-white/70">อาจารย์ {subject.people.length} ท่าน</p>
      </div>
      {subject.people.map(({ ins, role }) => (
        <InstructorRow key={ins.id} ins={ins} role={role} onOpen={onOpen} />
      ))}
    </div>
  );
}

/* ------------------------------ มุมมอง: อาจารย์ประจำกลุ่ม ------------------------------ */

function GroupsView({ instructors, members, onOpen }) {
  const groups = useMemo(() => {
    const map = new Map();
    instructors.forEach((ins) => {
      const g = Number(ins.group_no);
      if (!g) return;
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(ins);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [instructors]);
  const memberCount = useMemo(() => {
    const out = {};
    members.forEach((m) => {
      const g = Number(toArabicDigits(m.group_name).replace(/\D/g, ''));
      if (g) out[g] = (out[g] || 0) + 1;
    });
    return out;
  }, [members]);

  if (!groups.length) {
    return <EmptyState icon={Users} title="ยังไม่มีข้อมูลอาจารย์ประจำกลุ่ม" description="ผู้ดูแลระบบกำหนดกลุ่มได้ที่ข้อมูลของอาจารย์แต่ละท่าน" />;
  }
  return (
    <div className="space-y-3">
      <div className="glass-dark rounded-3xl p-4">
        <p className="text-xs font-semibold text-gold-300">วิชาเอกสารศึกษา</p>
        <h2 className="mt-0.5 text-lg font-bold leading-snug">อาจารย์ประจำกลุ่ม</h2>
        <p className="mt-1 text-[13px] text-white/70">{groups.length} กลุ่ม · กลุ่มละ {Math.max(...groups.map(([, list]) => list.length))} ท่าน</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(([g, list]) => (
          <section key={g} className="glass rounded-3xl px-4 pb-2 pt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
                <span className="grid h-8 w-8 place-items-center rounded-full btn-navy text-sm text-white tabular-nums">{g}</span>
                กลุ่มที่ {g}
              </h3>
              {memberCount[g] > 0 && <span className="text-xs text-slate-500">ผู้เข้าอบรม {memberCount[g]} คน</span>}
            </div>
            <div className="mt-1 divide-y divide-white/70">
              {list.map((ins) => (
                <InstructorRow key={ins.id} ins={ins} onOpen={onOpen} compact />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ มุมมอง: ผู้บรรยายตามตารางสอน ------------------------------ */

function SpeakersView({ classes, onDate }) {
  const subjects = useMemo(() => {
    const map = new Map();
    [...classes].sort(compareClass).forEach((c) => {
      if (NON_SUBJECTS.test(c.subject) || (!c.speaker && !c.secretary)) return;
      if (!map.has(c.subject)) map.set(c.subject, { subject: c.subject, first: c.class_date, speakers: new Map(), secretaries: new Set() });
      const entry = map.get(c.subject);
      if (c.speaker) {
        const key = speakerKey(c.speaker);
        if (!entry.speakers.has(key)) entry.speakers.set(key, []);
        const dates = entry.speakers.get(key);
        if (!dates.some((d) => d.date === c.class_date)) dates.push({ date: c.class_date, topic: c.topic });
      }
      if (c.secretary) entry.secretaries.add(c.secretary);
    });
    return [...map.values()];
  }, [classes]);

  if (!subjects.length) {
    return <EmptyState icon={UserRound} title="ยังไม่มีรายชื่อผู้บรรยาย" description="รายชื่อจะแสดงเมื่อตารางสอนระบุผู้บรรยาย" />;
  }
  return (
    <div className="space-y-3">
      <p className="px-1 text-[13px] leading-snug text-slate-500">ดึงจากตารางสอนอัตโนมัติ · วิชาที่ยังไม่ประกาศชื่อผู้บรรยายจะแสดงเมื่อมีตารางรายสัปดาห์ · แตะวันที่เพื่อเปิดตารางสอนวันนั้น</p>
      {subjects.map((s) => (
        <section key={s.subject} className="glass rounded-3xl p-4">
          <h3 className="flex items-start gap-2 text-[15px] font-bold leading-snug text-navy-900">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> {s.subject}
          </h3>
          <ul className="mt-2.5 space-y-2.5">
            {[...s.speakers.entries()].map(([name, dates]) => (
              <li key={name}>
                <p className="flex items-start gap-2 text-[14px] font-semibold leading-snug text-slate-800">
                  <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5 pl-5">
                  {dates.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => onDate(d.date)}
                      title={d.topic || undefined}
                      className="rounded-full bg-navy-500/10 px-2.5 py-0.5 text-[12px] font-medium text-navy-700 transition hover:bg-navy-500/15 active:scale-95"
                    >
                      {formatDate(d.date, 'medium')}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {s.secretaries.size > 0 && (
            <p className="mt-3 border-t border-white/70 pt-2 text-[12px] leading-snug text-slate-500">
              <span className="font-semibold text-slate-600">เลขาฯวิชา:</span> {[...s.secretaries].join(' · ')}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------ หน้าอาจารย์ ------------------------------ */

export default function InstructorsPage() {
  const { data, status, isAdmin } = useStore();
  const ui = useUI();
  const [mode, setMode] = useState(() => (ui.view && MODES.some((m) => m.value === ui.view.mode) ? ui.view.mode : 'subjects'));
  const [selected, setSelected] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null);

  const instructors = useMemo(
    () => [...(data.instructors || [])].sort(bySort).map((i) => ({ ...i, subjectList: parseSubjects(i.subjects) })),
    [data.instructors],
  );
  const subjects = useMemo(() => {
    const map = new Map();
    instructors.forEach((ins) => ins.subjectList.forEach((s) => {
      if (!map.has(s.name)) map.set(s.name, { ...s, people: [] });
      map.get(s.name).people.push({ ins, role: s.role });
    }));
    const list = [...map.values()];
    list.forEach((s) => s.people.sort((a, b) => Number(isLead(b.role)) - Number(isLead(a.role))));
    return list.sort((a, b) => compareCode(a.code || '999', b.code || '999') || thCompare(a.name, b.name));
  }, [instructors]);

  const open = instructors.find((i) => i.id === openId) || null;
  const loading = status === 'loading';
  const showSubject = selected !== 'all' && subjects.some((s) => s.name === selected) ? selected : 'all';

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader
        eyebrow="Instructors"
        title="อาจารย์"
        right={
          isAdmin ? (
            <Button size="sm" icon={Plus} onClick={() => setForm({ key: Date.now(), collection: 'instructors', item: null })} className="shrink-0">
              เพิ่มอาจารย์
            </Button>
          ) : null
        }
      />

      <TopBarSentinel />
      <div className="topbar sticky-glass sticky top-0 z-20 -mx-4 px-4 py-2">
        <Segmented value={mode} onChange={setMode} options={MODES} className="w-full [&>button]:flex-1" />
        {mode === 'subjects' && subjects.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5" role="tablist" aria-label="รายวิชา">
            {[{ name: 'all', label: 'ทั้งหมด', count: instructors.length }, ...subjects.map((s) => ({ name: s.name, label: s.name, count: s.people.length }))].map((s) => {
              const active = showSubject === s.name;
              return (
                <button
                  key={s.name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(s.name)}
                  className={cx(
                    'inline-flex h-9 max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition active:scale-95',
                    active ? 'btn-navy text-white' : 'glass text-slate-700',
                  )}
                >
                  <span className="truncate">{s.label}</span>
                  <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20' : 'bg-navy-500/10 text-navy-700')}>{s.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)}
          </div>
        ) : mode === 'speakers' ? (
          <SpeakersView classes={data.classes} onDate={(date) => ui.go('classes', { date })} />
        ) : !instructors.length ? (
          <EmptyState icon={GraduationCap} title="ยังไม่มีข้อมูลอาจารย์" description={isAdmin ? 'กด "เพิ่มอาจารย์" เพื่อเริ่มกรอกข้อมูล' : 'ผู้ดูแลระบบกำลังเพิ่มข้อมูล'} />
        ) : mode === 'groups' ? (
          <GroupsView instructors={instructors} members={data.members} onOpen={setOpenId} />
        ) : (
          <SubjectsView instructors={instructors} subjects={subjects} selected={showSubject} onOpen={setOpenId} />
        )}
      </div>

      <InstructorSheet
        ins={open}
        onClose={() => setOpenId(null)}
        onEdit={isAdmin && open ? () => { setOpenId(null); setForm({ key: Date.now(), collection: 'instructors', item: open }); } : null}
      />
      <RecordForm state={form} onClose={() => setForm(null)} />
    </div>
  );
}
