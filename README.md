# ระบบบริหารการฝึกอบรมหลักสูตร บตส.รุ่นที่ 61

เว็บแอพแบบ Mobile-First สำหรับผู้เข้าอบรมหลักสูตรผู้บังคับการตำรวจ (บตส.) รุ่นที่ 61
ประกอบด้วย **ทำเนียบรุ่น · ตารางสอน · ตารางเวร · แผงควบคุมแอดมิน**

- Frontend: Vite + React + Tailwind CSS — deploy อัตโนมัติขึ้น GitHub Pages ทุกครั้งที่ push เข้า `main`
- Backend: Google Apps Script (Web App) + Google Sheets เป็นฐานข้อมูล + Google Drive เก็บรูปถ่าย

> ถ้ายังไม่ได้ใส่ Web App URL ใน `src/config.js` แอพจะเปิดใน **โหมดตัวอย่าง** (ข้อมูลสมมติ เก็บในเครื่องเท่านั้น รหัสแอดมินคือ `demo`)

---

## เชื่อมต่อฐานข้อมูลใน 3 ขั้นตอน

### 1) วางโค้ด Backend แล้วรัน `setupDatabase`
1. เปิดโปรเจกต์ Apps Script ของระบบ
2. วางเนื้อหาไฟล์ `apps-script/Code.gs` ลงในไฟล์ `Code.gs` และสร้างไฟล์สคริปต์ใหม่ชื่อ `Seed` แล้ววางเนื้อหา `apps-script/Seed.gs` (บัญชีรายชื่อ 119 ท่าน)
3. เลือกฟังก์ชัน **`setupDatabase`** บนแถบเครื่องมือ → กด **Run** → กดอนุญาตสิทธิ์ (Sheets, Drive, ส่งอีเมล)

ระบบจะสร้างแท็บ `Members`, `Settings`, `DutySchedule`, `ClassSchedule` พร้อมหัวคอลัมน์ ตั้งรหัสผ่านแอดมินตั้งต้น
นำเข้ารายชื่อ และสร้างโฟลเดอร์ `BTS61_Photos` ใน Google Drive ให้อัตโนมัติ (รันซ้ำได้ ไม่ทับข้อมูลเดิม)

### 2) Deploy เป็น Web App
**Deploy → New deployment → Select type: Web app**

| ช่อง | ค่าที่ต้องเลือก |
| --- | --- |
| Execute as | **Me** |
| Who has access | **Anyone** |

กด **Deploy** แล้วคัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

> แก้โค้ด Backend ภายหลัง ให้ใช้ **Deploy → Manage deployments → ✏️ → Version: New version** เพื่อให้ URL เดิมยังใช้ได้

### 3) ใส่ URL ในเว็บแอพ
แก้ไฟล์ [`src/config.js`](src/config.js) บรรทัด

```js
export const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

แล้ว commit เข้า branch `main` (แก้บนหน้าเว็บ GitHub ได้เลย) — GitHub Actions จะ build และ deploy ให้เองภายใน 1–2 นาที

---

## การใช้งานสำหรับแอดมิน

- เข้าเมนู **ตั้งค่า** → ใส่รหัสผ่านแอดมิน (ครั้งแรกใช้รหัสตั้งต้น แล้ว **ควรเปลี่ยนทันที**)
- เปลี่ยน/กู้คืนรหัสผ่าน: ระบบส่ง OTP 6 หลัก (อายุ 10 นาที) ไปยังอีเมลผู้ดูแลที่กำหนดตายตัวใน `Code.gs` เท่านั้น
- สวิตช์ **โหมดแก้ไขสำหรับผู้ใช้งานทั่วไป** + สิทธิ์ย่อย (เพิ่มรายชื่อ / แก้ไขข้อมูล / เปลี่ยนรูปถ่าย) มีผลกับทุกคนทันที
- จัดการ รายชื่อ / ตารางสอน / ตารางเวร ได้จากแผงควบคุม หรือพิมพ์ลง Google Sheet โดยตรงก็ได้
  (วันที่รับได้ทั้ง `2026-11-25` และ `25/11/2569`, เวลา `09:00` — เว้นช่อง `id` ว่างไว้ ระบบเติมให้เอง)
- ลืมรหัสและเข้าอีเมลไม่ได้: รันฟังก์ชัน `resetAdminPassword` ในหน้า Apps Script

## โครงสร้างโปรเจกต์

```
├─ apps-script/            โค้ด Backend (ไม่ถูก push ขึ้น repo สาธารณะ — ดู .gitignore)
│  ├─ Code.gs              API ทั้งหมด + setupDatabase()
│  ├─ Seed.gs              บัญชีรายชื่อตั้งต้น + seedMembers()
│  └─ appsscript.json      manifest (ไม่จำเป็นต้องใช้ ถ้า deploy ผ่านหน้าเว็บ)
├─ src/
│  ├─ config.js            ← ใส่ Web App URL ที่นี่
│  ├─ App.jsx              โครงแอพ + เมนูล่าง + หน้าต่างกลาง
│  ├─ pages/               ทำเนียบรุ่น / ตารางสอน / ตารางเวร / ตั้งค่า-แอดมิน
│  ├─ components/          ฟอร์ม, bottom sheet, ครอปรูป, toast ฯลฯ
│  └─ lib/                 api, store (cache), utils, โหมดตัวอย่าง
├─ public/                 ไอคอนและ manifest
└─ .github/workflows/deploy.yml   Auto-deploy ขึ้น GitHub Pages
```

## พัฒนาบนเครื่อง

```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm run build    # สร้างไฟล์สำหรับ deploy ที่โฟลเดอร์ dist/
```

## หมายเหตุด้านความเป็นส่วนตัว

เว็บแอพและ Web App URL เปิดให้ทุกคนที่มีลิงก์เข้าดูได้ (ไม่ต้องล็อกอิน) จึงควรแชร์ลิงก์เฉพาะภายในรุ่น
หน้าเว็บตั้งค่า `noindex` ไว้เพื่อไม่ให้ถูกเก็บเข้าเครื่องมือค้นหา
