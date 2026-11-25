/**
 * ตั้งค่าการเชื่อมต่อ
 * ---------------------------------------------------------------------------
 * Web App URL ของ Google Apps Script (ลงท้ายด้วย /exec)
 * Backend ถูก deploy อัตโนมัติจาก repo ส่วนตัว bts61-backend โดยอัปเดต deployment เดิม
 * URL นี้จึงคงที่ ไม่ต้องแก้เมื่อปรับปรุง Backend
 *
 * ถ้าเว้นว่างไว้ แอพจะทำงานใน "โหมดตัวอย่าง" (ข้อมูลสมมติ เก็บในเครื่องเท่านั้น)
 */
export const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbw3ZxcRFHdh40umYAc_Y2hMzigd_9GyYclKELG0Fu9ra58K7YQe-0MWX3oDmPEVJ8IM/exec';

export const APP_NAME = 'ระบบบริหารการฝึกอบรมหลักสูตร บตส.รุ่นที่ 61';
export const COURSE_SHORT = 'บตส.รุ่นที่ 61';
export const COURSE_BATCH = 'รุ่นที่ 61';
/** ชื่อย่อ ใช้แทนชื่อเต็มเมื่อจอแคบจนชื่อเต็มไม่พอดี 1 บรรทัด */
export const COURSE_TITLE_SHORT = 'หลักสูตร บตส. รุ่นที่ 61';
export const COURSE_SUBTITLE = 'หลักสูตรการบริหารงานตำรวจชั้นสูง';
export const COURSE_PERIOD = '23 พ.ย. 2569 – 9 มี.ค. 2570';
export const COURSE_PLACE = 'วิทยาลัยการตำรวจ';

/** ตัวเลือกคำนำหน้า/ยศ ในฟอร์ม (ผู้ใช้เลือกเอง หรือระบบกรอกให้เมื่อพบชื่อในฐานข้อมูล) */
export const RANK_OPTIONS = ['พ.ต.อ.', 'พ.ต.อ.หญิง', 'รศ.พ.ต.อ.', 'นาย', 'นาง', 'นางสาว'];
