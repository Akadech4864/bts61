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
    throw new ApiError(
      err && err.name === 'AbortError'
        ? 'เซิร์ฟเวอร์ตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง'
        : 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
      'NETWORK',
    );
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

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}
