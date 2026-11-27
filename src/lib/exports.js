/** Export ข้อมูลเป็นไฟล์ Excel: ตารางสอน ตารางเวร และทำเนียบรุ่น (ทุกช่องข้อมูล) */
import { downloadXlsx } from './xlsx';
import { compareClass, formatPhone, fullName, missingInfo, orgTypeOf, parseISODate, resolveDuty, thCompare, toISODate } from './utils';
import { memberSocials, platformOf, SOCIAL_PLATFORMS } from './social';
import { subjectKey } from './docs';
import { COURSE_TITLE_SHORT } from '../config';

const TH = 'th-TH-u-ca-buddhist';
const fmtWeekday = new Intl.DateTimeFormat(TH, { weekday: 'long' });
const fmtDate = new Intl.DateTimeFormat(TH, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtStamp = new Intl.DateTimeFormat(TH, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

const weekdayOf = (iso) => { const d = parseISODate(iso); return d ? fmtWeekday.format(d) : ''; };
const dateOf = (iso) => { const d = parseISODate(iso); return d ? fmtDate.format(d) : iso || ''; };
const asNumber = (v) => (/^\d+$/.test(String(v || '').trim()) ? Number(v) : v || '');
const title = (what) => `${COURSE_TITLE_SHORT} — ${what} (ข้อมูล ณ ${fmtStamp.format(new Date())} น.)`;
const fileName = (what) => `${what}_บตส61_${toISODate(new Date())}.xlsx`;

function mondayKey(iso) {
  const d = parseISODate(iso);
  if (!d) return '';
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISODate(d);
}

const personLabel = (m) => `${fullName(m)}${m.nickname ? ` (${m.nickname})` : ''}`;

/** ตารางสอนทั้งหลักสูตร: 1 แถวต่อ 1 คาบ ครบทุกช่องของตารางสอน + จำนวนเอกสารของวิชา */
export function exportClasses(classes, resources = []) {
  const list = [...(classes || [])].sort(compareClass);
  const weeks = [...new Set(list.map((c) => mondayKey(c.class_date)).filter(Boolean))].sort();
  const docCount = {};
  (resources || []).forEach((r) => {
    if (r.type === 'link' || !r.type) docCount[subjectKey(r.subject)] = (docCount[subjectKey(r.subject)] || 0) + 1;
  });
  const columns = [
    { label: 'ลำดับ', width: 7 }, { label: 'สัปดาห์ที่', width: 9 }, { label: 'วัน' }, { label: 'วันที่' },
    { label: 'เวลาเริ่ม', width: 9 }, { label: 'เวลาสิ้นสุด', width: 10 }, { label: 'วิชา' }, { label: 'หัวข้อ' },
    { label: 'ประเภท' }, { label: 'คาบ/ครั้งที่' }, { label: 'ผู้บรรยาย' }, { label: 'เลขาฯวิชา' }, { label: 'สถานที่' },
    { label: 'หมายเหตุ' }, { label: 'เอกสารของวิชา', width: 12 },
  ];
  const rows = list.map((c, i) => [
    i + 1,
    weeks.indexOf(mondayKey(c.class_date)) + 1 || '',
    weekdayOf(c.class_date),
    dateOf(c.class_date),
    c.start_time || '',
    c.end_time || '',
    c.subject || '',
    c.topic || '',
    c.kind || '',
    asNumber(c.session),
    c.speaker || '',
    c.secretary || '',
    c.location || '',
    c.note || '',
    docCount[subjectKey(c.subject)] || '',
  ]);
  downloadXlsx(fileName('ตารางสอน'), [{ name: 'ตารางสอน', title: title('ตารางสอน'), columns, rows }]);
  return rows.length;
}

/** ตารางเวรทั้งหมด: 1 แถวต่อ 1 เวร พร้อมรายชื่อเต็ม (ยศ ชื่อ สกุล ชื่อเล่น) และเบอร์โทร */
export function exportDuty(duty, members, memberById) {
  const list = [...(duty || [])].sort((a, b) => (a.duty_date || '').localeCompare(b.duty_date || '') || thCompare(a.shift_or_role, b.shift_or_role));
  const columns = [
    { label: 'ลำดับ', width: 7 }, { label: 'วัน' }, { label: 'วันที่' }, { label: 'หน้าที่ / เวร' },
    { label: 'ผู้เข้าเวร' }, { label: 'เบอร์โทร' }, { label: 'จำนวน (คน)', width: 10 }, { label: 'หมายเหตุ' },
  ];
  const rows = list.map((item, i) => {
    const people = resolveDuty(item, memberById, members || []);
    const names = [...people.members.map(personLabel), ...people.extras];
    return [
      i + 1,
      weekdayOf(item.duty_date),
      dateOf(item.duty_date),
      item.shift_or_role || '',
      names.join('\n'),
      people.members.map((m) => formatPhone(m.phone) || '-').join('\n'),
      names.length || '',
      item.note || '',
    ];
  });
  downloadXlsx(fileName('ตารางเวร'), [{ name: 'ตารางเวร', title: title('ตารางเวร'), columns, rows }]);
  return rows.length;
}

/** ทำเนียบรุ่น: ทุกช่องข้อมูลของสมาชิก โซเชียลแยกคอลัมน์ตามแพลตฟอร์ม (เฉพาะที่มีคนกรอก) */
export function exportMembers(members, { label = 'ทำเนียบรุ่น' } = {}) {
  const list = members || [];
  const used = new Set();
  list.forEach((m) => memberSocials(m).forEach((s) => used.add(platformOf(s.type).key)));
  const platforms = SOCIAL_PLATFORMS.filter((p) => used.has(p.key));
  const columns = [
    { label: 'ลำดับ', width: 7 }, { label: 'ยศ / คำนำหน้า' }, { label: 'ชื่อ' }, { label: 'นามสกุล' }, { label: 'ชื่อเล่น' },
    { label: 'ตำแหน่ง' }, { label: 'ประเภท' }, { label: 'บก. (กองบังคับการ)' }, { label: 'บช. (กองบัญชาการ)' }, { label: 'หน่วยงาน' },
    { label: 'จังหวัด' }, { label: 'กลุ่ม' }, { label: 'เบอร์โทร' }, { label: 'อีเมล' },
    ...platforms.map((p) => ({ label: p.label })),
    { label: 'รูปถ่าย', width: 9 }, { label: 'ข้อมูลที่ยังขาด' },
  ];
  const rows = list.map((m) => {
    const socials = memberSocials(m);
    return [
      asNumber(m.seq),
      m.rank || '',
      m.first_name || '',
      m.last_name || '',
      m.nickname || '',
      m.position || '',
      orgTypeOf(m) === 'other' ? 'หน่วยงานอื่น' : 'ตำรวจ',
      m.division_bk || '',
      m.bureau_bch || '',
      m.agency || '',
      m.province || '',
      m.group_name || '',
      formatPhone(m.phone) || '',
      m.email || '',
      ...platforms.map((p) => socials.filter((s) => platformOf(s.type).key === p.key).map((s) => s.value).join('\n')),
      m.photo_url ? 'มี' : 'ไม่มี',
      missingInfo(m).join(', '),
    ];
  });
  downloadXlsx(fileName(label), [{ name: 'ทำเนียบรุ่น', title: title(label), columns, rows }]);
  return rows.length;
}
