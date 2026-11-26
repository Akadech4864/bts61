import { useEffect, useState } from 'react';
import { Eye, EyeOff, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, TextInput } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';

/**
 * แอดมิน: ตั้งค่า API key ของ Anthropic สำหรับ "เพิ่มเวรจากรูป" (AI อ่านตารางเวร)
 * คีย์ส่งไปเก็บที่ระบบหลังบ้านเท่านั้น หน้าเว็บเห็นแค่ 4 ตัวท้าย
 */
export default function AiKeyCard() {
  const { aiStatus, saveAiKey } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [status, setStatus] = useState(null); // null = กำลังโหลด, { configured, last4 } | { unavailable: true }
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    aiStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus({ unavailable: true }));
    return () => {
      alive = false;
    };
  }, [aiStatus]);

  async function save(e) {
    e.preventDefault();
    if (busy || !key.trim()) return;
    setBusy(true);
    try {
      setStatus(await saveAiKey(key.trim()));
      setKey('');
      toast.success('บันทึก API key แล้ว');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await ui.confirm({ title: 'ลบ API key?', message: 'ปุ่ม "เพิ่มจากรูป" จะใช้ไม่ได้จนกว่าจะใส่คีย์ใหม่', confirmText: 'ลบคีย์', danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      setStatus(await saveAiKey('', true));
      toast.success('ลบ API key แล้ว');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-violet-700">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-800">AI อ่านตารางเวรจากรูป</p>
          <p className="text-[13px] leading-snug text-slate-500">
            {status === null ? 'กำลังตรวจสอบ…'
              : status.unavailable ? 'ระบบหลังบ้านยังไม่เปิดใช้ฟีเจอร์นี้'
                : status.configured ? `ตั้งค่าแล้ว · คีย์ลงท้ายด้วย …${status.last4}`
                  : 'ยังไม่ได้ใส่ API key ของ Anthropic (Claude)'}
          </p>
        </div>
        {status && status.configured && (
          <button type="button" onClick={remove} disabled={busy} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-rose-600 hover:bg-rose-500/10" aria-label="ลบ API key">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {status && !status.unavailable && (
        <form onSubmit={save} className="mt-3 space-y-2">
          <div className="relative">
            <TextInput
              type={show ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={status.configured ? 'ใส่คีย์ใหม่เพื่อเปลี่ยน (sk-ant-…)' : 'sk-ant-…'}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="pr-11"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400" aria-label={show ? 'ซ่อนคีย์' : 'แสดงคีย์'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" size="sm" loading={busy} disabled={!key.trim()} className="w-full">บันทึกคีย์</Button>
          <p className="text-[12px] leading-snug text-slate-500">
            สร้างคีย์ได้ที่{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy-700 underline">console.anthropic.com</a>
            {' '}(ต้องเติมเครดิตในบัญชี) · ค่าใช้จ่ายประมาณ 1–2 บาทต่อรูป · คีย์เก็บไว้ที่ระบบหลังบ้านเท่านั้น
          </p>
        </form>
      )}
    </Card>
  );
}
