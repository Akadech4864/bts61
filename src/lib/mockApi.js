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
    2: [{ type: 'telegram', value: 'demo_tg' }, { type: 'whatsapp', value: '0800000003' }, { type: 'lemon8', value: 'demo.l8' }, { type: 'youtube', value: 'demochannel' },
      { type: 'x', value: '@demo_x' }, { type: 'threads', value: 'demo.th' }, { type: 'linkedin', value: 'demo-in' }, { type: 'wechat', value: 'demo_wc' }],
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
    email: i === 0 ? 'demo.member01@example.com' : '',
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
    { ...cls(-1, '09:00', '12:00', 'วิชาเอกสารศึกษา', 'วิทยากรตัวอย่าง ก.', 'ห้องเรียนรวม ชั้น 2'), topic: 'เสนอหัวข้อกรณีศึกษา / แนะนำการเขียน บทที่ 1 และบทที่ 2', kind: 'บรรยาย', session: '1/6', secretary: 'อาจารย์ตัวอย่าง ข.' },
    cls(0, '08:00', '09:00', 'กิจกรรมหน้าเสาธงและอบรมประจำวัน', 'ผู้อำนวยการหลักสูตร', 'ลานอเนกประสงค์'),
    { ...cls(0, '09:00', '12:00', 'การเสริมสร้างคุณค่าการเป็นผู้นำ', 'วิทยากรตัวอย่าง ข.', 'ห้องเรียนรวม ชั้น 2', 'เตรียมกรณีศึกษาจากหน่วยของตนเอง'), topic: 'ภาวะผู้นำเชิงกลยุทธ์', kind: 'ฝึกปฏิบัติ', session: '4/23', secretary: 'อาจารย์ตัวอย่าง ค.' },
    cls(0, '13:00', '16:00', 'การบริหารงานสืบสวนสอบสวนยุคดิจิทัล', 'วิทยากรตัวอย่าง ค.', 'ห้องเรียนรวม ชั้น 2'),
    cls(0, '18:30', '21:30', 'สัมมนากลุ่มย่อย (ภาคค่ำ)', 'อาจารย์ประจำกลุ่ม', 'ห้องสัมมนา 1–4'),
    cls(1, '09:00', '12:00', 'การบริหารงบประมาณและพัสดุ', 'วิทยากรตัวอย่าง ง.', 'ห้องเรียนรวม ชั้น 2'),
    cls(1, '13:00', '16:00', 'การสื่อสารในภาวะวิกฤต', 'วิทยากรตัวอย่าง จ.', 'ห้องเรียนรวม ชั้น 2'),
    cls(2, '09:00', '16:00', 'ศึกษาดูงานนอกสถานที่', 'คณะอาจารย์', 'ขึ้นรถหน้าอาคารอำนวยการ 07:30 น.', 'แต่งกายชุดสุภาพ'),
    cls(5, '09:00', '12:00', 'กฎหมายปกครองสำหรับผู้บริหาร', 'วิทยากรตัวอย่าง ฉ.', 'ห้องเรียนรวม ชั้น 2'),
    { ...cls(8, '13:00', '16:00', 'วิชาเอกสารศึกษา', 'วิทยากรตัวอย่าง ก.', 'ห้องเรียนรวม ชั้น 2'), topic: 'ปรับแก้ไขงาน / แนะนำการเขียน บทที่ 2', kind: 'สัมมนากลุ่ม', session: '2/6' },
  ];
  const staff = demoStaff();
  const instructors = demoInstructors();
  const resources = demoResources(today);

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
    staff,
    instructors,
    resources,
    settings: { public_edit_enabled: true, allow_public_add: true, allow_public_edit: true, allow_public_photo_edit: true },
    password: DEMO_PASSWORD,
    otp: null,
    tokens: [],
  };
}

/* ---------- ข้อมูลหลักสูตรสมมติ (ผู้บริหาร / อาจารย์ / งานและเอกสาร) ---------- */
function demoStaff() {
  return [
    ['พล.ต.ต.', 'ตัวอย่าง', 'ผู้อำนวยการ', 'ผอ.', 'ผู้อำนวยการหลักสูตร'],
    ['พ.ต.อ.', 'สมมติ', 'รองหลักสูตร', 'รอง', 'รอง ผอ.หลักสูตร'],
    ['พ.ต.ท.หญิง', 'ทดสอบ', 'เลขาหลักสูตร', 'เลขา', 'เลขานุการหลักสูตร'],
    ['ด.ต.', 'สาธิต', 'เจ้าหน้าที่', 'ดิต', 'เจ้าหน้าที่'],
  ].map((x, i) => ({
    id: uid('s'), sort: String(i + 1), rank: x[0], first_name: x[1], last_name: x[2], nickname: x[3], role: x[4],
    phone: `08100000${String(i + 1).padStart(2, '0')}`, photo_url: '', photo_file_id: '', updated_at: now(),
  }));
}

const DEMO_PROFILE = [
  '# ข้อมูลทั่วไป', 'ตำแหน่งปัจจุบัน: อาจารย์ (ตัวอย่าง)', 'สังกัด: หน่วยงานตัวอย่าง',
  '# ข้อมูลการติดต่อ', 'อีเมล: demo.instructor@example.com',
  '# ประวัติการศึกษา', 'ปริญญาเอก: ปรัชญาดุษฎีบัณฑิต มหาวิทยาลัยตัวอย่าง', 'ปริญญาโท: นิติศาสตรมหาบัณฑิต มหาวิทยาลัยตัวอย่าง',
  '# ประวัติการฝึกอบรม', 'หลักสูตรตัวอย่าง รุ่นที่ 1', 'หลักสูตรตัวอย่าง รุ่นที่ 2', 'หลักสูตรตัวอย่าง รุ่นที่ 3', 'หลักสูตรตัวอย่าง รุ่นที่ 4',
  'หลักสูตรตัวอย่าง รุ่นที่ 5', 'หลักสูตรตัวอย่าง รุ่นที่ 6', 'หลักสูตรตัวอย่าง รุ่นที่ 7', 'หลักสูตรตัวอย่าง รุ่นที่ 8',
  '# ประสบการณ์การเป็นวิทยากร', 'หัวข้อตัวอย่าง — หน่วยงานตัวอย่าง',
].join('\n');

function demoInstructors() {
  return [
    [1, 'e', 'ผศ.ดร.ตัวอย่าง วิชาการ', 'อาจารย์มหาวิทยาลัยตัวอย่าง', ['1.3 สัมมนากลุ่มวิชาบริหารจัดการ|อาจารย์พิเศษ', '5 วิชาเอกสารศึกษา|อาจารย์พิเศษ']],
    [1, 'p', 'พ.ต.ท.หญิง สมมติ สอนดี', 'อาจารย์ (สบ 3) ตัวอย่าง', ['2.2 การบูรณาการการสืบสวนสอบสวนชั้นสูง|อาจารย์ประจำ/ผู้รับผิดชอบวิชา', '5 วิชาเอกสารศึกษา|อาจารย์ประจำ']],
    [2, 'p', 'พ.ต.อ.ดร.ทดสอบ ความรู้', 'อาจารย์ (สบ 5) ตัวอย่าง', ['1.1.3 การนำนโยบายและยุทธศาสตร์สู่การปฏิบัติ|อาจารย์ประจำ/ผู้รับผิดชอบวิชา', '1.3 สัมมนากลุ่มวิชาบริหารจัดการ|อาจารย์ประจำ', '5 วิชาเอกสารศึกษา|อาจารย์ประจำ']],
    [2, 'p', 'พ.ต.ต.หญิง สาธิต ใจดี', 'อาจารย์ (สบ 2) ตัวอย่าง', ['2.3 สัมมนาปัญหาการบริหารงานจราจร|อาจารย์ประจำ', '5 วิชาเอกสารศึกษา|อาจารย์ประจำ']],
  ].map((x, i) => ({
    id: uid('i'), sort: String(i + 1), group_no: String(x[0]), kind: x[1], name: x[2], position: x[3], subjects: x[4].join('\n'),
    expertise: 'หัวข้อตัวอย่าง', education: 'ป.เอก (ตัวอย่าง)', links: i === 0 ? 'ไฟล์ประวัติส่วนบุคคล|https://www.example.com/' : '', phone: '',
    profile: i === 0 ? DEMO_PROFILE : '', photo_url: '', photo_file_id: '', updated_at: now(),
  }));
}

function demoResources(today) {
  return [
    ['link', 'สื่อประกอบการเรียน (ตัวอย่าง)', 'ลิงก์ตัวอย่างของเอกสารประกอบการเรียน', 'https://www.example.com/', '', ''],
    ['task', 'ส่งงานครั้งที่ 1', '', '', addDays(today, 6), ''],
    ['task', 'ส่งงานครั้งที่ 2', '', '', addDays(today, 17), ''],
    ['info', 'หลักเกณฑ์การให้คะแนน (ตัวอย่าง)', 'ส่วนเนื้อเรื่อง: 50 คะแนน\nการนำเสนอผล: 50 คะแนน', '', '', ''],
  ].map((x, i) => ({
    id: uid('r'), sort: String(i + 1), subject: 'วิชาเอกสารศึกษา', type: x[0], title: x[1], detail: x[2], url: x[3], due_date: x[4], due_time: x[5],
    updated_at: now(),
  }));
}

const COLLECTION_FIELDS = {
  staff: ['sort', 'rank', 'first_name', 'last_name', 'nickname', 'role', 'phone'],
  instructors: ['sort', 'name', 'position', 'kind', 'group_no', 'expertise', 'education', 'subjects', 'profile', 'links', 'phone'],
  resources: ['sort', 'subject', 'type', 'title', 'detail', 'url', 'due_date', 'due_time', 'category', 'class_date', 'topic'],
};
const REQUIRED = { staff: 'first_name', instructors: 'name', resources: 'title' };

let db;
function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    db = null;
  }
  if (!db || !Array.isArray(db.members)) db = seed();
  // ข้อมูลตัวอย่างที่บันทึกไว้ก่อนมีเมนูใหม่: เติมข้อมูลหลักสูตรสมมติให้
  if (!Array.isArray(db.staff)) db.staff = demoStaff();
  if (!Array.isArray(db.instructors)) db.instructors = demoInstructors();
  if (!Array.isArray(db.resources)) db.resources = demoResources(toISODate(new Date()));
  if (!Array.isArray(db.swaps)) db.swaps = [];
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

/** คำขอสลับเวรที่ส่งให้หน้าเว็บ (ไม่รวมรหัสของเครื่องที่ส่งคำขอ) */
function publicSwap(s) {
  const { key, ...rest } = s;
  return rest;
}

function remove(list, id) {
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) fail('NOT_FOUND', 'ไม่พบรายการนี้ อาจถูกลบไปแล้ว');
  list.splice(i, 1);
  return { id };
}

const actions = {
  bootstrap(p) {
    const out = {
      members: db.members, duty: db.duty, classes: db.classes, staff: db.staff, instructors: db.instructors, resources: db.resources,
      swaps: db.swaps.map(publicSwap), settings: db.settings, serverTime: now(),
    };
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
      : { id: uid('m'), seq: '', rank: '', first_name: '', last_name: '', nickname: '', position: '', province: '', division_bk: '', bureau_bch: '', agency: '', phone: '', email: '', photo_url: '', photo_file_id: '', group_name: '', social: '' };
    if (canInfo) {
      ['rank', 'first_name', 'last_name', 'nickname', 'position', 'province', 'division_bk', 'bureau_bch', 'agency', 'phone', 'email'].forEach((f) => {
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
    if (canInfo && !admin && !record.nickname) fail('VALIDATION', 'กรุณากรอกชื่อเล่น');

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
  saveSwap(p) {
    const input = p.item || {};
    const admin = isAdmin(p.token);
    const existing = input.id ? db.swaps.find((s) => s.id === input.id) : null;
    if (input.id && !existing) fail('NOT_FOUND', 'ไม่พบคำขอนี้ อาจถูกลบไปแล้ว');
    if (existing) {
      if (!admin && existing.key !== p.key) fail('FORBIDDEN', 'แก้ไขคำขอได้เฉพาะเครื่องที่ส่งคำขอ หรือแอดมิน');
      if (existing.status !== 'pending') fail('FORBIDDEN', 'คำขอนี้ได้รับการพิจารณาแล้ว แก้ไขไม่ได้');
    } else if (!admin && String(p.key || '').length < 16) {
      fail('BAD_REQUEST', 'ไม่พบรหัสของเครื่อง กรุณารีเฟรชแล้วลองใหม่');
    }
    if (input.confirmed !== true) fail('VALIDATION', 'กรุณายืนยันว่าได้ตกลงกับผู้ที่จะสลับเวรด้วยแล้ว');
    const cover = !input.to_duty_id; // ไม่ระบุเวรอีกฝ่าย = ให้มาเข้าเวรแทน
    const fromDuty = db.duty.find((d) => d.id === input.from_duty_id);
    const toDuty = cover ? null : db.duty.find((d) => d.id === input.to_duty_id);
    if (!fromDuty || (!cover && !toDuty)) fail('NOT_FOUND', 'ไม่พบรายการเวรที่เลือก กรุณารีเฟรช');
    const ids = (d) => (d ? String(d.member_ids || '').split(',').filter(Boolean) : []);
    const a = input.from_member_id;
    const b = input.to_member_id;
    if (!a || !b || a === b || (!cover && fromDuty.id === toDuty.id)) fail('VALIDATION', 'กรุณาเลือกเวรของคุณและคนที่ต้องการสลับด้วย');
    if (!ids(fromDuty).includes(a) || (!cover && !ids(toDuty).includes(b))) fail('VALIDATION', 'รายชื่อไม่ตรงกับเวรที่เลือก กรุณารีเฟรช');
    if (ids(fromDuty).includes(b) || ids(toDuty).includes(a)) fail('VALIDATION', 'ทั้งสองคนอยู่ในเวรนี้ด้วยกันอยู่แล้ว');
    const today = toISODate(new Date());
    if (fromDuty.duty_date < today || (!cover && toDuty.duty_date < today)) fail('VALIDATION', 'สลับได้เฉพาะเวรตั้งแต่วันนี้เป็นต้นไป');
    const slots = cover ? [`${fromDuty.id}|${a}`] : [`${fromDuty.id}|${a}`, `${toDuty.id}|${b}`];
    const clash = db.swaps.find((s) => s.status === 'pending' && s.id !== input.id
      && [`${s.from_duty_id}|${s.from_member_id}`, s.to_duty_id ? `${s.to_duty_id}|${s.to_member_id}` : ''].some((x) => x && slots.includes(x)));
    if (clash) fail('DUPLICATE', 'เวรนี้มีคำขอสลับที่รออนุมัติอยู่แล้ว');
    const name = (id) => {
      const m = db.members.find((x) => x.id === id);
      return m ? `${m.rank} ${m.first_name} ${m.last_name}`.trim() : '';
    };
    const t = now();
    const record = {
      id: existing ? existing.id : uid('sw'), status: 'pending', key: existing ? existing.key : String(p.key || ''),
      from_duty_id: fromDuty.id, from_member_id: a, from_name: name(a), from_date: fromDuty.duty_date, from_role: fromDuty.shift_or_role,
      to_duty_id: cover ? '' : toDuty.id, to_member_id: b, to_name: name(b), to_date: cover ? '' : toDuty.duty_date, to_role: cover ? '' : toDuty.shift_or_role,
      reason: String(input.reason || '').trim().slice(0, 300),
      created_at: existing ? existing.created_at : t, updated_at: t, decided_at: '', admin_note: '',
    };
    upsert(db.swaps, record);
    return publicSwap(record);
  },
  deleteSwap(p) {
    const row = db.swaps.find((s) => s.id === p.id);
    if (!row) fail('NOT_FOUND', 'ไม่พบคำขอนี้ อาจถูกลบไปแล้ว');
    const admin = isAdmin(p.token);
    if (!admin && row.key !== p.key) fail('FORBIDDEN', 'ลบคำขอได้เฉพาะเครื่องที่ส่งคำขอ หรือแอดมิน');
    if (!admin && row.status !== 'pending') fail('FORBIDDEN', 'คำขอที่พิจารณาแล้วลบได้เฉพาะแอดมิน');
    return remove(db.swaps, p.id);
  },
  decideSwap(p) {
    requireAdmin(p);
    const row = db.swaps.find((s) => s.id === p.id);
    if (!row) fail('NOT_FOUND', 'ไม่พบคำขอนี้ อาจถูกลบไปแล้ว');
    if (row.status !== 'pending') fail('CONFLICT', 'คำขอนี้ได้รับการพิจารณาไปแล้ว');
    const changed = [];
    if (p.decision === 'approve') {
      const cover = !row.to_duty_id;
      const fromDuty = db.duty.find((d) => d.id === row.from_duty_id);
      const toDuty = cover ? null : db.duty.find((d) => d.id === row.to_duty_id);
      const ids = (d) => String((d && d.member_ids) || '').split(',').filter(Boolean);
      if (!fromDuty || (!cover && !toDuty) || !ids(fromDuty).includes(row.from_member_id) || (!cover && !ids(toDuty).includes(row.to_member_id))) {
        fail('CONFLICT', 'รายชื่อในเวรเปลี่ยนไปจากตอนที่ขอแล้ว กรุณาไม่อนุมัติ แล้วให้ส่งคำขอใหม่');
      }
      [[fromDuty, row.from_member_id, row.to_member_id], ...(cover ? [] : [[toDuty, row.to_member_id, row.from_member_id]])].forEach(([d, out, inn]) => {
        d.member_ids = ids(d).map((x) => (x === out ? inn : x)).join(',');
        d.updated_at = now();
        changed.push(d);
      });
    } else if (p.decision !== 'reject') {
      fail('BAD_REQUEST', 'ไม่รู้จักผลการพิจารณา');
    }
    row.status = p.decision === 'approve' ? 'approved' : 'rejected';
    row.decided_at = now();
    row.admin_note = String(p.note || '').trim();
    return { swap: publicSwap(row), duty: changed };
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
      topic: String(input.topic || '').trim(),
      kind: String(input.kind || '').trim(),
      session: String(input.session || '').trim(),
      secretary: String(input.secretary || '').trim(),
      updated_at: now(),
    };
    upsert(db.classes, record);
    return record;
  },
  deleteClass(p) {
    requireAdmin(p);
    return remove(db.classes, p.id);
  },
  saveRecord(p) {
    requireAdmin(p);
    const fields = COLLECTION_FIELDS[p.collection];
    if (!fields || !Object.prototype.hasOwnProperty.call(COLLECTION_FIELDS, p.collection)) fail('BAD_REQUEST', 'ไม่รู้จักประเภทข้อมูล');
    const list = db[p.collection];
    const input = p.item || {};
    const existing = input.id ? list.find((x) => x.id === input.id) : null;
    if (input.id && !existing) fail('NOT_FOUND', 'ไม่พบรายการนี้ อาจถูกลบไปแล้ว');
    const record = existing ? { ...existing } : { id: uid(p.collection[0]), photo_url: '', photo_file_id: '' };
    fields.forEach((f) => {
      if (input[f] !== undefined) record[f] = String(input[f]).trim();
    });
    if (record.url && !/^https?:\/\//i.test(record.url)) record.url = `https://${record.url}`;
    if (p.collection === 'resources') {
      // โหมดตัวอย่าง: ไม่ได้อัปโหลดจริง เก็บไฟล์เล็กไว้เป็น data URL ในเครื่อง
      if (p.file) {
        record.file_id = uid('file');
        record.file_name = p.file.name;
        record.file_mime = p.file.mimeType;
        record.file_size = String(Math.round((p.file.base64.length * 3) / 4));
        record.url = p.file.base64.length < 400000 ? `data:${p.file.mimeType};base64,${p.file.base64}` : 'https://example.com/demo-file';
      } else if (p.removeFile) {
        if (record.url && record.url.startsWith('data:')) record.url = '';
        record.file_id = '';
        record.file_name = '';
        record.file_mime = '';
        record.file_size = '';
      }
      if (record.type === 'link' && !record.url) fail('VALIDATION', 'กรุณาแนบไฟล์ หรือใส่ลิงก์ของเอกสาร');
    }
    if (!record[REQUIRED[p.collection]]) fail('VALIDATION', 'กรุณากรอกข้อมูลที่จำเป็น');
    if (p.collection !== 'resources') {
      if (p.photo) {
        record.photo_url = `data:${p.photo.mimeType};base64,${p.photo.base64}`;
        record.photo_file_id = uid('file');
      } else if (p.removePhoto) {
        record.photo_url = '';
        record.photo_file_id = '';
      }
    }
    record.updated_at = now();
    upsert(list, record);
    return record;
  },
  deleteRecord(p) {
    requireAdmin(p);
    if (!Object.prototype.hasOwnProperty.call(COLLECTION_FIELDS, p.collection)) fail('BAD_REQUEST', 'ไม่รู้จักประเภทข้อมูล');
    return remove(db[p.collection], p.id);
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
