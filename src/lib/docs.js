import { compareClass, normalize, thCompare } from './utils';
import { bySort, FEATURED_SUBJECT, NON_SUBJECTS } from './course';

/** หมวดเอกสาร/สื่อการสอน (ค่าเดียวกับฝั่ง Code.gs) */
export const DOC_CATEGORIES = [
  { value: 'slide', label: 'สไลด์' },
  { value: 'doc', label: 'เอกสาร' },
  { value: 'video', label: 'วิดีโอ' },
  { value: 'link', label: 'ลิงก์' },
  { value: 'form', label: 'แบบฟอร์ม' },
  { value: 'other', label: 'อื่น ๆ' },
];
export const categoryLabel = (value) => (DOC_CATEGORIES.find((c) => c.value === value) || {}).label || 'เอกสาร';

/** หมวดของเอกสาร: ใช้ค่าที่แอดมินเลือก ถ้าไม่ได้เลือก เดาจากชนิดไฟล์/ลิงก์ */
export function docCategory(r) {
  if (r.category) return r.category;
  const mime = String(r.file_mime || '');
  const url = String(r.url || '').toLowerCase();
  if (/presentation|powerpoint/.test(mime) || /canva\.|docs\.google\.com\/presentation|\.pptx?(\?|$)/.test(url)) return 'slide';
  if (/^video\/|^audio\//.test(mime) || /youtu\.?be|vimeo\.com|\.mp4(\?|$)/.test(url)) return 'video';
  if (/docs\.google\.com\/forms|forms\.gle|forms\.office/.test(url)) return 'form';
  if (mime || /drive\.google\.com|docs\.google\.com|\.pdf(\?|$)|\.docx?(\?|$)/.test(url)) return 'doc';
  return 'link';
}

/** ชื่อวิชาสำหรับจับคู่ (ตัดคำว่า "วิชา" ด้านหน้า) */
export const subjectKey = (s) => String(s || '').replace(/^วิชา/, '').replace(/\s+/g, ' ').trim();

const CEREMONY = /ประกาศนียบัตร|พิธีปิด|พิธีเปิด/;

/**
 * รายวิชาทั้งหมด: วิชาในตารางสอน (ไม่รวมเวลาผู้บังคับบัญชา/ชี้แจง/พิธี) + วิชาที่มีงาน/เอกสารแต่ยังไม่อยู่ในตารางสอน
 * เรียงตามวันที่เรียนครั้งแรก (ลำดับเดียวกับตารางสอน)
 */
export function buildSubjects(classes, resources) {
  const map = new Map();
  const ensure = (name) => {
    const key = subjectKey(name);
    if (!key) return null;
    if (!map.has(key)) map.set(key, { key, name, sessions: [], docs: [], tasks: [], infos: [] });
    return map.get(key);
  };
  [...classes].sort(compareClass).forEach((c) => {
    if (!c.subject || NON_SUBJECTS.test(c.subject) || CEREMONY.test(c.subject)) return;
    ensure(c.subject).sessions.push(c);
  });
  [...resources].sort(bySort).forEach((r) => {
    const s = ensure(r.subject || 'ทั่วไป');
    if (!s) return;
    if (r.type === 'task') s.tasks.push(r);
    else if (r.type === 'info') s.infos.push(r);
    else s.docs.push(r);
  });
  const list = [...map.values()];
  list.forEach((s) => {
    s.tasks.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || bySort(a, b));
    s.first = s.sessions.length ? s.sessions[0].class_date : '';
    s.text = normalize([s.name, ...s.sessions.map((c) => `${c.topic} ${c.speaker}`), ...s.docs.map((d) => `${d.title} ${d.detail} ${d.topic}`)].join(' '));
  });
  return list.sort((a, b) => Number(b.name === FEATURED_SUBJECT) - Number(a.name === FEATURED_SUBJECT)
    || Number(!a.first) - Number(!b.first) || (a.first || '').localeCompare(b.first || '') || thCompare(a.name, b.name));
}

export function fileSizeLabel(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// ชนิดไฟล์ที่อัปโหลดได้ (ตรงกับ DOC_MIMES ใน Code.gs) — บางเครื่องไม่ส่ง type มา จึงเดาจากนามสกุล
const EXT_MIME = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  txt: 'text/plain', mp4: 'video/mp4', mp3: 'audio/mpeg', m4a: 'audio/mp4',
};
export const DOC_ACCEPT = Object.keys(EXT_MIME).map((e) => `.${e}`).join(',');
export const MAX_DOC_BYTES = 15 * 1024 * 1024;

export function docMime(file) {
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  const known = Object.values(EXT_MIME);
  if (file.type && known.includes(file.type)) return file.type;
  return EXT_MIME[ext] || '';
}
