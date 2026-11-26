/** ข้อมูลเวอร์ชันและผู้พัฒนาระบบ (แสดงในเมนูอื่น) */
export const APP_VERSION = '1.8.0';

/* global __BUILD_TIME__, __BUILD_SHA__ */
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
export const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : '';

export const DEVELOPER = {
  name: 'พ.ต.ท.อัคเดช ลัดดาวัลย์',
  nick: 'อาร์ท 64',
  phone: '085-556-3955',
  line: 'arthur4864',
  photo: './developer.jpg',
};

export const developerTel = `tel:${DEVELOPER.phone.replace(/\D/g, '')}`;
export const developerLine = `https://line.me/ti/p/~${DEVELOPER.line}`;

/** "1.8.0 · 26 พ.ย. 69 10:30 · a1b2c3d" */
export function versionLabel() {
  const parts = [APP_VERSION];
  if (BUILD_TIME) {
    const d = new Date(BUILD_TIME);
    if (!Number.isNaN(d.getTime())) {
      parts.push(new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d));
    }
  }
  if (BUILD_SHA) parts.push(BUILD_SHA);
  return parts.join(' · ');
}
