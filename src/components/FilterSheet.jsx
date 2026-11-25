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
];

/** ตัวกรองละเอียด: เลือกได้หลายค่าในแต่ละหมวด และกรองผสมข้ามหมวดได้ */
export default function FilterSheet({ open, onClose, facets, filters, onToggle, onClear, resultCount, activeCount, sort, onSort }) {
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
        {facets.map((facet) => (
          <section key={facet.key}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-navy-900">{facet.label}</h3>
              {filters[facet.key].length > 0 && (
                <span className="text-xs font-medium text-gold-600">เลือก {filters[facet.key].length} รายการ</span>
              )}
            </div>
            {facet.options.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีข้อมูล{facet.short}ในระบบ</p>
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
                          ? 'bg-navy-900 text-white shadow-sm'
                          : o.count === 0
                            ? 'bg-slate-50 text-slate-300 ring-1 ring-inset ring-slate-100'
                            : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-navy-300',
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
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-slate-800 outline-none focus:border-navy-500"
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
