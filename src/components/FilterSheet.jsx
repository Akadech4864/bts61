import { ArrowDownAZ, ArrowUpAZ, Check } from 'lucide-react';
import { Sheet } from './Sheet';
import { Button } from './ui';
import { cx } from '../lib/utils';

export const SORT_OPTIONS = [
  { key: 'seq', label: 'ลำดับตามบัญชี' },
  { key: 'first_name', label: 'ชื่อจริง' },
  { key: 'nickname', label: 'ชื่อเล่น' },
  { key: 'province', label: 'จังหวัด' },
  { key: 'division_bk', label: 'บก.' },
  { key: 'bureau_bch', label: 'บช.' },
  { key: 'agency', label: 'หน่วยงาน' },
];

const ORG_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'police', label: 'ตำรวจ' },
  { value: 'other', label: 'หน่วยงานอื่น' },
];

const SCOPE_NOTE = {
  police: 'เฉพาะผู้ที่สังกัดตำรวจ',
  other: 'เฉพาะผู้ที่ไม่ได้สังกัดตำรวจ',
};

/**
 * ตัวกรองละเอียด
 * 1) เลือกกลุ่ม: ทั้งหมด / ตำรวจ / หน่วยงานอื่น
 * 2) หมวดที่เกี่ยวกับกลุ่มนั้น: ตำรวจ = บช. + บก., หน่วยงานอื่น = ชื่อหน่วยงาน, ทุกกลุ่ม = จังหวัด
 * เลือกได้หลายค่าในแต่ละหมวด และกรองผสมข้ามหมวดได้
 */
export default function FilterSheet({
  open, onClose, facets, filters, onToggle, onClear, resultCount, activeCount, sort, onSort, org, orgCounts, onOrg,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ตัวกรองและการเรียง"
      subtitle="เลือกได้หลายรายการ ตัวเลือกดึงจากข้อมูลจริงในระบบ"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClear} disabled={!activeCount} className="shrink-0">
            ล้างตัวกรอง
          </Button>
          <Button onClick={onClose} className="flex-1">
            ดูผลลัพธ์ {resultCount} คน
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">กลุ่มผู้เข้าอบรม</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {ORG_OPTIONS.map((o) => {
              const active = org === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onOrg(o.value)}
                  className={cx(
                    'flex h-11 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold leading-tight transition active:scale-[0.97]',
                    active ? 'btn-navy text-white' : 'glass text-slate-700',
                  )}
                >
                  {o.label}
                  <span className={cx('text-[11px] font-medium tabular-nums', active ? 'text-white/70' : 'text-slate-400')}>
                    {orgCounts ? orgCounts[o.value] : ''} คน
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {facets.map((facet) => (
          <section key={facet.key}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-navy-900">
                {facet.label}
                {org === 'all' && SCOPE_NOTE[facet.scope] && (
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({SCOPE_NOTE[facet.scope]})</span>
                )}
              </h3>
              {filters[facet.key].length > 0 && (
                <span className="shrink-0 text-xs font-medium text-gold-600">เลือก {filters[facet.key].length}</span>
              )}
            </div>
            {facet.options.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีข้อมูล{facet.short}ในระบบ</p>
            ) : !filters[facet.key].length && facet.options.every((o) => o.count === 0) ? (
              <p className="text-sm text-slate-400">ไม่มีตัวเลือกที่ตรงกับตัวกรองที่เลือกอยู่</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {facet.options.map((o) => {
                  const active = filters[facet.key].includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggle(facet.key, o.value)}
                      className={cx(
                        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition active:scale-95',
                        active
                          ? 'btn-navy text-white'
                          : o.count === 0
                            ? 'bg-white/30 text-slate-300'
                            : 'glass text-slate-700',
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {o.value}
                      <span className={cx('text-xs tabular-nums', active ? 'text-white/70' : 'text-slate-400')}>{o.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">เรียงลำดับตาม</h3>
          <div className="flex gap-2">
            <select
              value={sort.key}
              onChange={(e) => onSort({ key: e.target.value, dir: 'asc' })}
              className="glass h-11 min-w-0 flex-1 rounded-xl px-3 text-[15px] text-slate-800 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              className="h-11! px-3"
              icon={sort.dir === 'asc' ? ArrowDownAZ : ArrowUpAZ}
              onClick={() => onSort({ key: sort.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
            >
              {sort.dir === 'asc' ? 'น้อย → มาก' : 'มาก → น้อย'}
            </Button>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
