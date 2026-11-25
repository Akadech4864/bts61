/**
 * โหมดตัวอย่าง (Demo) — จำลอง Backend ไว้ในเบราว์เซอร์ด้วยข้อมูลสมมติ
 * ถูกโหลดเฉพาะเมื่อยังไม่ได้ใส่ GAS_WEB_APP_URL ใน src/config.js เท่านั้น
 * รหัสผ่านแอดมินของโหมดตัวอย่างคือ "demo" (ไม่เกี่ยวกับรหัสผ่านจริงของระบบ)
 */
import { ApiError } from './api';
import { addDays, normalizeProvince, toISODate } from './utils';
import { parseSocial } from './social';

const KEY = 'bts61:demo:v2';
const DEMO_PASSWORD = 'demo';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

function seed() {
  const people = [
    ['กิตติ', 'ตัวอย่างดี', 'กิต', 'รอง ผบก.น.1', 'น.1', 'บช.น.', 'กรุงเทพฯ'],
    ['ขจร', 'สมมติวงศ์', 'โจ', 'รอง ผบก.ภ.จว.เชียงใหม่', 'ภ.จว.เชียงใหม่', 'ภ.5', 'เชียงใหม่'],
    ['คมสัน', 'ทดลองกิจ', 'คม', 'รอง ผบก.ป.', 'ป.', 'บช.ก.', 'กรุงเทพฯ'],
    ['จักรพันธ์', 'นามสมมติ', 'เอ', 'รอง ผบก.ภ.จว.ขอนแก่น', 'ภ.จว.ขอนแก่น', 'ภ.4', 'ขอนแก่น'],
    ['ชนินทร์', 'ตัวอย่างสกุล', 'นิน', 'รอง ผบก.สอท.1', 'สอท.1', 'บช.สอท.', ''],
    ['ณรงค์', 'สาธิตการ', 'รงค์', 'รอง ผบก.ภ.จว.ภูเก็ต', 'ภ.จว.ภูเก็ต', 'ภ.8', 'ภูเก็ต'],
    ['ดารณี', 'สมมติธรรม', 'ดา', 'รอง ผบก.กง.', 'กง.', 'สงป.', '', 'พ.ต.อ.หญิง'],
    ['ธนากร', 'ทดสอบชัย', 'ต้น', 'รอง ผบก.ตม.1', 'ตม.1', 'สตม.', 'กรุงเทพฯ'],
    ['นิพนธ์', 'ตัวอย่างพงศ์', 'นิ', 'รอง ผบก.ภ.จว.ชลบุรี', 'ภ.จว.ชลบุรี', 'ภ.2', 'ชลบุรี'],
    ['ปกรณ์', 'สมมติศักดิ์', 'กรณ์', 'รอง ผบก.ภ.จว.สงขลา', 'ภ.จว.สงขลา', 'ภ.9', 'สงขลา'],
    ['พงศกร', 'สาธิตวงศ์', 'บอย', 'รอง ผบก.ปส.1', 'ปส.1', 'บช.ปส.', ''],
    ['ภาณุ', 'ทดลองศรี', 'นุ', 'รอง ผบก.ภ.จว.เชียงราย', 'ภ.จว.เชียงราย', 'ภ.5', 'เชียงราย'],
    ['มนตรี', 'ตัวอย่างชัย', 'ตรี', 'รอง ผบก.น.5', 'น.5', 'บช.น.', 'กรุงเทพฯ'],
    ['รัชนี', 'สมมติกุล', 'นี', 'นวท.(สบ 5) ศพฐ.1', 'ศพฐ.1', 'สพฐ.ตร.', '', 'พ.ต.อ.หญิง'],
    ['วีรยุทธ', 'ทดสอบพล', 'ยุทธ', 'รอง ผบก.ภ.จว.นครราชสีมา', 'ภ.จว.นครราชสีมา', 'ภ.3', 'นครราชสีมา'],
    ['ศักดา', 'สาธิตกิจ', 'ดา', 'รอง ผบก.ทท.1', 'ทท.1', 'บช.ทท.', ''],
    ['สมพร', 'ตัวอย่างศรี', '', 'รอง ผบก.ภ.จว.นครปฐม', 'ภ.จว.นครปฐม', 'ภ.7', 'นครปฐม'],
    ['อนันต์', 'สมมติพร', 'นันต์', 'อาจารย์ (สบ 5) กอจ.', 'กอจ.', 'บช.ศ.', ''],
    ['สุนทร', 'ตัวอย่างการ', 'ทร', 'ผู้อำนวยการสำนักตัวอย่าง', '', '', 'กรุงเทพฯ', 'นาย', 'หน่วยงานตัวอย่าง'],
  ];
  const DEMO_SOCIAL = {
    0: [{ type: 'line', value: 'demo.line01' }, { type: 'facebook', value: 'ตัวอย่าง สมมติ' }, { type: 'instagram', value: '@demo.sample' }],
    1: [{ type: 'tiktok', value: 'demo_sample' }, { type: 'website', value: 'www.example.com' }],
  };
  const members = people.map((p, i) => ({
    id: `m_demo${i + 1}`,
    seq: String(i + 1),
    rank: p[7] || 'พ.ต.อ.',
    agency: p[8] || '',
    first_name: p[0],
    last_name: p[1],
    nickname: p[2],
    position: p[3],
    division_bk: p[4],
    bureau_bch: p[5],
    province: p[6],
    phone: `08000000${String(i + 1).padStart(2, '0')}`,
    photo_url: '',
    photo_file_id: '',
    social: DEMO_SOCIAL[i] ? JSON.stringify(DEMO_SOCIAL[i]) : '',
    group_name: `กลุ่ม ${(i % 4) + 1}`,
    updated_at: now(),
  }));

  const today = toISODate(new Date());
  const cls = (offset, start, end, subject, speaker, location, note = '') => ({
    id: uid('c'), class_date: addDays(today, offset), start_time: start, end_time: end, subject, speaker, location, note, updated_at: now(),
  });
  const classes = [
    cls(-1, '09:00', '12:00', 'ยุทธศาสตร์ชาติกับการบริหารงานตำรวจ', 'วิทยากรตัวอย่าง ก.', 'ห้องเรียนรวม ชั้น 2'),
    cls(0, '08:00', '09:00', 'กิจกรรมหน้าเสาธงและอบรมประจำวัน', 'ผู้อำนวยการหลักสูตร', 'ลานอเนกประสงค์'),
    cls(0, '09:00', '12:00', 'ภาวะผู้นำเชิงกลยุทธ์สำหรับผู้บังคับการ', 'วิทยากรตัวอย่าง ข.', 'ห้องเรียนรวม ชั้น 2', 'เตรียมกรณีศึกษาจากหน่วยของตนเอง'),
    cls(0, '13:00', '16:00', 'การบริหารงานสืบสวนสอบสวนยุคดิจิทัล', 'วิทยากรตัวอย่าง ค.', 'ห้องเรียนรวม ชั้น 2'),
    cls(0, '18:30', '21:30', 'สัมมนากลุ่มย่อย (ภาคค่ำ)', 'อาจารย์ประจำกลุ่ม', 'ห้องสัมมนา 1–4'),
    cls(1, '09:00', '12:00', 'การบริหารงบประมาณและพัสดุ', 'วิทยากรตัวอย่าง ง.', 'ห้องเรียนรวม ชั้น 2'),
    cls(1, '13:00', '16:00', 'การสื่อสารในภาวะวิกฤต', 'วิทยากรตัวอย่าง จ.', 'ห้องเรียนรวม ชั้น 2'),
    cls(2, '09:00', '16:00', 'ศึกษาดูงานนอกสถานที่', 'คณะอาจารย์', 'ขึ้นรถหน้าอาคารอำนวยการ 07:30 น.', 'แต่งกายชุดสุภาพ'),
    cls(5, '09:00', '12:00', 'กฎหมายปกครองสำหรับผู้บริหาร', 'วิทยากรตัวอย่าง ฉ.', 'ห้องเรียนรวม ชั้น 2'),
  ];

  const names = (ids) => ids.map((i) => `พ.ต.อ. ${people[i][0]} ${people[i][1]}`).join(', ');
  const duty = (offset, role, idx, note = '') => ({
    id: uid('d'), duty_date: addDays(today, offset), shift_or_role: role,
    member_ids: idx.map((i) => members[i].id).join(','), member_names: names(idx), note, updated_at: now(),
  });
  const dutyList = [
    duty(-1, 'หัวหน้านักศึกษาเวรประจำวัน', [16]),
    duty(0, 'หัวหน้านักศึกษาเวรประจำวัน', [0], 'รายงานยอดเวลา 07:45 น.'),
    duty(0, 'เวรรักษาการณ์อาคารที่พัก', [3, 5, 8]),
    duty(1, 'หัวหน้านักศึกษาเวรประจำวัน', [1]),
    duty(1, 'เวรรักษาการณ์อาคารที่พัก', [2, 9, 12]),
    duty(2, 'หัวหน้านักศึกษาเวรประจำวัน', [4]),
    duty(3, 'เวรรักษาการณ์อาคารที่พัก', [0, 10, 14]),
  ];

  return {
    members,
    classes,
    duty: dutyList,
    settings: { public_edit_enabled: true, allow_public_add: true, allow_public_edit: true, allow_public_photo_edit: true },
    password: DEMO_PASSWORD,
    otp: null,
    tokens: [],
  };
}

let db;
function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    db = null;
  }
  if (!db || !Array.isArray(db.members)) db = seed();
  return db;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* รูปตัวอย่างอาจใหญ่เกินโควตา localStorage — ใช้ค่าในหน่วยความจำต่อได้ */
  }
}

const fail = (code, message, extra) => {
  throw new ApiError(message, code, extra);
};

const isAdmin = (token) => !!token && load().tokens.includes(token);
const requireAdmin = (p) => isAdmin(p.token) || fail('UNAUTHORIZED', 'เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');

function newSession() {
  const token = uid('tok');
  db.tokens = [...db.tokens.slice(-4), token];
  return { token, expiresAt: Date.now() + 24 * 3600000, usingDefaultPassword: db.password === DEMO_PASSWORD };
}

function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) list.push(item);
  else list[i] = item;
}

function remove(list, id) {
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) fail('NOT_FOUND', 'ไม่พบรายการนี้ อาจถูกลบไปแล้ว');
  list.splice(i, 1);
  return { id };
}

const actions = {
  bootstrap(p) {
    const out = { members: db.members, duty: db.duty, classes: db.classes, settings: db.settings, serverTime: now() };
    if (p.token) out.isAdmin = isAdmin(p.token);
    return out;
  },
  login(p) {
    if (String(p.password || '') !== db.password) fail('WRONG_PASSWORD', 'รหัสผ่านไม่ถูกต้อง (โหมดตัวอย่างใช้รหัส demo)');
    return newSession();
  },
  requestOtp() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.otp = { code, expiresAt: Date.now() + 10 * 60000 };
    return { sentTo: 'โหมดตัวอย่าง', expiresAt: db.otp.expiresAt, ttlMinutes: 10, cooldownSeconds: 10, demoOtp: code };
  },
  verifyOtp(p) {
    if (!db.otp || db.otp.expiresAt < Date.now()) fail('OTP_EXPIRED', 'รหัส OTP หมดอายุ กรุณาขอรหัสใหม่');
    if (String(p.otp || '') !== db.otp.code) fail('OTP_INVALID', 'รหัส OTP ไม่ถูกต้อง');
    db.otp.ticket = uid('ticket');
    return { ticket: db.otp.ticket, expiresAt: db.otp.expiresAt };
  },
  resetPassword(p) {
    if (!db.otp || !db.otp.ticket || db.otp.ticket !== p.ticket) fail('OTP_EXPIRED', 'การยืนยัน OTP หมดอายุ กรุณาขอรหัสใหม่');
    if (String(p.newPassword || '').length < 4) fail('WEAK_PASSWORD', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 4 ตัวอักษร');
    db.password = String(p.newPassword);
    db.otp = null;
    db.tokens = [];
    return newSession();
  },
  saveSettings(p) {
    requireAdmin(p);
    db.settings = { ...db.settings, ...(p.settings || {}) };
    return db.settings;
  },
  saveMember(p) {
    const input = p.member || {};
    const admin = isAdmin(p.token);
    const s = db.settings;
    const perms = {
      add: admin || (s.public_edit_enabled && s.allow_public_add),
      edit: admin || (s.public_edit_enabled && s.allow_public_edit),
      photo: admin || (s.public_edit_enabled && s.allow_public_photo_edit),
    };
    const existing = input.id ? db.members.find((m) => m.id === input.id) : null;
    if (input.id && !existing) fail('NOT_FOUND', 'ไม่พบรายชื่อนี้ อาจถูกลบไปแล้ว');
    const isNew = !existing;
    const canInfo = isNew ? perms.add : perms.edit;
    const wantsPhoto = !!p.photo || p.removePhoto;
    if (isNew && !canInfo) fail('FORBIDDEN', 'ผู้ดูแลยังไม่เปิดให้เพิ่มรายชื่อใหม่');
    if (!isNew && !canInfo && !(wantsPhoto && perms.photo)) fail('FORBIDDEN', 'ผู้ดูแลยังไม่เปิดให้แก้ไขข้อมูล');
    if (wantsPhoto && !perms.photo) fail('FORBIDDEN', 'ผู้ดูแลยังไม่เปิดให้อัปโหลดหรือเปลี่ยนรูปถ่าย');

    const record = existing
      ? { ...existing }
      : { id: uid('m'), seq: '', rank: '', first_name: '', last_name: '', nickname: '', position: '', province: '', division_bk: '', bureau_bch: '', agency: '', phone: '', photo_url: '', photo_file_id: '', group_name: '', social: '' };
    if (canInfo) {
      ['rank', 'first_name', 'last_name', 'nickname', 'position', 'province', 'division_bk', 'bureau_bch', 'agency', 'phone'].forEach((f) => {
        if (input[f] !== undefined) record[f] = String(input[f]).trim();
      });
      if (input.social !== undefined) {
        const list = parseSocial(input.social);
        record.social = list.length ? JSON.stringify(list) : '';
      }
      if (admin) {
        if (input.group_name !== undefined) record.group_name = String(input.group_name).trim();
        if (input.seq !== undefined) record.seq = String(input.seq).replace(/\D/g, '');
      }
    }
    record.province = normalizeProvince(record.province);
    if (!record.first_name) fail('VALIDATION', 'กรุณากรอกชื่อจริง');
    const key = (m) => `${m.first_name}|${m.last_name}`.replace(/\s+/g, '');
    const dup = db.members.find((m) => m.id !== record.id && key(m) === key(record));
    if (dup) fail('DUPLICATE', `มีรายชื่อ "${record.first_name} ${record.last_name}" อยู่ในระบบแล้ว`, { existingId: dup.id });
    if (canInfo && !record.rank) fail('VALIDATION', 'กรุณาเลือกคำนำหน้า / ยศ');

    if (p.photo) {
      record.photo_url = `data:${p.photo.mimeType};base64,${p.photo.base64}`;
      record.photo_file_id = uid('file');
    } else if (p.removePhoto) {
      record.photo_url = '';
      record.photo_file_id = '';
    }
    record.updated_at = now();
    upsert(db.members, record);
    return record;
  },
  deleteMember(p) {
    requireAdmin(p);
    return remove(db.members, p.id);
  },
  saveDuty(p) {
    requireAdmin(p);
    const input = p.item || {};
    if (!input.duty_date) fail('VALIDATION', 'กรุณาระบุวันที่เข้าเวร');
    const record = {
      id: input.id || uid('d'),
      duty_date: input.duty_date,
      shift_or_role: String(input.shift_or_role || '').trim(),
      member_ids: Array.isArray(input.member_ids) ? input.member_ids.join(',') : String(input.member_ids || ''),
      member_names: String(input.member_names || ''),
      note: String(input.note || '').trim(),
      updated_at: now(),
    };
    if (!record.shift_or_role && !record.member_ids) fail('VALIDATION', 'กรุณาระบุหน้าที่/ชุดเวร หรือรายชื่อผู้เข้าเวร');
    upsert(db.duty, record);
    return record;
  },
  deleteDuty(p) {
    requireAdmin(p);
    return remove(db.duty, p.id);
  },
  saveClass(p) {
    requireAdmin(p);
    const input = p.item || {};
    if (!input.class_date) fail('VALIDATION', 'กรุณาระบุวันที่เรียน');
    if (!String(input.subject || '').trim()) fail('VALIDATION', 'กรุณาระบุหัวข้อวิชา');
    const record = {
      id: input.id || uid('c'),
      class_date: input.class_date,
      start_time: input.start_time || '',
      end_time: input.end_time || '',
      subject: String(input.subject).trim(),
      speaker: String(input.speaker || '').trim(),
      location: String(input.location || '').trim(),
      note: String(input.note || '').trim(),
      updated_at: now(),
    };
    upsert(db.classes, record);
    return record;
  },
  deleteClass(p) {
    requireAdmin(p);
    return remove(db.classes, p.id);
  },
};

export async function handle(action, payload) {
  load();
  await sleep(action === 'bootstrap' ? 450 : 350);
  if (!actions[action]) fail('UNKNOWN_ACTION', `ไม่รู้จักคำสั่ง: ${action}`);
  const result = actions[action](payload || {});
  save();
  return JSON.parse(JSON.stringify(result));
}
