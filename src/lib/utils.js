import { useCallback, useEffect, useState } from 'react';
import { parseSocial } from './social';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ------------------------------ ชื่อและยศ ------------------------------ */

const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
export const thCompare = (a, b) => collator.compare(a || '', b || '');

/** คำนำหน้า/ยศ ตามที่บันทึกไว้ (ไม่เดาให้ เพราะผู้เข้าอบรมไม่ได้เป็น พ.ต.อ. ทุกคน) */
export const rankOf = (m) => (m && m.rank) || '';

/** "พ.ต.อ. สมชาย ใจดี" / "นายสมชาย ใจดี" */
export function fullName(m, withRank = true) {
  if (!m) return '';
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ');
  if (!withRank) return name;
  const rank = rankOf(m);
  const spaced = /[.]$|หญิง$/.test(rank);
  return `${rank}${spaced ? ' ' : ''}${name}`.trim();
}

/** ชื่อแบบย่อบนการ์ดรูป: ยศ + ชื่อจริง แล้วใช้ "ฯ" แทนนามสกุล เช่น "พ.ต.อ. สมชายฯ" */
export function shortName(m) {
  if (!m) return '';
  const rank = rankOf(m);
  const spaced = /[.]$|หญิง$/.test(rank);
  return `${rank}${spaced ? ' ' : ''}${m.first_name || ''}${m.first_name && m.last_name ? 'ฯ' : ''}`.trim();
}

export const nickOf = (m) => (m && (m.nickname || m.first_name)) || '';

/** อักษรย่อสำหรับรูปแทนตัว รองรับสระหน้าและวรรณยุกต์ไทย */
export function initialOf(m) {
  const s = String(nickOf(m)).trim();
  const hit = /^[เแโใไ]?[ก-ฮ][ัิ-ฺ็-๎]*/.exec(s);
  return hit ? hit[0] : s.slice(0, 1).toUpperCase();
}

/** กทม / กทม. / กรุงเทพ / กรุงเทพฯ / กรุงเทพมหานคร / Bangkok -> "กรุงเทพฯ" (ตรงกับฝั่ง Backend) */
export function normalizeProvince(value) {
  const s = String(value || '').trim();
  const key = s.replace(/[\s.]/g, '').toLowerCase();
  if (/^(กทม|กรุงเทพ(ฯ|มหานคร)?|bangkok|bkk)$/.test(key)) return 'กรุงเทพฯ';
  return s.replace(/^จ(ังหวัด|\.)\s*/, '');
}

/** คำนำหน้าของบุคคลทั่วไป (ไม่ใช่ยศตำรวจ) */
export const isCivilianRank = (rank) => /^(นาย|นาง|นางสาว)$/.test(String(rank || '').trim());

/**
 * 'police' = สังกัดตำรวจ (กรอก บก./บช.) | 'other' = หน่วยงานอื่น (กรอกชื่อหน่วยงาน)
 * มีชื่อหน่วยงานแล้ว = หน่วยงานอื่น; ยังไม่มีทั้ง บก./บช. และคำนำหน้าเป็น นาย/นาง/นางสาว = หน่วยงานอื่น
 */
export function orgTypeOf(m) {
  if (!m) return 'police';
  if (m.agency) return 'other';
  if (!m.division_bk && !m.bureau_bch && isCivilianRank(m.rank)) return 'other';
  return 'police';
}

export const orgLine = (m) =>
  (m.agency ? [m.agency, m.province] : [m.division_bk, m.bureau_bch, m.province]).filter(Boolean).join(' · ');

/* ------------------------------ เบอร์โทร ------------------------------ */

export function phoneDigits(phone) {
  const first = String(phone || '').split(/[,/]/)[0];
  return first.replace(/[^\d+]/g, '');
}

/** ข้อมูลสำคัญที่ยังขาด (รูป / โทร. / ชื่อเล่น) — คืนรายการคำสั้น ๆ ว่างเปล่า = ครบแล้ว */
export function missingInfo(m) {
  const out = [];
  if (!m.photo_url) out.push('รูป');
  if (!phoneDigits(m.phone)) out.push('โทร.');
  if (!String(m.nickname || '').trim()) out.push('ชื่อเล่น');
  return out;
}

/** "ขาดรูป, โทร., ชื่อเล่น" — ขึ้นต้นด้วยคำว่า ขาด ครั้งเดียว (ครบแล้วคืน '') */
export function missingText(m) {
  const list = missingInfo(m);
  return list.length ? `ขาด${list.join(', ')}` : '';
}

/** รูปแบบอีเมลอย่างง่าย (ตรงกับฝั่ง Backend) */
export const isEmail = (value) => /^[^@\s<>"',;]+@[^@\s<>"',;]+\.[^@\s<>"',;.]{2,}$/.test(String(value || '').trim());

export function formatPhone(phone) {
  const d = phoneDigits(phone);
  if (/^0\d{9}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (/^0\d{8}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return String(phone || '').trim();
}

export const telHref = (phone) => `tel:${phoneDigits(phone)}`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* ------------------------------ ค้นหา ------------------------------ */

const RANK_IN_QUERY = /(^|\s)(รศ\.)?พ\.ต\.อ\.?(หญิง)?|(^|\s)พตอ(?=\s|$)/g;

export const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** ตัดคำว่า พ.ต.อ. ออก แล้วแยกคำค้นด้วยช่องว่าง (ทุกคำต้องพบ) */
export function queryTokens(query) {
  return normalize(String(query || '').replace(RANK_IN_QUERY, ' ')).split(' ').filter(Boolean);
}

const haystacks = new WeakMap();
function haystackOf(m) {
  let h = haystacks.get(m);
  if (!h) {
    h = normalize(
      [m.first_name, m.last_name, m.nickname, m.position, m.province, m.division_bk, m.bureau_bch, m.agency,
        m.group_name, m.phone, String(m.phone || '').replace(/\D/g, ''), m.email,
        ...parseSocial(m.social).map((s) => s.value)].join(' '),
    );
    haystacks.set(m, h);
  }
  return h;
}

export function matchMember(m, tokens) {
  if (!tokens.length) return true;
  const h = haystackOf(m);
  return tokens.every((t) => h.includes(/^[\d-]+$/.test(t) ? t.replace(/-/g, '') : t) || h.includes(t));
}

/** เดาชื่อ: ให้คะแนนชื่อจริงที่ขึ้นต้นตรงก่อน ตามด้วยชื่อเล่น และนามสกุล */
export function guessMembers(members, query, limit = 6) {
  const t = queryTokens(query).join(' ');
  if (!t) return [];
  const scored = [];
  for (const m of members) {
    const f = normalize(m.first_name);
    const n = normalize(m.nickname);
    const l = normalize(m.last_name);
    let score = -1;
    if (f.startsWith(t)) score = 0;
    else if (n && n.startsWith(t)) score = 1;
    else if (f.includes(t)) score = 2;
    else if (n && n.includes(t)) score = 3;
    else if (l.startsWith(t)) score = 4;
    else if (`${f} ${l}`.includes(t)) score = 5;
    if (score >= 0) scored.push([score, m]);
  }
  scored.sort((a, b) => a[0] - b[0] || thCompare(a[1].first_name, b[1].first_name));
  return scored.slice(0, limit).map((x) => x[1]);
}

/* ------------------------------ วันที่/เวลา ------------------------------ */

export const pad2 = (n) => String(n).padStart(2, '0');

export const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function parseISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(a, b) {
  return Math.round((parseISODate(b) - parseISODate(a)) / 86400000);
}

const TH = 'th-TH-u-ca-buddhist';
const fmt = {
  long: new Intl.DateTimeFormat(TH, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  medium: new Intl.DateTimeFormat(TH, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }),
  weekday: new Intl.DateTimeFormat(TH, { weekday: 'short' }),
  month: new Intl.DateTimeFormat(TH, { month: 'short' }),
  monthYear: new Intl.DateTimeFormat(TH, { month: 'long', year: 'numeric' }),
  time: new Intl.DateTimeFormat(TH, { hour: '2-digit', minute: '2-digit', hour12: false }),
};

export function formatDate(iso, style = 'medium') {
  const d = parseISODate(iso);
  return d ? fmt[style].format(d) : iso || '';
}

export function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${fmt.medium.format(d)} ${fmt.time.format(d)} น.`;
}

/** "วันนี้" / "พรุ่งนี้" / "ศ. 27 พ.ย. 69" */
export function relativeDay(iso, today) {
  const diff = daysBetween(today, iso);
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'พรุ่งนี้';
  if (diff === -1) return 'เมื่อวาน';
  return formatDate(iso, 'medium');
}

export function timeRange(start, end) {
  if (start && end) return `${start} – ${end} น.`;
  if (start) return `${start} น.`;
  return 'ทั้งวัน';
}

/* ------------------------------ ตารางสอน ------------------------------ */

export const compareClass = (a, b) =>
  (a.class_date || '').localeCompare(b.class_date || '') ||
  (a.start_time || '').localeCompare(b.start_time || '') ||
  thCompare(a.subject, b.subject);

function atTime(day, hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!m) return null;
  const d = new Date(day);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/** 'past' | 'now' | 'upcoming' */
export function classStatus(c, now) {
  const day = parseISODate(c.class_date);
  if (!day) return 'upcoming';
  const start = atTime(day, c.start_time) || day;
  let end = atTime(day, c.end_time);
  if (!end) {
    end = c.start_time
      ? new Date(start.getTime() + 3 * 3600000)
      : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  }
  if (now >= end) return 'past';
  if (now >= start) return 'now';
  return 'upcoming';
}

/* ------------------------------ ตารางเวร ------------------------------ */

export const splitList = (s) =>
  String(s || '').split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);

const stripTitle = (name) =>
  String(name || '').replace(/^(รศ\.\s*)?พ\.\s*ต\.\s*อ\.?\s*(หญิง\s*)?|^(นางสาว|นาย|นาง)\s*/, '').replace(/\s+/g, ' ').trim();

/** จับคู่ผู้เข้าเวรกับทำเนียบรุ่น: ใช้ member_ids ก่อน ถ้าไม่มีจึงเทียบจากชื่อที่พิมพ์ในชีต */
export function resolveDuty(item, memberById, members) {
  const found = [];
  const extras = [];
  const seen = new Set();
  const ids = splitList(item.member_ids);
  ids.forEach((id) => {
    const m = memberById.get(id);
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      found.push(m);
    }
  });
  if (!found.length) {
    splitList(item.member_names).forEach((raw) => {
      const name = stripTitle(raw);
      const m =
        members.find((x) => fullName(x, false) === name) ||
        members.find((x) => x.first_name === name) ||
        members.find((x) => x.nickname && x.nickname === name);
      if (m && !seen.has(m.id)) {
        seen.add(m.id);
        found.push(m);
      } else if (!m) {
        extras.push(raw);
      }
    });
  }
  return { members: found, extras };
}

/* ------------------------------ React hooks ------------------------------ */

export function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* พื้นที่เก็บข้อมูลเต็มหรือถูกปิด — ข้ามได้ */
  }
}

/** useState ที่จำค่าล่าสุดไว้ใน localStorage ของเครื่องนั้น */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => readStored(key, initial));
  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeStored(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, set];
}

/** เวลาปัจจุบันที่อัปเดตเป็นระยะ (ใช้ไฮไลต์วิชาที่กำลังเรียน) */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return now;
}

/** 'sm' (มือถือ) | 'md' (แท็บเล็ต) | 'lg' (คอมพิวเตอร์) */
export function useBreakpoint() {
  const read = () => (window.innerWidth >= 1100 ? 'lg' : window.innerWidth >= 700 ? 'md' : 'sm');
  const [bp, setBp] = useState(read);
  useEffect(() => {
    const onResize = () => setBp(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}
