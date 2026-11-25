import { useEffect, useState } from 'react';
import { cx, initialOf } from '../lib/utils';
import { useDrivePhoto } from '../lib/photos';

const TINTS = [
  'bg-navy-100 text-navy-400',
  'bg-gold-100 text-gold-500',
  'bg-slate-200 text-slate-400',
  'bg-navy-50 text-navy-300',
];

function tintOf(member) {
  const key = String((member && (member.id || member.first_name)) || '');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** รูปจาก Google Drive (lh3) ขอขนาดย่อได้ด้วย =w<px> เพื่อประหยัดเน็ตมือถือ */
export function photoSrc(url, width) {
  if (!url) return '';
  if (width && /^https:\/\/lh3\.googleusercontent\.com\/d\/[^=?/]+$/.test(url)) return `${url}=w${width}`;
  return url;
}

function Initial({ member, className, textClass }) {
  return (
    <div className={cx('grid select-none place-items-center', tintOf(member), className)} aria-hidden="true">
      <span className={cx('font-semibold leading-none', textClass)}>{initialOf(member)}</span>
    </div>
  );
}

/**
 * รูปถ่ายหน้าตรงของสมาชิก — ถ้าไม่มีรูปหรือโหลดไม่ได้ จะแสดงอักษรย่อบนพื้นสีอ่อนแทน
 * รองรับทั้งลิงก์รูปปกติ และรูปแบบ "drive:<id>" ที่ต้องโหลดผ่าน API
 */
export function Photo({ member, width = 400, className, textClass = 'text-2xl', eager = false }) {
  const url = (member && member.photo_url) || '';
  const driveId = url.startsWith('drive:') ? url.slice(6) : '';
  const driveSrc = useDrivePhoto(driveId);
  const [stage, setStage] = useState(0); // 0 = ขนาดย่อ, 1 = ไฟล์ต้นฉบับ, 2 = โหลดไม่ได้
  useEffect(() => setStage(0), [url]);

  if (driveId) {
    if (driveSrc === '') return <div className={cx('skeleton', className)} aria-hidden="true" />;
    if (!driveSrc) return <Initial member={member} className={className} textClass={textClass} />;
    return <img src={driveSrc} alt="" draggable={false} decoding="async" className={cx('bg-slate-200 object-cover', className)} />;
  }

  if (!url || stage === 2) return <Initial member={member} className={className} textClass={textClass} />;
  const sized = photoSrc(url, width);
  return (
    <img
      src={stage === 0 ? sized : url}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setStage((s) => (s === 0 && sized !== url ? 1 : 2))}
      className={cx('bg-slate-200 object-cover', className)}
    />
  );
}
