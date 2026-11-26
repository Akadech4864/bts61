import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, blobToBase64, isDemo } from './api';
import { readStored, writeStored } from './utils';
import { makeThumb, primePhoto } from './photos';
import { docMime, MAX_DOC_BYTES } from './docs';
import { useToast } from '../components/Toast';

// แยกที่เก็บของโหมดตัวอย่างออกจากข้อมูลจริง เพื่อไม่ให้ข้อมูลสมมติค้างมาแสดงหลังเชื่อมต่อฐานข้อมูลแล้ว
const CACHE_KEY = isDemo ? 'bts61:demo:data' : 'bts61:data:v2';
const AUTH_KEY = isDemo ? 'bts61:demo:auth' : 'bts61:auth:v2';
const STALE_MS = 60 * 1000;
const POLL_MS = 5 * 60 * 1000;

const DEFAULT_SETTINGS = {
  public_edit_enabled: false,
  allow_public_add: false,
  allow_public_edit: false,
  allow_public_photo_edit: false,
};
const EMPTY = { members: [], duty: [], swaps: [], classes: [], staff: [], instructors: [], resources: [], settings: DEFAULT_SETTINGS };

// รหัสสุ่มของเครื่องนี้ ใช้ยืนยันว่าเป็นเครื่องที่ส่งคำขอสลับเวร (แก้ไข/ลบคำขอของตัวเองได้) — เซิร์ฟเวอร์เก็บเฉพาะค่าแฮช
const DEVICE_KEY = isDemo ? 'bts61:demo:device' : 'bts61:device';
const MY_SWAPS_KEY = isDemo ? 'bts61:demo:my-swaps' : 'bts61:my-swaps';
function deviceKey() {
  let key = readStored(DEVICE_KEY, '');
  if (typeof key !== 'string' || key.length < 32) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    writeStored(DEVICE_KEY, key);
  }
  return key;
}

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

const removeById = (list, id) => list.filter((x) => x.id !== id);

function readAuth() {
  const auth = readStored(AUTH_KEY, null);
  return auth && auth.token && auth.expiresAt > Date.now() ? auth : null;
}

export function StoreProvider({ children }) {
  const toast = useToast();
  const [cached] = useState(() => readStored(CACHE_KEY, null));

  const [data, setData] = useState(() => (cached && cached.data ? { ...EMPTY, ...cached.data } : EMPTY));
  const [status, setStatus] = useState(cached ? 'ready' : 'loading'); // loading | ready | error
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState((cached && cached.ts) || 0);
  const [auth, setAuthState] = useState(readAuth);
  const [mySwaps, setMySwaps] = useState(() => {
    const ids = readStored(MY_SWAPS_KEY, []);
    return Array.isArray(ids) ? ids : [];
  });

  const authRef = useRef(auth);
  const inflight = useRef(null);
  const mutationSeq = useRef(0);
  const lastSyncRef = useRef(lastSync);
  lastSyncRef.current = lastSync;

  const setAuth = useCallback((next) => {
    authRef.current = next;
    writeStored(AUTH_KEY, next);
    setAuthState(next);
  }, []);

  // เก็บข้อมูลล่าสุดไว้ในเครื่อง เพื่อให้เปิดแอพครั้งถัดไปได้ทันทีโดยไม่ต้องรอโหลด
  useEffect(() => {
    if (status === 'ready') writeStored(CACHE_KEY, { data, ts: lastSync });
  }, [data, lastSync, status]);

  const refresh = useCallback(
    ({ silent = false } = {}) => {
      if (inflight.current) return inflight.current;
      setSyncing(true);
      const run = (async () => {
        try {
          const seq = mutationSeq.current;
          const token = authRef.current && authRef.current.token;
          const res = await api('bootstrap', token ? { token } : {});
          if (seq !== mutationSeq.current) return true; // มีการบันทึกระหว่างโหลด — ใช้ข้อมูลในเครื่องที่ใหม่กว่า
          setData({
            members: res.members || [],
            duty: res.duty || [],
            swaps: res.swaps || [],
            classes: res.classes || [],
            staff: res.staff || [],
            instructors: res.instructors || [],
            resources: res.resources || [],
            settings: { ...DEFAULT_SETTINGS, ...(res.settings || {}) },
          });
          setLastSync(Date.now());
          setStatus('ready');
          setError('');
          if (token && res.isAdmin === false) {
            setAuth(null);
            toast.info('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          }
          return true;
        } catch (err) {
          setError(err.message);
          setStatus((s) => (s === 'loading' ? 'error' : s));
          if (!silent) toast.error(err.message);
          return false;
        } finally {
          inflight.current = null;
          setSyncing(false);
        }
      })();
      inflight.current = run;
      return run;
    },
    [setAuth, toast],
  );

  useEffect(() => {
    refresh({ silent: !!cached });
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncRef.current > STALE_MS) {
        refresh({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** เรียก API ที่แก้ไขข้อมูล แล้วอัปเดตข้อมูลในเครื่องทันที */
  const mutate = useCallback(
    async (action, payload, apply) => {
      try {
        const token = authRef.current && authRef.current.token;
        const res = await api(action, token ? { ...payload, token } : payload);
        mutationSeq.current += 1;
        if (apply) setData((prev) => apply(prev, res));
        return res;
      } catch (err) {
        if (err.code === 'UNAUTHORIZED') setAuth(null);
        if (err.code === 'FORBIDDEN' || err.code === 'NOT_FOUND') refresh({ silent: true });
        throw err;
      }
    },
    [refresh, setAuth],
  );

  const actions = useMemo(
    () => ({
      refresh,
      async login(password) {
        const session = await api('login', { password });
        setAuth(session);
        return session;
      },
      logout() {
        setAuth(null);
      },
      requestOtp: () => api('requestOtp'),
      verifyOtp: (otp) => api('verifyOtp', { otp }),
      async resetPassword(ticket, newPassword) {
        const session = await api('resetPassword', { ticket, newPassword });
        setAuth(session);
        return session;
      },
      saveSettings: (settings) =>
        mutate('saveSettings', { settings }, (prev, res) => ({ ...prev, settings: { ...DEFAULT_SETTINGS, ...res } })),
      async saveMember(member, { photoBlob = null, removePhoto = false } = {}) {
        const payload = { member, removePhoto };
        let thumbBlob = null;
        if (photoBlob) {
          payload.photo = { base64: await blobToBase64(photoBlob), mimeType: photoBlob.type || 'image/jpeg' };
          // รูปย่อสำหรับหน้ากริด ส่งไปพร้อมกัน (ย่อไม่สำเร็จก็ยังบันทึกรูปได้ตามปกติ)
          try {
            thumbBlob = await makeThumb(photoBlob);
            payload.photo.thumb = await blobToBase64(thumbBlob);
          } catch {
            thumbBlob = null;
          }
        }
        const res = await mutate('saveMember', payload, (prev, r) => ({ ...prev, members: upsert(prev.members, r) }));
        if (photoBlob && res && res.photo_file_id) primePhoto(res.photo_file_id, photoBlob, thumbBlob);
        return res;
      },
      deleteMember: (id) =>
        mutate('deleteMember', { id }, (prev) => ({ ...prev, members: removeById(prev.members, id) })),
      saveDuty: (item) => mutate('saveDuty', { item }, (prev, res) => ({ ...prev, duty: upsert(prev.duty, res) })),
      deleteDuty: (id) => mutate('deleteDuty', { id }, (prev) => ({ ...prev, duty: removeById(prev.duty, id) })),
      /** ขอสลับเวร (ผู้เข้าอบรมส่งเองได้) — คำขอใหม่จะจำไว้ว่าเป็นของเครื่องนี้ */
      async saveSwap(item) {
        const res = await mutate('saveSwap', { item, key: deviceKey() }, (prev, r) => ({ ...prev, swaps: upsert(prev.swaps || [], r) }));
        if (!item.id && res && res.id) {
          const mine = readStored(MY_SWAPS_KEY, []);
          writeStored(MY_SWAPS_KEY, [...(Array.isArray(mine) ? mine : []), res.id].slice(-100));
          setMySwaps((s) => [...s, res.id]);
        }
        return res;
      },
      deleteSwap: (id) =>
        mutate('deleteSwap', { id, key: deviceKey() }, (prev) => ({ ...prev, swaps: removeById(prev.swaps || [], id) })),
      /** แอดมิน: decision = approve | reject (อนุมัติแล้วระบบสลับรายชื่อในตารางเวรให้) */
      decideSwap: (id, decision, note = '') =>
        mutate('decideSwap', { id, decision, note }, (prev, r) => ({
          ...prev,
          swaps: upsert(prev.swaps || [], r.swap),
          duty: (r.duty || []).reduce((list, d) => upsert(list, d), prev.duty),
        })),
      saveClass: (item) =>
        mutate('saveClass', { item }, (prev, res) => ({ ...prev, classes: upsert(prev.classes, res) })),
      deleteClass: (id) =>
        mutate('deleteClass', { id }, (prev) => ({ ...prev, classes: removeById(prev.classes, id) })),
      /** ข้อมูลหลักสูตร (เฉพาะแอดมิน): collection = staff | instructors | resources */
      async saveRecord(collection, item, { photoBlob = null, removePhoto = false, file = null, removeFile = false } = {}) {
        const payload = { collection, item, removePhoto, removeFile: removeFile && !file };
        // ไฟล์เอกสารประกอบการสอน (เฉพาะงาน/เอกสาร) — เซิร์ฟเวอร์เก็บใน Google Drive แยกโฟลเดอร์ตามวิชา
        if (file) {
          const mimeType = docMime(file);
          if (!mimeType) throw new Error('รองรับไฟล์ PDF, PowerPoint, Word, Excel, รูปภาพ, MP4/MP3 หรือข้อความ');
          if (file.size > MAX_DOC_BYTES) throw new Error('ไฟล์ใหญ่เกิน 15 MB — วิดีโอหรือไฟล์ใหญ่ให้แชร์จาก Drive/YouTube แล้วใส่เป็นลิงก์');
          payload.file = { base64: await blobToBase64(file), mimeType, name: file.name };
        }
        let thumbBlob = null;
        if (photoBlob) {
          payload.photo = { base64: await blobToBase64(photoBlob), mimeType: photoBlob.type || 'image/jpeg' };
          try {
            thumbBlob = await makeThumb(photoBlob);
            payload.photo.thumb = await blobToBase64(thumbBlob);
          } catch {
            thumbBlob = null;
          }
        }
        const res = await mutate('saveRecord', payload, (prev, r) => ({ ...prev, [collection]: upsert(prev[collection] || [], r) }));
        if (photoBlob && res && res.photo_file_id) primePhoto(res.photo_file_id, photoBlob, thumbBlob);
        return res;
      },
      deleteRecord: (collection, id) =>
        mutate('deleteRecord', { collection, id }, (prev) => ({ ...prev, [collection]: removeById(prev[collection] || [], id) })),
    }),
    [mutate, refresh, setAuth],
  );

  const isAdmin = !!(auth && auth.token && auth.expiresAt > Date.now());
  const s = data.settings;
  const can = useMemo(
    () => ({
      add: isAdmin || (s.public_edit_enabled && s.allow_public_add),
      edit: isAdmin || (s.public_edit_enabled && s.allow_public_edit),
      photo: isAdmin || (s.public_edit_enabled && s.allow_public_photo_edit),
    }),
    [isAdmin, s.public_edit_enabled, s.allow_public_add, s.allow_public_edit, s.allow_public_photo_edit],
  );

  const memberById = useMemo(() => new Map(data.members.map((m) => [m.id, m])), [data.members]);

  const value = useMemo(
    () => ({ data, status, syncing, error, lastSync, auth, isAdmin, can, memberById, mySwaps, ...actions }),
    [data, status, syncing, error, lastSync, auth, isAdmin, can, memberById, mySwaps, actions],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
