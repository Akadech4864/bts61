import { useState } from 'react';
import { MessageCircle, Phone, Send } from 'lucide-react';
import { Sheet } from './Sheet';
import { Button, Field, TextArea, TextInput } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx } from '../lib/utils';
import { DEVELOPER, developerLine, developerTel, versionLabel } from '../lib/about';

const CATEGORIES = ['ใช้งานไม่ได้', 'ข้อมูลไม่ถูกต้อง', 'ข้อเสนอแนะ', 'อื่น ๆ'];

/** แจ้งปัญหา / ข้อเสนอแนะ — ส่งถึงผู้ดูแลระบบทางอีเมล หรือติดต่อผู้พัฒนาโดยตรง */
function ReportInner({ onClose }) {
  const { reportIssue } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [category, setCategory] = useState('ใช้งานไม่ได้');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (sending) return;
    if (message.replace(/\s/g, '').length < 5) {
      toast.error('กรุณาเล่ารายละเอียดของปัญหาอย่างน้อยสักประโยค');
      return;
    }
    setSending(true);
    try {
      await reportIssue({
        category, message, name, contact,
        page: ui.tab, app_version: versionLabel(), user_agent: navigator.userAgent,
      });
      toast.success('ส่งเรื่องเรียบร้อย ขอบคุณที่แจ้งครับ');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSending(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="แจ้งปัญหา / ข้อเสนอแนะ"
      subtitle="ส่งถึงผู้ดูแลระบบทันที"
      footer={
        <Button type="submit" form="report-form" icon={Send} className="w-full" loading={sending}>
          {sending ? 'กำลังส่ง…' : 'ส่งเรื่อง'}
        </Button>
      }
    >
      <form id="report-form" onSubmit={submit} className="space-y-4 pb-4">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-slate-600">เรื่อง</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cx('h-9 rounded-full px-3.5 text-[13px] font-semibold transition', category === c ? 'btn-navy text-white' : 'glass text-slate-600')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <Field label="รายละเอียด" required>
          <TextArea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="เช่น กดปุ่มขอสลับเวรแล้วขึ้นข้อความผิดพลาด / ข้อมูลของ … ไม่ถูกต้อง" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อผู้แจ้ง (ถ้ามี)">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="ชื่อเล่น / ลำดับที่" />
          </Field>
          <Field label="ช่องทางติดต่อกลับ">
            <TextInput value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="เบอร์ / LINE" />
          </Field>
        </div>

        <div className="rounded-2xl bg-white/60 p-3 ring-1 ring-inset ring-white/80">
          <p className="text-[12px] text-slate-500">หรือติดต่อผู้พัฒนาระบบโดยตรง</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <img src={DEVELOPER.photo} alt={DEVELOPER.name} className="h-11 w-11 shrink-0 rounded-full bg-slate-200 object-cover object-left-top ring-2 ring-white" />
            <p className="min-w-0 text-[14px] font-semibold leading-snug text-navy-900">{DEVELOPER.name} ({DEVELOPER.nick})</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href={developerTel} className="glass inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-navy-800">
              <Phone className="h-4 w-4" /> {DEVELOPER.phone}
            </a>
            <a href={developerLine} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#06C755] text-[13px] font-semibold text-white">
              <MessageCircle className="h-4 w-4" /> LINE {DEVELOPER.line}
            </a>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">เวอร์ชันแอป {versionLabel()}</p>
        </div>
      </form>
    </Sheet>
  );
}

export default function ReportSheet({ open, onClose }) {
  if (!open) return null;
  return <ReportInner onClose={onClose} />;
}
