import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, IdCard, LayoutGrid, Phone, RefreshCw, Search, SlidersHorizontal, Table2, UserPlus, X } from 'lucide-react';
import { Photo } from '../components/Avatar';
import { EmptyState, Segmented, Skeleton } from '../components/ui';
import MemberSuggest from '../components/MemberSuggest';
import FilterSheet, { SORT_OPTIONS } from '../components/FilterSheet';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { COURSE_SHORT, COURSE_SUBTITLE } from '../config';
import {
  cx, formatPhone, fullName, guessMembers, matchMember, nickOf, orgLine, phoneDigits, queryTokens,
  telHref, thCompare, useBreakpoint, usePersistentState,
} from '../lib/utils';

const FACETS = [
  { key: 'bureau_bch', label: 'บช. (กองบัญชาการ)', short: 'บช.' },
  { key: 'division_bk', label: 'บก. (กองบังคับการ)', short: 'บก.' },
  { key: 'province', label: 'จังหวัด', short: 'จังหวัด' },
];
const NO_FILTERS = { bureau_bch: [], division_bk: [], province: [] };

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

/* ------------------------------ มุมมองกริดรูปภาพ ------------------------------ */

function GridView({ members, cols, onOpen }) {
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
  const nickSize = ['text-xl', 'text-[15px]', 'text-[13px]', 'text-[11px]'][dense];
  const pad = ['p-3 pt-10', 'p-2 pt-8', 'p-1.5 pt-6', 'p-1 pt-5'][dense];
  const width = cardWidth >= 150 ? 500 : cardWidth >= 90 ? 320 : 220;
  return (
    <div ref={gridRef} className="photo-grid" style={{ '--cols': cols, '--gap': dense >= 2 ? '6px' : '10px' }}>
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onOpen(m.id)}
          className={cx(
            'group relative overflow-hidden bg-slate-200 text-left shadow-sm ring-1 ring-navy-900/5 transition active:scale-[0.97]',
            dense >= 2 ? 'rounded-xl' : 'rounded-2xl',
          )}
        >
          <Photo member={m} width={width} className="aspect-[3/4] w-full transition duration-300 group-hover:scale-[1.03]" textClass={['text-6xl', 'text-4xl', 'text-3xl', 'text-2xl'][dense]} />
          <div className={cx('absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 via-navy-950/55 to-transparent', pad)}>
            <p className={cx('truncate font-bold leading-tight text-white drop-shadow', nickSize)}>{nickOf(m)}</p>
            {dense <= 2 && (
              <p className={cx('truncate leading-tight text-white/80', dense === 0 ? 'mt-0.5 text-[13px]' : 'text-[10px]')}>
                {dense === 0 ? fullName(m) : m.nickname ? m.first_name : m.last_name}
              </p>
            )}
            {dense === 0 && orgLine(m) && <p className="mt-0.5 truncate text-[11px] leading-tight text-white/60">{orgLine(m)}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ มุมมองการ์ดรายชื่อ ------------------------------ */

function ListView({ members, onOpen }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/70">
          <button type="button" onClick={() => onOpen(m.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Photo member={m} width={160} className="h-[72px] w-[54px] shrink-0 rounded-xl" textClass="text-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-bold leading-tight text-navy-900">{nickOf(m)}</span>
              <span className="block truncate text-sm text-slate-700">{fullName(m)}</span>
              {m.position && <span className="block truncate text-xs text-slate-500">{m.position}</span>}
              {orgLine(m) && <span className="block truncate text-xs text-slate-400">{orgLine(m)}</span>}
            </span>
          </button>
          {phoneDigits(m.phone) ? (
            <a
              href={telHref(m.phone)}
              aria-label={`โทรหา ${nickOf(m)}`}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy-900 text-white shadow-sm transition active:scale-95"
            >
              <Phone className="h-5 w-5" />
            </a>
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-300" title="ยังไม่มีเบอร์โทร">
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

function TableView({ members, sort, onSort, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead className="bg-slate-50 text-xs">
          <tr>
            <SortHeader column={{ key: 'seq', label: '#' }} sort={sort} onSort={onSort} className="w-12 pl-3 pr-1" />
            <SortHeader column={TABLE_COLUMNS[0]} sort={sort} onSort={onSort} className="sticky left-0 z-10 bg-slate-50" />
            {TABLE_COLUMNS.slice(1).map((c) => (
              <SortHeader key={c.key} column={c} sort={sort} onSort={onSort} />
            ))}
            <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-500">โทร</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => (
            <tr key={m.id} onClick={() => onOpen(m.id)} className="group cursor-pointer transition hover:bg-navy-50/60">
              <td className="pl-3 pr-1 text-slate-400 tabular-nums">{m.seq}</td>
              <td className="sticky left-0 z-[1] max-w-[46vw] bg-white px-3 py-2 transition group-hover:bg-navy-50 sm:max-w-none">
                <button type="button" className="flex w-full items-center gap-2.5 text-left">
                  <Photo member={m} width={96} className="h-9 w-9 shrink-0 rounded-lg" textClass="text-sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900">{[m.first_name, m.last_name].filter(Boolean).join(' ')}</span>
                    <span className="block truncate text-[11px] text-slate-400">{m.rank}</span>
                  </span>
                </button>
              </td>
              <td className="whitespace-nowrap px-3 font-semibold text-navy-800">{m.nickname || <span className="font-normal text-slate-300">—</span>}</td>
              <td className="whitespace-nowrap px-3 text-slate-600">{m.province || <span className="text-slate-300">—</span>}</td>
              <td className="whitespace-nowrap px-3 text-slate-600">{m.division_bk || <span className="text-slate-300">—</span>}</td>
              <td className="whitespace-nowrap px-3 text-slate-600">{m.bureau_bch || <span className="text-slate-300">—</span>}</td>
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

  const { result, facets } = useMemo(() => {
    const passes = (m, except) =>
      FACETS.every((f) => f.key === except || !filters[f.key].length || filters[f.key].includes(m[f.key]));
    const searched = members.filter((m) => matchMember(m, tokens));
    const filtered = searched.filter((m) => passes(m)).sort(compareBy(sort));
    // จำนวนในแต่ละตัวเลือก นับจากผลลัพธ์ที่ผ่านตัวกรองหมวดอื่นแล้ว (faceted count)
    const facetData = FACETS.map((f) => {
      const counts = new Map();
      members.forEach((m) => { if (m[f.key]) counts.set(m[f.key], 0); });
      searched.forEach((m) => {
        if (m[f.key] && passes(m, f.key)) counts.set(m[f.key], (counts.get(m[f.key]) || 0) + 1);
      });
      const options = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => thCompare(a.value, b.value));
      return { ...f, options };
    });
    return { result: filtered, facets: facetData };
  }, [members, tokens, filters, sort]);

  const activeFilters = FACETS.flatMap((f) => filters[f.key].map((value) => ({ key: f.key, short: f.short, value })));
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
    setQuery('');
  };

  const loading = status === 'loading';
  const sortLabel = (SORT_OPTIONS.find((o) => o.key === sort.key) || SORT_OPTIONS[0]).label;

  return (
    <div className="mx-auto max-w-6xl px-4 page-bottom">
      <header className="pt-safe">
        <div className="flex items-center gap-3 pb-3 pt-5">
          <img src="./logo.jpg" alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover shadow-sm ring-1 ring-slate-200" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold tracking-wide text-gold-600">{COURSE_SUBTITLE} · {COURSE_SHORT}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-navy-900">ทำเนียบรุ่น</h1>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            aria-label="รีเฟรชข้อมูล"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-navy-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
          >
            <RefreshCw className={cx('h-5 w-5', syncing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* แถบค้นหา (ติดขอบบนขณะเลื่อน) */}
      <div className="sticky top-0 z-30 -mx-4 bg-paper/90 px-4 py-2 backdrop-blur-lg">
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-[16px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10 [&::-webkit-search-cancel-button]:hidden"
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
              'relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-sm transition active:scale-95',
              activeFilters.length ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-slate-200',
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilters.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-navy-950 ring-2 ring-paper">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
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

      {(activeFilters.length > 0 || query) && (
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3">
          {activeFilters.map((f) => (
            <button
              key={`${f.key}:${f.value}`}
              type="button"
              onClick={() => toggleFilter(f.key, f.value)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-navy-900 pl-3 pr-2 text-[13px] font-medium text-white"
            >
              <span className="text-white/60">{f.short}</span> {f.value}
              <X className="h-3.5 w-3.5 text-white/70" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold text-rose-600 hover:bg-rose-50">
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
          action={<button type="button" onClick={() => refresh()} className="h-11 rounded-2xl bg-navy-900 px-5 text-sm font-semibold text-white">ลองใหม่</button>}
        />
      ) : result.length === 0 ? (
        <EmptyState
          icon={Search}
          title={members.length ? 'ไม่พบรายชื่อที่ตรงกับเงื่อนไข' : 'ยังไม่มีรายชื่อในระบบ'}
          description={members.length ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรอง' : 'เมื่อผู้ดูแลเปิดให้เพิ่มรายชื่อ จะมีปุ่มเพิ่มรายชื่อที่มุมขวาล่าง'}
          action={members.length ? <button type="button" onClick={clearAll} className="h-11 rounded-2xl bg-navy-50 px-5 text-sm font-semibold text-navy-800">ล้างตัวกรอง</button> : null}
        />
      ) : view === 'grid' ? (
        <GridView members={result} cols={cols} onOpen={ui.openProfile} />
      ) : view === 'list' ? (
        <ListView members={result} onOpen={ui.openProfile} />
      ) : (
        <TableView members={result} sort={sort} onSort={setSort} onOpen={ui.openProfile} />
      )}

      {can.add && !loading && (
        <button
          type="button"
          onClick={() => ui.openMemberForm(null, query.trim() && !result.length ? { first_name: queryTokens(query).join(' ') } : null)}
          className="fab inline-flex h-14 items-center gap-2 rounded-full bg-gold-500 px-5 text-[15px] font-semibold text-white shadow-lg shadow-gold-700/30 transition active:scale-95"
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
        onClear={() => setFilters(NO_FILTERS)}
        resultCount={result.length}
        activeCount={activeFilters.length}
        sort={sort}
        onSort={setSort}
      />
    </div>
  );
}
