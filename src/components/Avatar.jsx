import { useEffect, useRef, useState } from 'react';
import { cx, initialOf, memberPhotos } from '../lib/utils';
import { useDrivePhoto } from '../lib/photos';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hashOf = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * รูปของสมาชิกที่มีหลายรูป: ค่อย ๆ เปลี่ยนรูปเองทุก ~5 วินาที (เฉพาะตอนการ์ดอยู่บนจอ)
 * แต่ละการ์ดเริ่มไม่พร้อมกัน จะได้ไม่เปลี่ยนพร้อมกันทั้งหน้า — มีรูปเดียวแสดงเหมือน Photo ปกติ
 */
export function RotatingPhoto({ member, width = 400, className, textClass, interval = 5000 }) {
  const photos = memberPhotos(member);
  const n = photos.length;
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    if (n < 2 || !ref.current || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, [n]);
  useEffect(() => {
    if (n < 2 || !onScreen || prefersReducedMotion()) return undefined;
    let timer = setTimeout(function tick() {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % n);
      timer = setTimeout(tick, interval);
    }, interval + (hashOf(String(member.id || '')) % 2500));
    return () => clearTimeout(timer);
  }, [n, onScreen, interval, member.id]);

  if (n < 2) return <Photo member={member} width={width} className={className} textClass={textClass} />;
  const current = index % n;
  return (
    <div ref={ref} className={cx('relative overflow-hidden', className)}>
      {photos.map((p, k) => (
        <Photo
          key={p.key}
          member={{ ...member, photo_url: p.url }}
          width={width}
          className={cx('absolute inset-0 h-full w-full object-[center_22%] transition-opacity duration-700', k === current ? 'opacity-100' : 'opacity-0')}
          textClass={textClass}
        />
      ))}
    </div>
  );
}

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
  // รูปเล็ก (กริด/รายการ) ใช้รูปย่อ — รูปใหญ่ (หน้ารายละเอียด) แสดงรูปย่อไปก่อนระหว่างรอรูปเต็ม
  const wantsFull = width >= 600;
  const thumbSrc = useDrivePhoto(driveId, 'thumb');
  const fullSrc = useDrivePhoto(wantsFull ? driveId : '', 'full');
  const [stage, setStage] = useState(0); // 0 = ขนาดย่อ, 1 = ไฟล์ต้นฉบับ, 2 = โหลดไม่ได้
  useEffect(() => setStage(0), [url]);

  if (driveId) {
    const driveSrc = (wantsFull && fullSrc) || thumbSrc || (wantsFull ? fullSrc : thumbSrc);
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
