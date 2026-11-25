/**
 * โซเชียลมีเดียของสมาชิก
 * เก็บในฐานข้อมูลเป็น JSON ช่องเดียว: [{"type":"facebook","value":"somchai.j"}, ...] (เพิ่มได้หลายรายการ)
 * value = ชื่อผู้ใช้ หรือลิงก์โปรไฟล์ ตามที่เจ้าตัวกรอก
 */

export const MAX_SOCIALS = 12;
export const MAX_SOCIAL_VALUE = 200;

const HANDLE = /^[A-Za-z0-9._-]{1,60}$/;
const handleLink = (prefix, suffix = '') => (h) => (HANDLE.test(h) ? `${prefix}${h}${suffix}` : '');

/** bg / fg = สีพื้นและสีโลโก้ของป้ายแพลตฟอร์ม (โลโก้อยู่ใน brandIcons.js) */
export const SOCIAL_PLATFORMS = [
  {
    key: 'line', label: 'LINE', bg: '#06C755', placeholder: 'LINE ID',
    // ไอดีส่วนตัวใช้ ~id ส่วนบัญชีทางการ (ขึ้นต้นด้วย @) ใช้ลิงก์อีกแบบ
    link: (h, raw) => (!HANDLE.test(h) ? '' : raw.startsWith('@') ? `https://line.me/R/ti/p/%40${h}` : `https://line.me/ti/p/~${h}`),
  },
  {
    key: 'facebook', label: 'Facebook', bg: '#1877F2', placeholder: 'ชื่อบัญชี หรือลิงก์โปรไฟล์',
    // คนส่วนใหญ่กรอกชื่อที่แสดงในเฟซบุ๊ก (มีเว้นวรรค/ภาษาไทย) จึงพาไปหน้าค้นหาแทน
    link: (h, raw) => (HANDLE.test(h) ? `https://www.facebook.com/${h}` : `https://www.facebook.com/search/top/?q=${encodeURIComponent(raw)}`),
  },
  { key: 'instagram', label: 'Instagram', bg: 'linear-gradient(45deg,#F9CE34,#EE2A7B 55%,#6228D7)', placeholder: 'ชื่อผู้ใช้ เช่น somchai.j', link: handleLink('https://www.instagram.com/', '/') },
  { key: 'tiktok', label: 'TikTok', bg: '#111111', placeholder: 'ชื่อผู้ใช้ เช่น somchai.j', link: handleLink('https://www.tiktok.com/@') },
  { key: 'x', label: 'X (Twitter)', bg: '#111111', placeholder: 'ชื่อผู้ใช้ เช่น somchai_j', link: handleLink('https://x.com/') },
  { key: 'threads', label: 'Threads', bg: '#111111', placeholder: 'ชื่อผู้ใช้ เช่น somchai.j', link: handleLink('https://www.threads.com/@') },
  { key: 'youtube', label: 'YouTube', bg: '#FF0000', placeholder: 'ชื่อช่อง หรือลิงก์ช่อง', link: handleLink('https://www.youtube.com/@') },
  { key: 'lemon8', label: 'Lemon8', bg: '#FFE600', fg: '#111111', placeholder: 'ชื่อผู้ใช้ หรือลิงก์โปรไฟล์', link: handleLink('https://www.lemon8-app.com/@') },
  { key: 'linkedin', label: 'LinkedIn', bg: '#0A66C2', placeholder: 'ชื่อผู้ใช้ หรือลิงก์โปรไฟล์', link: handleLink('https://www.linkedin.com/in/') },
  { key: 'telegram', label: 'Telegram', bg: '#26A5E4', placeholder: 'ชื่อผู้ใช้ เช่น somchai_j', link: handleLink('https://t.me/') },
  {
    key: 'whatsapp', label: 'WhatsApp', bg: '#25D366', placeholder: 'เบอร์โทร เช่น 08x-xxx-xxxx',
    link: (h, raw) => {
      let d = raw.replace(/\D/g, '');
      if (/^0\d{8,9}$/.test(d)) d = `66${d.slice(1)}`; // เบอร์ไทย 08x... -> 668x...
      return d.length >= 8 ? `https://wa.me/${d}` : '';
    },
  },
  { key: 'wechat', label: 'WeChat', bg: '#07C160', placeholder: 'WeChat ID', link: () => '' },
  { key: 'website', label: 'เว็บไซต์', bg: '#1E3A64', placeholder: 'เช่น www.example.com', link: () => '' },
  { key: 'other', label: 'อื่น ๆ', bg: '#64748B', placeholder: 'ชื่อแพลตฟอร์ม และชื่อบัญชีหรือลิงก์', link: () => '' },
];

const BY_KEY = new Map(SOCIAL_PLATFORMS.map((p) => [p.key, p]));
const OTHER = BY_KEY.get('other');

/** แพลตฟอร์มที่ไม่รู้จัก (เช่น เพิ่มมาภายหลัง) แสดงเป็น "อื่น ๆ" */
export const platformOf = (type) => BY_KEY.get(String(type || '').toLowerCase()) || OTHER;

/** อ่านค่า social จากฐานข้อมูล (JSON หรือ array) -> [{ type, value }] ข้อมูลผิดรูปแบบ = ไม่มี */
export function parseSocial(raw) {
  let list = raw;
  if (typeof list === 'string') {
    if (!list.trim()) return [];
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const type = String(item.type || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    const value = String(item.value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SOCIAL_VALUE);
    if (type && value) out.push({ type, value });
    if (out.length >= MAX_SOCIALS) break;
  }
  return out;
}

const socialCache = new WeakMap();
/** โซเชียลของสมาชิก 1 คน (จำผลไว้ ไม่ต้องแปลง JSON ซ้ำทุกครั้งที่วาดหน้าจอ) */
export function memberSocials(m) {
  if (!m || !m.social) return [];
  let list = socialCache.get(m);
  if (!list) {
    list = parseSocial(m.social);
    socialCache.set(m, list);
  }
  return list;
}

/** แปลงสิ่งที่ผู้ใช้กรอกเป็นลิงก์ http(s) ที่ปลอดภัย — ไม่ใช่ลิงก์คืน '' */
function asUrl(value, anyDomain) {
  const v = String(value || '').trim();
  if (!v || /\s/.test(v)) return '';
  let candidate = '';
  if (/^https?:\/\//i.test(v)) candidate = v;
  else if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i.test(v) && (anyDomain || v.includes('/') || /^www\./i.test(v))) candidate = `https://${v}`;
  if (!candidate) return '';
  try {
    const u = new URL(candidate);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href : '';
  } catch {
    return '';
  }
}

/** ลิงก์สำหรับเปิดโปรไฟล์ — คืน '' ถ้าสร้างลิงก์ไม่ได้ (ให้คัดลอกแทน) */
export function socialHref(item) {
  const p = platformOf(item.type);
  const raw = String(item.value || '').trim();
  const url = asUrl(raw, p.key === 'website');
  if (url) return url;
  return p.link(raw.replace(/^@+/, ''), raw) || '';
}

/** ข้อความที่แสดง: ลิงก์ตัด https:// และ www. ออกให้สั้น ส่วนชื่อผู้ใช้แสดงตามที่กรอก */
export function socialText(item) {
  const raw = String(item.value || '').trim();
  if (!asUrl(raw, false) && !/^https?:\/\//i.test(raw)) return raw;
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[/?#]+$/, '');
}
