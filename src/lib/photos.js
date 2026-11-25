/**
 * โหลดรูปที่เก็บแบบ "drive:<id>" ผ่าน API (ใช้เมื่อบัญชี Google ไม่อนุญาตการแชร์ลิงก์สาธารณะ)
 * - รวมคำขอของรูปที่ต้องการพร้อมกันเป็นชุดละไม่เกิน 12 รูป เพื่อลดจำนวนครั้งที่เรียก Apps Script
 * - เก็บรูปไว้ใน Cache Storage ของเครื่อง เปิดครั้งถัดไปแสดงได้ทันทีโดยไม่ต้องโหลดใหม่
 */
import { useEffect, useState } from 'react';
import { api } from './api';

const CACHE_NAME = 'bts61-photos-v1';
const BATCH = 12;
const memory = new Map(); // id -> object URL | null (โหลดไม่ได้)
const waiting = new Map(); // id -> [resolve]
let queue = [];
let timer = 0;

const cacheKey = (id) => new URL(`./__photo/${encodeURIComponent(id)}`, window.location.href).toString();

async function readCache(id) {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(cacheKey(id));
    return res ? await res.blob() : null;
  } catch {
    return null;
  }
}

async function writeCache(id, blob) {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey(id), new Response(blob, { headers: { 'Content-Type': blob.type } }));
  } catch {
    /* พื้นที่เต็มหรือถูกปิด — ข้ามได้ */
  }
}

function settle(id, value) {
  memory.set(id, value);
  (waiting.get(id) || []).forEach((resolve) => resolve(value));
  waiting.delete(id);
}

function b64ToBlob(base64, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'image/jpeg' });
}

async function flush() {
  timer = 0;
  const ids = queue;
  queue = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    try {
      const res = await api('photos', { ids: chunk });
      for (const id of chunk) {
        const p = res.photos && res.photos[id];
        if (!p) {
          settle(id, null);
          continue;
        }
        const blob = b64ToBlob(p.base64, p.mimeType);
        writeCache(id, blob);
        settle(id, URL.createObjectURL(blob));
      }
    } catch {
      // เครือข่ายขัดข้อง: ไม่จำว่าโหลดไม่ได้ เพื่อให้ลองใหม่ได้ภายหลัง
      chunk.forEach((id) => {
        (waiting.get(id) || []).forEach((resolve) => resolve(null));
        waiting.delete(id);
      });
    }
  }
}

function loadPhoto(id) {
  if (memory.has(id)) return Promise.resolve(memory.get(id));
  return new Promise((resolve) => {
    const list = waiting.get(id);
    if (list) {
      list.push(resolve);
      return;
    }
    waiting.set(id, [resolve]);
    readCache(id).then((blob) => {
      if (blob) {
        settle(id, URL.createObjectURL(blob));
        return;
      }
      queue.push(id);
      if (!timer) timer = setTimeout(flush, 40);
    });
  });
}

/** คืน object URL ของรูป "drive:<id>" ('' = กำลังโหลด, null = โหลดไม่ได้) */
export function useDrivePhoto(id) {
  const [src, setSrc] = useState(() => (id && memory.has(id) ? memory.get(id) : ''));
  useEffect(() => {
    if (!id) return undefined;
    if (memory.has(id)) {
      setSrc(memory.get(id));
      return undefined;
    }
    let alive = true;
    setSrc('');
    loadPhoto(id).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return src;
}
