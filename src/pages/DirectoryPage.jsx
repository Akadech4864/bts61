import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, CircleCheck, IdCard, LayoutGrid, Phone, RefreshCw, Search, SlidersHorizontal, Table2, UserPlus, X } from 'lucide-react';
import { Photo } from '../components/Avatar';
import { EmptyState, Segmented, Skeleton } from '../components/ui';
import MemberSuggest from '../components/MemberSuggest';
import FilterSheet, { SORT_OPTIONS } from '../components/FilterSheet';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { COURSE_SHORT, COURSE_SUBTITLE } from '../config';
import {
  cx, formatPhone, fullName, guessMembers, matchMember, missingInfo, nickOf, orgLine, orgTypeOf, phoneDigits, queryTokens,
  telHref, thCompare, useBreakpoint, usePersistentState,
} from '../lib/utils';

// scope: ตัวกรองนี้ใช้กับใคร — police = ตำรวจ, other = หน่วยงานอื่น, all = ทุกคน
const FACETS = [
  { key: 'bureau_bch', label: 'บช. (กองบัญชาการ)', short: 'บช.', scope: 'police' },
  { key: 'division_bk', label: 'บก. (กองบังคับการ)', short: 'บก.', scope: 'police' },
  { key: 'agency', label: 'หน่วยงาน', short: 'หน่วยงาน', scope: 'other' },
  { key: 'province', label: 'จังหวัด', short: 'จังหวัด', scope: 'all' },
];
const NO_FILTERS = { bureau_bch: [], division_bk: [], province: [], agency: [] };
const ORG_LABELS = { all: 'ทั้งหมด', police: 'ตำรวจ', other: 'หน่วยงานอื่น' };

const VIEWS = [
  { value: 'grid', icon: LayoutGrid, title: 'มุมมองกริดรูปภาพ' },
  { value: 'list', icon: IdCard, title: 'มุมมองการ์ดรายชื่อ' },
  { value: 'table', icon: Table2, title: 'มุมมองตาราง' },
];

// จำนวนคอลัมน์ของกริดตามขนาดจอ (ผู้ใช้เลือกระดับ 0–3)
const GRID_COLS = { sm: [2, 3, 4, 5], md: [4, 5, 6, 7], lg: [5, 6, 8, 10] };

function compareBy(sort) {
  const dir = sort.dir === 'desc' ? -1 : 1;
  return (a, b) => {
    let r = 0;
    if (sort.key === 'seq') {
      r = (Number(a.seq) || 99999) - (Number(b.seq) || 99999);
    } else {
      const va = a[sort.key] || '';
      const vb = b[sort.key] || '';
      if (!va !== !vb) return va ? -1 : 1; // ค่าว่างอยู่ท้ายเสมอ
      r = thCompare(va, vb);
    }
    return r * dir || (Number(a.seq) || 99999) - (Number(b.seq) || 99999) || thCompare(a.first_name, b.first_name);
  };
}

/* ------------------------------ หัวข้อแบ่งกลุ่ม (ข้อมูลยังไม่ครบ / ครบแล้ว) ------------------------------ */

const SHORT_MISSING = { 'ชื่อเล่น': 'ชื่อเล่น', 'เบอร์โทร': 'เบอร์', 'รูปถ่าย': 'รูป' };

function SectionHeading({ tone, title, count, note }) {
  const warn = tone === 'warn';
  const Icon = warn ? CircleAlert : CircleCheck;
  return (
    <div className="mb-2.5 flex items-start gap-2.5">
      <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', warn ? 'bg-amber-400/25 text-amber-600' : 'bg-emerald-500/15 text-emerald-600')}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold leading-snug text-navy-900">
          {title} <span className="font-medium tabular-nums text-slate-400">{count} คน</span>
        </h2>
        {note && <p className="text-xs leading-snug text-slate-500">{note}</p>}
      </div>
    </div>
  );
}

/* ------------------------------ มุมมองกริดรูปภาพ ------------------------------ */

function GridView({ members, cols, onOpen, flagMissing = false }) {
  const gridRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(() => Math.min(window.innerWidth, 1152) - 32);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const measure = () => setGridWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ขนาดตัวหนังสือปรับตามความกว้างจริงของการ์ด: การ์ดยิ่งเล็ก ข้อความยิ่งกระชับ
  const cardWidth = (gridWidth - 8 * (cols - 1)) / cols;
  const dense = cardWidth >= 150 ? 0 : cardWidth >= 100 ? 1 : cardWidth >= 76 ? 2 : 3;
  const nickSize = ['text-lg', 'text-[15px]', 'text-[12px]', 'text-[10px]'][dense];
  // ป้ายชื่อแบบมินิมอล: แถบไล่สีจากโปร่งใสเป็นกรมท่าที่ขอบล่าง ไม่มีกรอบ
  const label = [
    'name-fade inset-x-0 bottom-0 px-3.5 pb-3 pt-12',
    'name-fade inset-x-0 bottom-0 px-2.5 pb-2 pt-9',
    'name-fade inset-x-0 bottom-0 px-1.5 pb-1.5 pt-6',
    'name-fade inset-x-0 bottom-0 px-1 pb-1 pt-5',
  ][dense];
  const width = cardWidth >= 150 ? 500 : cardWidth >= 90 ? 320 : 220;
  return (
    <div ref={gridRef} className="photo-grid" style={{ '--cols': cols, '--gap': dense >= 2 ? '6px' : '10px' }}>
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onOpen(m.id)}
          className={cx(
            'group relative overflow-hidden bg-white/40 text-left shadow-[0_10px_24px_-12px_rgb(11_28_54/0.45)] ring-1 ring-white/70 transition active:scale-[0.97]',
            dense >= 2 ? 'rounded-xl' : 'rounded-3xl',
          )}
        >
          <Photo member={m} width={width} className="aspect-[3/4] w-full transition duration-300 group-hover:scale-[1.03]" textClass={['text-6xl', 'text-4xl', 'text-3xl', 'text-2xl'][dense]} />
          {flagMissing && (
            dense >= 2 ? (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" title={`ยังขาด ${missingInfo(m).join(' ')}`} />
            ) : (
              <span className="absolute inset-x-1.5 top-1.5 flex flex-wrap gap-1" title={`ยังขาด ${missingInfo(m).join(' ')}`}>
                {missingInfo(m).map((k) => (
                  <span key={k} className={cx('rounded-full bg-amber-400/95 font-semibold leading-tight text-navy-950 shadow-sm', dense ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-[11px]')}>
                    {dense ? SHORT_MISSING[k] : `ขาด${k}`}
                  </span>
                ))}
              </span>
            )
          )}
          <div className={cx('absolute', label)}>
            {/* ชื่อเล่นตัวใหญ่ + ชื่อจริง (ถ้ายังไม่มีชื่อเล่น แสดงชื่อจริงตัวใหญ่อย่างเดียว) */}
            <p className={cx('truncate font-bold leading-tight text-white drop-shadow', nickSize)}>{nickOf(m)}</p>
            {m.nickname && (
              <p className={cx('truncate leading-tight text-white/85', ['mt-0.5 text-sm', 'text-[12px]', 'text-[10px]', 'text-[9px]'][dense])}>
                {m.first_name}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ มุมมองการ์ดรายชื่อ ------------------------------ */

function ListView({ members, onOpen, flagMissing = false }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {members.map((m) => (
        <div key={m.id} className="glass flex items-center gap-3 rounded-3xl p-2.5">
          <button type="button" onClick={() => onOpen(m.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Photo member={m} width={160} className="h-[72px] w-[54px] shrink-0 rounded-xl" textClass="text-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-bold leading-tight text-navy-900">{nickOf(m)}</span>
              <span className="block truncate text-sm text-slate-700">{fullName(m)}</span>
              {m.position && <span className="block truncate text-xs text-slate-500">{m.position}</span>}
              {orgLine(m) && <span className="block truncate text-xs text-slate-400">{orgLine(m)}</span>}
              {flagMissing && (
                <span className="mt-1 inline-block max-w-full truncate rounded-full bg-amber-400/25 px-2 py-px text-[11px] font-semibold text-amber-700">
                  ยังขาด {missingInfo(m).join(' · ')}
                </span>
              )}
            </span>
          </button>
          {phoneDigits(m.phone) ? (
            <a
              href={telHref(m.phone)}
              aria-label={`โทรหา ${nickOf(m)}`}
              className="btn-navy grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition active:scale-95"
            >
              <Phone className="h-5 w-5" />
            </a>
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/40 text-slate-300" title="ยังไม่มีเบอร์โทร">
              <Phone className="h-5 w-5" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ มุมมองตาราง ------------------------------ */

const TABLE_COLUMNS = [
  { key: 'first_name', label: 'ชื่อ-สกุล' },
  { key: 'nickname', label: 'ชื่อเล่น' },
  { key: 'province', label: 'จังหวัด' },
  { key: 'division_bk', label: 'บก.' },
  { key: 'bureau_bch', label: 'บช.' },
];

function SortHeader({ column, sort, onSort, className }) {
  const active = sort.key === column.key;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={cx('whitespace-nowrap px-3 py-2.5 text-left font-semibold', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort({ key: column.key, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
        className={cx('inline-flex items-center gap-1 transition', active ? 'text-navy-900' : 'text-slate-500 hover:text-navy-800')}
      >
        {column.label}
        <Icon className={cx('h-3.5 w-3.5', !active && 'opacity-50')} />
      </button>
    </th>
  );
}

/** sections: [{ key, title, note, tone, flag, members }] — มีหลายกลุ่มจะคั่นด้วยแถวหัวข้อ */
function TableView({ sections, sort, onSort, onOpen }) {
  return (
    <div className="glass overflow-x-auto rounded-3xl">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead className="bg-white/50 text-xs">
          <tr>
            <SortHeader column={{ key: 'seq', label: '#' }} sort={sort} onSort={onSort} className="w-12 pl-3 pr-1" />
            <SortHeader column={TABLE_COLUMNS[0]} sort={sort} onSort={onSort} className="sticky left-0 z-10 bg-[#f3f6fb]" />
            {TABLE_COLUMNS.slice(1).map((c) => (
              <SortHeader key={c.key} column={c} sort={sort} onSort={onSort} />
            ))}
            <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-500">โทร</th>
          </tr>
        </thead>
        {sections.map((section) => (
        <tbody key={section.key} className="divide-y divide-white/70">
          {sections.length > 1 && (
            <tr>
              <td colSpan={7} className={cx('px-3 py-2', section.tone === 'warn' ? 'bg-amber-400/15' : 'bg-emerald-500/10')}>
                <span className="sticky left-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-navy-900">
                  {section.tone === 'warn' ? <CircleAlert className="h-4 w-4 text-amber-600" /> : <CircleCheck className="h-4 w-4 text-emerald-600" />}
                  {section.title}
                  <span className="font-medium tabular-nums text-slate-400">{section.members.length} คน</span>
                </span>
              </td>
            </tr>
          )}
          {section.members.map((m) => (
            <tr key={m.id} onClick={() => onOpen(m.id)} className="group cursor-pointer transition hover:bg-white/60">
              <td className="pl-3 pr-1 text-slate-400 tabular-nums">{m.seq}</td>
              <td className="sticky left-0 z-[1] max-w-[46vw] bg-[#f3f6fb] px-3 py-2 transition group-hover:bg-white sm:max-w-none">
                <button type="button" className="flex w-full items-center gap-2.5 text-left">
                  <Photo member={m} width={96} className="h-9 w-9 shrink-0 rounded-lg" textClass="text-sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900">{[m.first_name, m.last_name].filter(Boolean).join(' ')}</span>
                    {section.flag ? (
                      <span className="block truncate text-[11px] font-semibold text-amber-700">ยังขาด {missingInfo(m).join(' · ')}</span>
                    ) : (
                      <span className="block truncate text-[11px] text-slate-400">{m.rank}</span>
                    )}
                  </span>
                </button>
              </td>
              <td className="whitespace-nowrap px-3 font-semibold text-navy-800">{m.nickname || <span className="font-normal text-slate-300">—</span>}</td>
              <td className="whitespace-nowrap px-3 text-slate-600">{m.province || <span className="text-slate-300">—</span>}</td>
              {orgTypeOf(m) === 'other' ? (
                // ผู้ที่ไม่ใช่ตำรวจ: แสดงชื่อหน่วยงานแทนช่อง บก./บช.
                <td colSpan={2} className="whitespace-nowrap px-3 text-slate-600">
                  <span className="mr-1.5 rounded-md bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold-700">หน่วยงาน</span>
                  {m.agency || <span className="text-slate-300">ยังไม่ระบุ</span>}
                </td>
              ) : (
                <>
                  <td className="whitespace-nowrap px-3 text-slate-600">{m.division_bk || <span className="text-slate-300">—</span>}</td>
                  <td className="whitespace-nowrap px-3 text-slate-600">{m.bureau_bch || <span className="text-slate-300">—</span>}</td>
                </>
              )}
              <td className="whitespace-nowrap px-3">
                {phoneDigits(m.phone) ? (
                  <a href={telHref(m.phone)} onClick={(e) => e.stopPropagation()} className="font-medium text-navy-700 underline-offset-2 hover:underline">
                    {formatPhone(m.phone)}
                  </a>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        ))}
      </table>
    </div>
  );
}

function LoadingGrid({ cols }) {
  return (
    <div className="photo-grid" style={{ '--cols': cols }}>
      {Array.from({ length: cols * 4 }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] w-full" />
      ))}
    </div>
  );
}

/* ------------------------------ หน้าทำเนียบรุ่น ------------------------------ */

export default function DirectoryPage() {
  const { data, status, error, syncing, refresh, can } = useStore();
  const ui = useUI();
  const bp = useBreakpoint();

  const [view, setView] = usePersistentState('bts61:view', 'grid');
  const [density, setDensity] = usePersistentState('bts61:grid-density', 1);
  const [sort, setSort] = usePersistentState('bts61:sort', { key: 'seq', dir: 'asc' });
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const cols = GRID_COLS[bp][Math.min(Math.max(Number(density) || 0, 0), 3)];
  const members = data.members;
  const tokens = useMemo(() => queryTokens(query), [query]);

  const [org, setOrgState] = useState('all'); // all | police | other

  const { result, facets, orgCounts } = useMemo(() => {
    const typeOf = new Map(members.map((m) => [m.id, orgTypeOf(m)]));
    const inScope = (m, scope) => scope === 'all' || typeOf.get(m.id) === scope;
    // except: ข้ามตัวกรองหมวดนี้ (ใช้นับจำนวนในตัวเลือก) / 'org' = ข้ามตัวเลือกประเภท
    const passes = (m, except) =>
      (except === 'org' || org === 'all' || typeOf.get(m.id) === org) &&
      FACETS.every((f) => f.key === except || !filters[f.key].length || filters[f.key].includes(m[f.key]));
    const searched = members.filter((m) => matchMember(m, tokens));
    const filtered = searched.filter((m) => passes(m)).sort(compareBy(sort));
    const counts3 = { all: 0, police: 0, other: 0 };
    searched.forEach((m) => {
      if (!passes(m, 'org')) return;
      counts3.all += 1;
      counts3[typeOf.get(m.id)] += 1;
    });
    // ตัวเลือกแต่ละหมวดดึงจากข้อมูลจริง เฉพาะกลุ่มที่เกี่ยวข้อง (บก./บช. = ตำรวจ, หน่วยงาน = คนที่ไม่ใช่ตำรวจ)
    const facetData = FACETS.filter((f) => f.scope === 'all' || org === 'all' || f.scope === org).map((f) => {
      const counts = new Map();
      members.forEach((m) => { if (m[f.key] && inScope(m, f.scope)) counts.set(m[f.key], 0); });
      searched.forEach((m) => {
        if (m[f.key] && inScope(m, f.scope) && passes(m, f.key)) counts.set(m[f.key], (counts.get(m[f.key]) || 0) + 1);
      });
      const options = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => thCompare(a.value, b.value));
      return { ...f, options };
    });
    return { result: filtered, facets: facetData, orgCounts: counts3 };
  }, [members, tokens, filters, sort, org]);

  /** เปลี่ยนประเภท แล้วล้างตัวกรองของหมวดที่ไม่เกี่ยวข้อง (เช่น เลือก "หน่วยงานอื่น" จะล้าง บก./บช.) */
  const setOrg = (next) => {
    setOrgState(next);
    setFilters((prev) => {
      const out = { ...prev };
      FACETS.forEach((f) => { if (f.scope !== 'all' && next !== 'all' && f.scope !== next) out[f.key] = []; });
      return out;
    });
  };

  // แบ่งกลุ่ม: คนที่ยังขาด ชื่อเล่น/เบอร์โทร/รูปถ่าย ขึ้นก่อน — เมื่อทุกคนกรอกครบ ตัวแบ่งจะหายไปเอง
  const sections = useMemo(() => {
    const pending = [];
    const complete = [];
    result.forEach((m) => (missingInfo(m).length ? pending : complete).push(m));
    if (!pending.length) return [{ key: 'all', members: result }];
    const out = [{
      key: 'pending',
      tone: 'warn',
      flag: true,
      title: 'ยังกรอกข้อมูลไม่ครบ',
      note: can.edit || can.photo
        ? 'ชื่อเล่น เบอร์โทร หรือรูปถ่าย ยังไม่ครบ · แตะที่ชื่อตัวเอง แล้วกด "แก้ไขข้อมูล" เพื่อเพิ่มได้เลย'
        : 'ชื่อเล่น เบอร์โทร หรือรูปถ่าย ยังไม่ครบ · แจ้งข้อมูลกับผู้ดูแลรุ่นเพื่อเพิ่มให้',
      members: pending,
    }];
    if (complete.length) out.push({ key: 'complete', tone: 'ok', title: 'ข้อมูลครบแล้ว', members: complete });
    return out;
  }, [result, can.edit, can.photo]);

  const activeFilters = FACETS.flatMap((f) => filters[f.key].map((value) => ({ key: f.key, short: f.short, value })));
  const activeCount = activeFilters.length + (org !== 'all' ? 1 : 0);
  const suggestions = useMemo(
    () => (searchFocused && query.trim() ? guessMembers(members, query, 5) : []),
    [searchFocused, query, members],
  );

  const toggleFilter = (key, value) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  const clearAll = () => {
    setFilters(NO_FILTERS);
    setOrgState('all');
    setQuery('');
  };

  const loading = status === 'loading';
  const sortLabel = (SORT_OPTIONS.find((o) => o.key === sort.key) || SORT_OPTIONS[0]).label;

  return (
    <div className="mx-auto max-w-6xl px-4 page-bottom">
      <header className="pt-safe">
        <div className="flex items-center gap-3 pb-3 pt-5">
          <img src="./logo.jpg" alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover shadow-[0_6px_16px_-6px_rgb(11_28_54/0.4)] ring-2 ring-white/80" />
          <div className="min-w-0 flex-1">
            <h1 className="text-balance text-lg font-bold leading-snug tracking-tight text-navy-900 sm:text-2xl">{COURSE_SUBTITLE}</h1>
            <p className="truncate text-xs font-semibold tracking-wide text-gold-600">ทำเนียบรุ่น · {COURSE_SHORT}</p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            aria-label="รีเฟรชข้อมูล"
            className="glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-navy-700 transition active:scale-95"
          >
            <RefreshCw className={cx('h-5 w-5', syncing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* แถบค้นหา (ติดขอบบนขณะเลื่อน) */}
      <div className="sticky-glass sticky top-0 z-30 -mx-4 px-4 pb-2 pt-2">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="ค้นหาชื่อ ชื่อเล่น ตำแหน่ง เบอร์ สังกัด"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="ค้นหารายชื่อ"
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
              title="ใช่คนนี้หรือเปล่า? แตะเพื่อเปิดข้อมูล"
              onPick={(m) => {
                document.activeElement && document.activeElement.blur();
                ui.openProfile(m.id);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label="ตัวกรอง"
            className={cx(
              'relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition active:scale-95',
              activeCount ? 'btn-navy text-white' : 'glass text-navy-700',
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-navy-950 ring-2 ring-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* เลือกกลุ่มได้ทันที: ทั้งหมด / ตำรวจ / หน่วยงานอื่น (แสดงเฉพาะเมื่อมีคนที่ไม่ใช่ตำรวจ) */}
        {!loading && orgCounts.all > 0 && (members.some((m) => orgTypeOf(m) === 'other') || org !== 'all') && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:max-w-md" role="tablist" aria-label="กลุ่มผู้เข้าอบรม">
            {['all', 'police', 'other'].map((k) => {
              const active = org === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setOrg(k)}
                  className={cx(
                    'flex h-10 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold transition active:scale-[0.97]',
                    active ? 'btn-navy text-white' : 'glass text-slate-700',
                  )}
                >
                  {ORG_LABELS[k]}
                  <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20 text-white' : 'bg-navy-500/10 text-navy-700')}>
                    {orgCounts[k]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* จำนวนผลลัพธ์ + สลับมุมมอง */}
      <div className="flex items-center justify-between gap-2 pb-3 pt-1">
        <p className="min-w-0 truncate text-sm text-slate-500">
          {loading ? 'กำลังโหลดรายชื่อ…' : (
            <>
              พบ <strong className="font-semibold text-navy-900">{result.length}</strong>
              {result.length !== members.length && <> จาก {members.length}</>} คน
              <span className="hidden text-slate-400 sm:inline"> · เรียงตาม{sortLabel}</span>
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {view === 'grid' && (
            <Segmented
              size="sm"
              value={Number(density) || 0}
              onChange={setDensity}
              options={GRID_COLS[bp].map((n, i) => ({ value: i, label: String(n), title: `${n} คอลัมน์` }))}
            />
          )}
          <Segmented size="sm" value={view} onChange={setView} options={VIEWS} />
        </div>
      </div>

      {(activeCount > 0 || query) && (
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3">
          {activeFilters.map((f) => (
            <button
              key={`${f.key}:${f.value}`}
              type="button"
              onClick={() => toggleFilter(f.key, f.value)}
              className="btn-navy inline-flex h-8 shrink-0 items-center gap-1 rounded-full pl-3 pr-2 text-[13px] font-medium text-white"
            >
              <span className="text-white/60">{f.short}</span> {f.value}
              <X className="h-3.5 w-3.5 text-white/70" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold text-rose-600 hover:bg-rose-500/10">
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {loading ? (
        <LoadingGrid cols={cols} />
      ) : status === 'error' ? (
        <EmptyState
          icon={RefreshCw}
          title="โหลดข้อมูลไม่สำเร็จ"
          description={error}
          action={<button type="button" onClick={() => refresh()} className="btn-navy h-11 rounded-2xl px-5 text-sm font-semibold text-white">ลองใหม่</button>}
        />
      ) : result.length === 0 ? (
        <EmptyState
          icon={Search}
          title={members.length ? 'ไม่พบรายชื่อที่ตรงกับเงื่อนไข' : 'ยังไม่มีรายชื่อในระบบ'}
          description={members.length ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรอง' : 'เมื่อผู้ดูแลเปิดให้เพิ่มรายชื่อ จะมีปุ่มเพิ่มรายชื่อที่มุมขวาล่าง'}
          action={members.length ? <button type="button" onClick={clearAll} className="glass h-11 rounded-2xl px-5 text-sm font-semibold text-navy-800">ล้างตัวกรอง</button> : null}
        />
      ) : view === 'table' ? (
        <TableView sections={sections} sort={sort} onSort={setSort} onOpen={ui.openProfile} />
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <section
              key={s.key}
              className={cx(s.tone === 'warn' && '-mx-1.5 rounded-[28px] bg-amber-300/15 p-1.5 pt-3 ring-1 ring-amber-300/40')}
            >
              {s.title && (
                <div className={cx(s.tone === 'warn' && 'px-1.5')}>
                  <SectionHeading tone={s.tone} title={s.title} count={s.members.length} note={s.note} />
                </div>
              )}
              {view === 'grid' ? (
                <GridView members={s.members} cols={cols} onOpen={ui.openProfile} flagMissing={s.flag} />
              ) : (
                <ListView members={s.members} onOpen={ui.openProfile} flagMissing={s.flag} />
              )}
            </section>
          ))}
        </div>
      )}

      {can.add && !loading && (
        <button
          type="button"
          onClick={() => ui.openMemberForm(null, query.trim() && !result.length ? { first_name: queryTokens(query).join(' ') } : null)}
          className="fab btn-gold inline-flex h-14 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white ring-1 ring-white/50 transition active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
          <span>เพิ่มรายชื่อ</span>
        </button>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        facets={facets}
        filters={filters}
        onToggle={toggleFilter}
        onClear={() => {
          setFilters(NO_FILTERS);
          setOrgState('all');
        }}
        resultCount={result.length}
        activeCount={activeCount}
        org={org}
        orgCounts={orgCounts}
        onOrg={setOrg}
        sort={sort}
        onSort={setSort}
      />
    </div>
  );
}
