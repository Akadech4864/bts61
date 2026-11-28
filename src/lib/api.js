import { GAS_WEB_APP_URL } from '../config';

/** ยังไม่ได้ใส่ Web App URL -> ใช้ข้อมูลตัวอย่างในเครื่อง */
export const isDemo = !GAS_WEB_APP_URL;

export class ApiError extends Error {
  constructor(message, code, extra) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.extra = extra;
  }
}

let mockModule;
function loadMock() {
  if (!mockModule) mockModule = import('./mockApi.js');
  return mockModule;
}

/**
 * เรียก Google Apps Script Web App
 * ส่ง body เป็น text/plain (JSON) เพื่อให้เป็น "simple request" ไม่ติด CORS preflight
 */
export async function api(action, payload = {}, { timeout = 60000 } = {}) {
  if (isDemo) {
    const mock = await loadMock();
    return mock.handle(action, payload);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (err) {
    let message = 'ติดต่อระบบฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง (หากเพิ่งติดตั้งระบบ ผู้ดูแลอาจยังไม่ได้อนุญาตสิทธิ์ของ Google)';
    if (err && err.name === 'AbortError') message = 'เซิร์ฟเวอร์ตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง';
    else if (typeof navigator !== 'undefined' && navigator.onLine === false) message = 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบแล้วลองใหม่';
    throw new ApiError(message, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง — ตรวจสอบว่า Deploy Web App แบบ "Anyone" และใส่ URL ที่ลงท้ายด้วย /exec',
      'BAD_RESPONSE',
    );
  }
  if (!json || !json.ok) {
    throw new ApiError((json && json.error) || 'เกิดข้อผิดพลาด กรุณาลองใหม่', json && json.code, json && json.extra);
  }
  return json.data;
}

/** แปลงไบต์เป็น base64 ทีละช่วง (ไม่ให้ String.fromCharCode รับอาร์กิวเมนต์มากเกินไป) */
function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/**
 * ไฟล์/รูป -> base64
 * iPhone ที่เปิด "โหมดล็อกดาวน์" (Lockdown Mode) ไม่มี FileReader ("Can't find variable: FileReader")
 * จึงใช้ blob.arrayBuffer() เป็นหลัก แล้วค่อยใช้ FileReader กับเบราว์เซอร์เก่าที่ไม่มี arrayBuffer()
 */
export async function blobToBase64(blob) {
  try {
    if (typeof blob.arrayBuffer === 'function') return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    if (typeof Response === 'function') return bytesToBase64(new Uint8Array(await new Response(blob).arrayBuffer()));
  } catch {
    // ลองวิธีถัดไป
  }
  if (typeof FileReader === 'undefined') throw new Error('อ่านไฟล์ไม่สำเร็จ — ลองปิดโหมดล็อกดาวน์ของ iPhone ชั่วคราว หรือเปิดด้วย Safari/Chrome');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}
