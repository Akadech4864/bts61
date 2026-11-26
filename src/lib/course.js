/**
 * ตัวช่วยสำหรับข้อมูลหลักสูตร: ผู้บริหาร (staff) อาจารย์ (instructors) งาน/เอกสาร (resources) และตารางสอน
 */
import { thCompare, toArabicDigits } from './utils';

export const KIND_OPTIONS = [
  { value: 'p', label: 'อาจารย์ประจำ' },
  { value: 'e', label: 'อาจารย์พิเศษ' },
];

export const RESOURCE_TYPES = [
  { value: 'link', label: 'เอกสาร/ลิงก์' },
  { value: 'task', label: 'กำหนดส่งงาน' },
  { value: 'info', label: 'ข้อมูล' },
];

/** วิชาที่แสดงก่อนในหน้างาน/เอกสาร */
export const FEATURED_SUBJECT = 'วิชาเอกสารศึกษา';

/** ประเภทการเรียนในตารางสอน -> สีป้าย */
const KIND_TONES = [
  [/บรรยาย/, 'bg-navy-500/10 text-navy-700'],
  [/ฝึก/, 'bg-emerald-500/15 text-emerald-700'],
  [/สัมมนา/, 'bg-violet-500/15 text-violet-700'],
  [/อภิปราย/, 'bg-sky-500/15 text-sky-700'],
  [/ดูงาน/, 'bg-gold-400/25 text-gold-700'],
  [/เสนอผล/, 'bg-rose-500/15 text-rose-700'],
];
export const CLASS_KINDS = ['บรรยาย', 'ฝึกปฏิบัติ', 'สัมมนากลุ่ม', 'อภิปราย', 'ศึกษาดูงาน', 'เสนอผล'];
export function kindTone(kind) {
  const hit = KIND_TONES.find(([re]) => re.test(kind || ''));
  return hit ? hit[1] : 'bg-slate-500/10 text-slate-600';
}

const TITLE_PREFIX = /^(?:(?:ผศ|ศ|รศ)\.|ดร\.|ม\.ล\.|ม\.ร\.ว\.|ว่าที่\s*|(?:พล|พ|ร)\.\s?[ตอทจ]\.\s?[อทตห]\.|ด\.ต\.|จ\.ส\.ต\.|หญิง|นางสาว|นาย|นาง|\s+)+/;

/** ชื่อโดยตัดยศ/คำนำหน้า/คำนำหน้าวิชาการ ออก (ใช้ทำอักษรย่อบนรูป) */
export const stripTitles = (name) => String(name || '').replace(TITLE_PREFIX, '').trim() || String(name || '').trim();

/** ข้อมูลสำหรับ <Photo>: ผู้บริหารมีชื่อเล่น/ชื่อจริงอยู่แล้ว ส่วนอาจารย์มีแค่ชื่อเต็ม */
export function faceOf(record) {
  if (!record) return null;
  if (record.first_name || record.nickname) return record;
  return { id: record.id, photo_url: record.photo_url, first_name: stripTitles(record.name) };
}

const num = (v) => (String(v || '').trim() === '' ? 99999 : Number(v));

/** เรียงตามลำดับที่กำหนด (ว่าง = ท้ายสุด) แล้วตามชื่อ */
export const bySort = (a, b) => num(a.sort) - num(b.sort) || thCompare(a.name || a.first_name || a.title, b.name || b.first_name || b.title);

/** "ชื่อวิชา|บทบาท" ทีละบรรทัด -> [{ name, role, code }] */
export function parseSubjects(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const i = line.lastIndexOf('|');
      const name = toArabicDigits(i === -1 ? line : line.slice(0, i)).replace(/\s+/g, ' ').trim();
      const role = toArabicDigits(i === -1 ? '' : line.slice(i + 1)).trim();
      const code = (/^(\d+(?:\.\d+)*)\s/.exec(name) || [])[1] || '';
      return { name, role, code };
    })
    .filter((s) => s.name);
}

/** เรียงรหัสวิชาแบบตัวเลข (1.1.9 มาก่อน 1.1.10) */
export function compareCode(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/** ชื่อวิชาโดยตัดรหัสข้างหน้าออก */
export const subjectTitle = (s) => s.name.replace(/^\d+(?:\.\d+)*\s+/, '');

export const isLead = (role) => /ผู้รับผิดชอบ|ผู้ประสานงาน/.test(role || '');

/** "ชื่อ|url" ทีละบรรทัด -> [{ label, url }] เฉพาะลิงก์ http(s) */
export function parseLinks(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const i = line.lastIndexOf('|');
      const url = (i === -1 ? line : line.slice(i + 1)).trim();
      const label = (i === -1 ? '' : line.slice(0, i)).trim() || 'ลิงก์';
      return { label, url };
    })
    .filter((l) => /^https?:\/\/\S+$/i.test(l.url));
}

/** ลิงก์ที่ปลอดภัยสำหรับ href (http/https เท่านั้น) */
export const safeHref = (url) => (/^https?:\/\/\S+$/i.test(String(url || '').trim()) ? String(url).trim() : '');

/** ข้อความหลายบรรทัด -> [{ label, text }] ("หัวข้อ: รายละเอียด" แยกหัวข้อออกมา) */
export function detailLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^([^:：]{2,48})[:：]\s*(.+)$/.exec(line);
      return m && !/^https?$/i.test(m[1]) ? { label: m[1].trim(), text: m[2].trim() } : { label: '', text: line };
    });
}

/** ชื่อผู้บรรยายสำหรับจัดกลุ่ม: ตัด "และคณะ" ออก */
export const speakerKey = (name) => String(name || '').replace(/\s*และคณะ\s*$/, '').trim();

/** รายการในตารางสอนที่ไม่นับเป็นวิชา (ไม่แสดงในรายชื่อผู้บรรยาย) */
export const NON_SUBJECTS = /^(เวลาผู้บังคับบัญชา|ศึกษาค้นคว้า|รายงานตัว|กิจกรรมผู้เข้ารับการฝึกอบรม|ปฐมนิเทศ|ชี้แจง)/;
