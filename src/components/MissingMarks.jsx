import { Camera, CircleAlert, Phone, Plus, Tag } from 'lucide-react';
import { cx, missingInfo } from '../lib/utils';

// สัญลักษณ์ของข้อมูลที่ยังขาด: ไอคอนของสิ่งนั้น มีเครื่องหมายบวกเล็ก ๆ ที่มุม = ยังต้องเพิ่ม
// (กล้อง = รูป, โทรศัพท์ = เบอร์โทร, ป้ายชื่อ = ชื่อเล่น)
export const MISSING_ICONS = { 'รูป': Camera, 'เบอร์': Phone, 'ชื่อเล่น': Tag };

export function MissingMark({ kind, size = 20 }) {
  const Icon = MISSING_ICONS[kind] || CircleAlert;
  const badge = Math.max(7, Math.round(size * 0.48));
  return (
    <span
      role="img"
      aria-label={`ขาด${kind}`}
      title={`ขาด${kind} — ยังต้องเพิ่ม`}
      style={{ width: size, height: size }}
      className="relative inline-grid shrink-0 place-items-center rounded-full bg-white align-middle text-navy-900 shadow-sm ring-1 ring-amber-400"
    >
      <Icon aria-hidden="true" strokeWidth={2.2} style={{ width: size * 0.6, height: size * 0.6 }} />
      {/* เครื่องหมายบวกเล็ก ๆ ที่มุมขวาบน */}
      <span
        aria-hidden="true"
        className="absolute grid place-items-center rounded-full bg-amber-400 text-navy-950 ring-1 ring-white"
        style={{ width: badge, height: badge, top: -badge * 0.28, right: -badge * 0.28 }}
      >
        <Plus strokeWidth={4} style={{ width: badge * 0.76, height: badge * 0.76 }} />
      </span>
    </span>
  );
}

/** แถวสัญลักษณ์ของทุกอย่างที่สมาชิกคนนี้ยังขาด */
export function MissingMarks({ member, size = 20, className }) {
  const list = missingInfo(member);
  if (!list.length) return null;
  return (
    <span className={cx('inline-flex items-center', className)} style={{ gap: Math.max(3, Math.round(size / 4.5)) }}>
      {list.map((k) => <MissingMark key={k} kind={k} size={size} />)}
    </span>
  );
}
