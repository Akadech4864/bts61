/**
 * โหลดรูปที่เก็บแบบ "drive:<id>" ผ่าน API (ใช้เมื่อบัญชี Google ไม่อนุญาตการแชร์ลิงก์สาธารณะ)
 *
 * - รูปย่อ (thumb ~300x400, ≈25KB): ใช้ในกริด/รายการ ขอทุกรูปในคำขอเดียว เร็วมาก
 * - รูปเต็ม (full 600x800): โหลดเฉพาะตอนเปิดดูรายละเอียด แบ่งชุดเล็ก ๆ และขอหลายชุดพร้อมกัน
 * - รูปเก่าที่ยังไม่มีรูปย่อ: โหลดรูปเต็มมาแสดงแทน แล้วย่อในเครื่องส่งกลับให้ระบบเก็บไว้
 *   (ครั้งต่อไปทุกคนจะได้รูปย่อทันที)
 * - เก็บทุกรูปไว้ใน Cache Storage ของเครื่อง เปิดครั้งถัดไปแสดงได้ทันทีโดยไม่ต้องโหลดใหม่
 */
import { useEffect, useState } from 'react';
import { api, blobToBase64, isDemo } from './api';

const CACHE_NAME = 'bts61-photos-v1';
const THUMB_W = 300;
const THUMB_H = 400;
const MAX_THUMB_B64 = 45000; // ช่องใน Google Sheets เก็บได้ไม่เกิน 50,000 ตัวอักษร
const THUMB_CHUNK = 250;
const FULL_BATCH = 3; // รูปเต็มต่อคำขอ (Apps Script อ่าน Drive ~1 วินาที/รูป)
const FULL_PARALLEL = 4; // จำนวนคำขอที่ส่งพร้อมกัน
const SAVE_CHUNK = 10;

const stores = {
  thumb: { memory: new Map(), waiting: new Map(), queue: [], timer: 0 },
  full: { memory: new Map(), waiting: new Map(), queue: [], timer: 0 },
};

const cacheKey = (kind, id) =>
  new URL(`./__${kind === 'thumb' ? 'thumb' : 'photo'}/${encodeURIComponent(id)}`, window.location.href).toString();

async function readCache(kind, id) {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(cacheKey(kind, id));
    return res ? await res.blob() : null;
  } catch {
    return null;
  }
}

async function writeCache(kind, id, blob) {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey(kind, id), new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }));
  } catch {
    /* พื้นที่เต็มหรือถูกปิด — ข้ามได้ */
  }
}

/** ได้ผลแล้ว (object URL หรือ null = ไม่มีรูปนี้) — จำไว้ใช้ซ้ำ */
function settle(kind, id, value) {
  const s = stores[kind];
  s.memory.set(id, value);
  (s.waiting.get(id) || []).forEach((resolve) => resolve(value));
  s.waiting.delete(id);
}

/** โหลดไม่สำเร็จชั่วคราว (เครือข่าย) — ไม่จำผล เพื่อให้ลองใหม่ได้ภายหลัง */
function fail(kind, id) {
  const s = stores[kind];
  (s.waiting.get(id) || []).forEach((resolve) => resolve(null));
  s.waiting.delete(id);
}

function b64ToBlob(base64, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'image/jpeg' });
}

function request(kind, id) {
  const s = stores[kind];
  if (s.memory.has(id)) return Promise.resolve(s.memory.get(id));
  return new Promise((resolve) => {
    const list = s.waiting.get(id);
    if (list) {
      list.push(resolve);
      return;
    }
    s.waiting.set(id, [resolve]);
    readCache(kind, id).then((blob) => {
      if (blob) {
        settle(kind, id, URL.createObjectURL(blob));
        return;
      }
      s.queue.push(id);
      if (!s.timer) s.timer = setTimeout(kind === 'thumb' ? flushThumbs : flushFull, 30);
    });
  });
}

/* ------------------------------ รูปย่อ ------------------------------ */

async function flushThumbs() {
  const s = stores.thumb;
  s.timer = 0;
  const ids = s.queue;
  s.queue = [];
  for (let i = 0; i < ids.length; i += THUMB_CHUNK) {
    const chunk = ids.slice(i, i + THUMB_CHUNK);
    let res;
    try {
      res = await api('thumbs', { ids: chunk });
    } catch {
      chunk.forEach((id) => fail('thumb', id));
      continue;
    }
    for (const id of chunk) {
      const b64 = res.thumbs && res.thumbs[id];
      if (b64) {
        const blob = b64ToBlob(b64, 'image/jpeg');
        writeCache('thumb', id, blob);
        settle('thumb', id, URL.createObjectURL(blob));
      } else {
        backfillThumb(id);
      }
    }
  }
}

/** รูปเก่าที่ยังไม่มีรูปย่อ: แสดงรูปเต็มไปก่อน แล้วย่อส่งกลับให้ระบบเก็บไว้ */
async function backfillThumb(id) {
  const url = await request('full', id);
  if (!url) {
    // ไม่มีรูปนี้จริง = จำไว้ / เครือข่ายขัดข้อง = ลองใหม่ภายหลัง
    if (stores.full.memory.has(id)) settle('thumb', id, null);
    else fail('thumb', id);
    return;
  }
  settle('thumb', id, url);
  try {
    const full = await (await fetch(url)).blob();
    const thumb = await makeThumb(full);
    writeCache('thumb', id, thumb);
    queueThumbSave(id, await blobToBase64(thumb));
  } catch {
    /* ย่อไม่สำเร็จ — ครั้งหน้าลองใหม่ */
  }
}

let saveQueue = [];
let saveTimer = 0;
let saving = false;

function queueThumbSave(fileId, thumb) {
  if (isDemo) return;
  saveQueue.push({ fileId, thumb });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSaves, saveQueue.length >= SAVE_CHUNK ? 0 : 1500);
}

async function flushSaves() {
  if (saving) return;
  saving = true;
  try {
    while (saveQueue.length) {
      const items = saveQueue.splice(0, SAVE_CHUNK);
      try {
        await api('saveThumbs', { items });
      } catch {
        /* บันทึกไม่ได้ — ผู้ใช้คนถัดไปจะส่งให้อีกครั้ง */
      }
    }
  } finally {
    saving = false;
  }
}

/* ------------------------------ รูปเต็ม ------------------------------ */

async function fetchFull(chunk) {
  try {
    const res = await api('photos', { ids: chunk });
    for (const id of chunk) {
      const p = res.photos && res.photos[id];
      if (!p) {
        settle('full', id, null);
        continue;
      }
      const blob = b64ToBlob(p.base64, p.mimeType);
      writeCache('full', id, blob);
      settle('full', id, URL.createObjectURL(blob));
    }
  } catch {
    chunk.forEach((id) => fail('full', id));
  }
}

async function flushFull() {
  const s = stores.full;
  s.timer = 0;
  const ids = s.queue;
  s.queue = [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += FULL_BATCH) chunks.push(ids.slice(i, i + FULL_BATCH));
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) await fetchFull(chunks[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(FULL_PARALLEL, chunks.length) }, worker));
}

/* ------------------------------ ย่อรูป ------------------------------ */

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('เปิดรูปไม่ได้'));
    };
    img.src = url;
  });
}

/** ย่อรูปเป็น JPEG 300x400 (ตัดให้เต็มกรอบ 3:4) ขนาดพอเก็บในช่องของ Google Sheets */
export async function makeThumb(blob) {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.max(THUMB_W / img.naturalWidth, THUMB_H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
  const toBlob = (q) =>
    new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ย่อรูปไม่สำเร็จ'))), 'image/jpeg', q));
  let quality = 0.8;
  let out = await toBlob(quality);
  // base64 ยาวกว่าไฟล์จริง 4/3 เท่า
  while (out.size * 4 / 3 > MAX_THUMB_B64 && quality > 0.35) {
    quality -= 0.1;
    out = await toBlob(quality);
  }
  return out;
}

/** รูปที่เพิ่งอัปโหลด: ใส่ไว้ในแคชของเครื่องทันที ไม่ต้องโหลดกลับจากเซิร์ฟเวอร์ */
export function primePhoto(fileId, fullBlob, thumbBlob) {
  if (!fileId) return;
  if (fullBlob) {
    writeCache('full', fileId, fullBlob);
    settle('full', fileId, URL.createObjectURL(fullBlob));
  }
  if (thumbBlob) {
    writeCache('thumb', fileId, thumbBlob);
    settle('thumb', fileId, URL.createObjectURL(thumbBlob));
  }
}

/**
 * คืน object URL ของรูป "drive:<id>" ('' = กำลังโหลด, null = โหลดไม่ได้)
 * kind: 'thumb' = รูปย่อ (กริด/รายการ), 'full' = รูปเต็ม (หน้ารายละเอียด)
 */
export function useDrivePhoto(id, kind = 'full') {
  const s = stores[kind];
  const [src, setSrc] = useState(() => (id && s.memory.has(id) ? s.memory.get(id) : ''));
  useEffect(() => {
    if (!id) {
      setSrc('');
      return undefined;
    }
    if (s.memory.has(id)) {
      setSrc(s.memory.get(id));
      return undefined;
    }
    let alive = true;
    setSrc('');
    request(kind, id).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [id, kind, s]);
  return src;
}
