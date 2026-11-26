import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const CHECK_MS = 5 * 60 * 1000;

/** ชื่อไฟล์สคริปต์หลักของเวอร์ชันที่เปิดอยู่ เช่น index-AbC123.js (โหมด dev ไม่มี) */
function currentBundle() {
  const src = [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).find((s) => /assets\/index-[^/]+\.js/.test(s));
  return src ? src.match(/index-[^/]+\.js/)[0] : '';
}

/**
 * ตรวจว่ามีเวอร์ชันใหม่บนเว็บหรือยัง (เบราว์เซอร์บนมือถือมักเปิดหน้าเดิมจากแคช)
 * ถ้ามี จะแสดงแถบให้แตะเพื่อโหลดเวอร์ชันล่าสุด
 */
export default function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mine = currentBundle();
    if (!mine) return undefined;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`./?v=${Date.now()}`, { cache: 'no-store' });
        const html = await res.text();
        const m = html.match(/assets\/(index-[^"'/]+\.js)/);
        if (!stopped && m && m[1] !== mine) setReady(true);
      } catch {
        /* ออฟไลน์ — ลองใหม่รอบถัดไป */
      }
    };
    const first = setTimeout(check, 4000);
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!ready) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+10px)] z-[60] inline-flex -translate-x-1/2 animate-pop items-center gap-2 rounded-full bg-navy-900/95 px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_12px_30px_-10px_rgba(11,28,54,0.6)] ring-1 ring-white/20 backdrop-blur"
    >
      <RefreshCw className="h-4 w-4 text-gold-300" /> มีเวอร์ชันใหม่ · แตะเพื่ออัปเดต
    </button>
  );
}
