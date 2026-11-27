import { FileSpreadsheet } from 'lucide-react';
import { useToast } from './Toast';
import { cx } from '../lib/utils';

/** ปุ่ม Export to Excel — onExport() สร้างและดาวน์โหลดไฟล์ แล้วคืนจำนวนแถว */
export default function ExportButton({ onExport, what = 'ข้อมูล', disabled = false, className }) {
  const toast = useToast();
  const run = () => {
    try {
      const n = onExport();
      toast.success(n ? `ดาวน์โหลด${what}เป็นไฟล์ Excel แล้ว (${n} รายการ)` : `ยังไม่มี${what}ให้ดาวน์โหลด`);
    } catch (err) {
      toast.error(`สร้างไฟล์ Excel ไม่สำเร็จ: ${err.message}`);
    }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      aria-label={`Export to Excel: ${what}`}
      title={`Export to Excel (${what})`}
      className={cx(
        'glass inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-emerald-700 transition active:scale-95 disabled:opacity-40',
        className || 'h-11',
      )}
    >
      <FileSpreadsheet className="h-[18px] w-[18px]" /> Excel
    </button>
  );
}
