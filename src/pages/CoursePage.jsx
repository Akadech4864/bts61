import { useMemo, useState } from 'react';
import { ChevronRight, GraduationCap, IdCard, Landmark, Lightbulb, Search, X } from 'lucide-react';
import { Photo } from '../components/Avatar';
import InstructorSheet from '../components/InstructorSheet';
import MoreMenuButton from '../components/MoreMenu';
import RecordForm from '../components/RecordForm';
import { EmptyState, PageHeader, Skeleton } from '../components/ui';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx, normalize } from '../lib/utils';
import { bySort, faceOf, parseProfile } from '../lib/course';
import { CourseInfoPanel } from './AboutPage';
import { InstructorsPanel } from './InstructorsPage';

const SUBTABS = [
  { value: 'info', label: 'ข้อมูลหลักสูตร', icon: Landmark },
  { value: 'instructors', label: 'รายชื่ออาจารย์', icon: GraduationCap },
  { value: 'profiles', label: 'ประวัติอาจารย์', icon: IdCard },
];

/** สรุปสั้นจากประวัติวิทยากร: วุฒิสูงสุด + ความเชี่ยวชาญ 2 รายการแรก */
function summaryOf(sections) {
  const edu = sections.find((s) => /การศึกษา/.test(s.title));
  const exp = sections.find((s) => /เชี่ยวชาญ/.test(s.title));
  const top = edu && edu.items[0];
  return {
    degree: top ? [top.label, top.text].filter(Boolean).join(' ') : '',
    expertise: exp ? exp.items.slice(0, 2).map((it) => it.label || it.text).join(' · ') : '',
    count: sections.reduce((n, s) => n + s.items.length, 0),
  };
}

/** ประวัติอาจารย์: รายชื่อพร้อมสรุปประวัติ แตะเพื่อเปิดประวัติวิทยากรฉบับเต็ม */
function ProfilesPanel() {
  const { data, status, isAdmin } = useStore();
  const [query, setQuery] = useState('');
  const [onlyFull, setOnlyFull] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null);

  const list = useMemo(
    () => [...(data.instructors || [])].sort(bySort).map((i) => {
      const sections = parseProfile(i.profile);
      return { ...i, sections, summary: summaryOf(sections), text: normalize([i.name, i.position, i.expertise, i.profile].join(' ')) };
    }),
    [data.instructors],
  );
  const tokens = normalize(query).split(' ').filter(Boolean);
  const shown = list.filter((i) => (!onlyFull || i.sections.length) && tokens.every((t) => i.text.includes(t)));
  const full = list.filter((i) => i.sections.length).length;
  const open = list.find((i) => i.id === openId) || null;

  if (status === 'loading') {
    return <div className="space-y-2.5">{[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-24 w-full rounded-3xl" />)}</div>;
  }
  if (!list.length) return <EmptyState icon={IdCard} title="ยังไม่มีข้อมูลอาจารย์" />;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อ ตำแหน่ง หรือความเชี่ยวชาญ"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="ค้นหาประวัติอาจารย์"
          className="glass h-12 w-full rounded-2xl pl-11 pr-10 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:ring-4 focus:ring-navy-500/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="ล้างคำค้น" className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      <div className="mb-2.5 mt-2 flex items-center justify-between gap-2 px-1">
        <p className="text-[13px] text-slate-500">
          อาจารย์ {list.length} ท่าน · มีประวัติโดยละเอียด {full} ท่าน
        </p>
        <button
          type="button"
          onClick={() => setOnlyFull((v) => !v)}
          aria-pressed={onlyFull}
          className={cx('h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold transition', onlyFull ? 'btn-navy text-white' : 'glass text-slate-600')}
        >
          เฉพาะที่มีประวัติ
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Search} title="ไม่พบอาจารย์ที่ตรงกับคำค้น" />
      ) : (
        <div className="space-y-2.5">
          {shown.map((ins) => (
            <button
              key={ins.id}
              type="button"
              onClick={() => setOpenId(ins.id)}
              className="glass flex w-full items-start gap-3 rounded-3xl p-3 text-left transition active:scale-[0.99]"
            >
              <Photo member={faceOf(ins)} width={240} className="aspect-[3/4] w-14 shrink-0 rounded-2xl object-[center_25%]" textClass="text-lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-snug text-navy-900">{ins.name}</span>
                {ins.position && <span className="block truncate text-xs text-slate-500">{ins.position}</span>}
                {ins.summary.degree && (
                  <span className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-snug text-slate-700">
                    <GraduationCap className="mt-px h-3.5 w-3.5 shrink-0 text-navy-400" /> {ins.summary.degree}
                  </span>
                )}
                {ins.summary.expertise && (
                  <span className="flex items-start gap-1.5 text-[12.5px] leading-snug text-slate-600">
                    <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0 text-gold-500" /> {ins.summary.expertise}
                  </span>
                )}
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {ins.sections.length ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-px text-[11px] font-semibold text-emerald-700">ประวัติวิทยากร {ins.sections.length} หัวข้อ</span>
                  ) : (
                    <span className="rounded-full bg-slate-500/10 px-2 py-px text-[11px] font-semibold text-slate-500">รอไฟล์ประวัติ</span>
                  )}
                  {ins.group_no && <span className="rounded-full bg-gold-400/25 px-2 py-px text-[11px] font-semibold text-gold-700">ประจำกลุ่ม {ins.group_no}</span>}
                </span>
              </span>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      <InstructorSheet
        ins={open}
        onClose={() => setOpenId(null)}
        onEdit={isAdmin && open ? () => { setOpenId(null); setForm({ key: Date.now(), collection: 'instructors', item: open }); } : null}
      />
      <RecordForm state={form} onClose={() => setForm(null)} />
    </div>
  );
}

/** เมนูหลักสูตร: ข้อมูลหลักสูตร / รายชื่ออาจารย์ / ประวัติอาจารย์ */
export default function CoursePage() {
  const ui = useUI();
  const initial = ui.view && SUBTABS.some((s) => s.value === ui.view.tab) ? ui.view.tab : 'info';
  const [tab, setTab] = useState(initial);
  const [mode, setMode] = useState((ui.view && ui.view.mode) || '');
  const go = (next, nextMode = '') => {
    setMode(nextMode);
    setTab(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader eyebrow="Course" title="หลักสูตร" right={<MoreMenuButton />} />
      <div className="mb-3 grid grid-cols-3 gap-1.5" role="tablist" aria-label="หัวข้อในเมนูหลักสูตร">
        {SUBTABS.map((s) => {
          const active = s.value === tab;
          const Icon = s.icon;
          return (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => go(s.value)}
              className={cx(
                'flex h-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[12.5px] font-semibold leading-tight transition active:scale-[0.97]',
                active ? 'btn-navy text-white' : 'glass text-navy-800',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 2} />
              {s.label}
            </button>
          );
        })}
      </div>

      {tab === 'info' && <CourseInfoPanel onTab={go} />}
      {tab === 'instructors' && <InstructorsPanel key={mode || 'default'} initialMode={mode} />}
      {tab === 'profiles' && <ProfilesPanel />}
    </div>
  );
}
