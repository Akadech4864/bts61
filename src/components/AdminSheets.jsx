import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Eye, EyeOff, KeyRound, Mail, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, EmptyState, Field, IconButton, TextInput } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { compareClass, cx, formatDate, fullName, matchMember, nickOf, normalize, queryTokens, resolveDuty, thCompare, timeRange } from '../lib/utils';

/* ============================== หน้าจัดการข้อมูล (แอดมิน) ============================== */

function ManageRow({ leading, title, subtitle, onEdit, onDelete }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {leading}
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-medium text-navy-900">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-slate-500">{subtitle}</span>}
      </button>
      <IconButton icon={Pencil} label="แก้ไข" onClick={onEdit} />
      <IconButton icon={Trash2} label="ลบ" tone="danger" onClick={onDelete} />
    </li>
  );
}

function DateBadge({ iso }) {
  const [, m, d] = (iso || '--').split('-');
  const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-500/10 text-navy-800 ring-1 ring-inset ring-white/70">
      <div className="text-center leading-none">
        <div className="text-base font-bold">{Number(d) || '–'}</div>
        <div className="mt-0.5 text-[10px] font-medium text-navy-500">{months[Number(m)] || ''}</div>
      </div>
    </div>
  );
}

/** kind: 'members' | 'classes' | 'duty' | null */
export function ManageSheet({ kind, onClose }) {
  const { data, memberById, deleteMember, deleteClass, deleteDuty } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [kind]);

  const tokens = useMemo(() => queryTokens(query), [query]);
  const textMatch = (text) => tokens.every((t) => normalize(text).includes(t));

  const config = useMemo(() => {
    if (kind === 'members') {
      const items = data.members
        .filter((m) => matchMember(m, tokens))
        .sort((a, b) => (Number(a.seq) || 9999) - (Number(b.seq) || 9999) || thCompare(a.first_name, b.first_name));
      return {
        title: 'จัดการรายชื่อผู้เข้าอบรม',
        addLabel: 'เพิ่มรายชื่อ',
        total: data.members.length,
        onAdd: () => ui.openMemberForm(null),
        rows: items.map((m) => ({
          id: m.id,
          leading: <Photo member={m} width={96} className="h-12 w-12 shrink-0 rounded-xl" textClass="text-base" />,
          title: fullName(m),
          subtitle: [m.nickname && `“${m.nickname}”`, m.position].filter(Boolean).join(' · '),
          onEdit: () => ui.openMemberForm(m),
          confirm: { title: 'ลบรายชื่อนี้?', message: `${fullName(m)} จะถูกลบออกจากทำเนียบรุ่น` },
          remove: () => deleteMember(m.id),
        })),
      };
    }
    if (kind === 'classes') {
      const items = [...data.classes]
        .filter((c) => textMatch([c.subject, c.speaker, c.location, formatDate(c.class_date)].join(' ')))
        .sort((a, b) => compareClass(b, a));
      return {
        title: 'จัดการตารางสอน',
        addLabel: 'เพิ่มตารางสอน',
        total: data.classes.length,
        onAdd: () => ui.openClassForm(null),
        rows: items.map((c) => ({
          id: c.id,
          leading: <DateBadge iso={c.class_date} />,
          title: c.subject,
          subtitle: [timeRange(c.start_time, c.end_time), c.speaker].filter(Boolean).join(' · '),
          onEdit: () => ui.openClassForm(c),
          confirm: { title: 'ลบรายการสอนนี้?', message: `${c.subject} — ${formatDate(c.class_date)}` },
          remove: () => deleteClass(c.id),
        })),
      };
    }
    if (kind === 'duty') {
      const items = data.duty
        .map((d) => ({ d, people: resolveDuty(d, memberById, data.members) }))
        .map((x) => ({ ...x, names: [...x.people.members.map((m) => nickOf(m)), ...x.people.extras].join(', ') }))
        .filter((x) => textMatch([x.d.shift_or_role, x.names, x.d.member_names, formatDate(x.d.duty_date)].join(' ')))
        .sort((a, b) => (b.d.duty_date || '').localeCompare(a.d.duty_date || '') || thCompare(a.d.shift_or_role, b.d.shift_or_role));
      return {
        title: 'จัดการตารางเวร',
        addLabel: 'เพิ่มตารางเวร',
        total: data.duty.length,
        onAdd: () => ui.openDutyForm(null),
        rows: items.map(({ d, names }) => ({
          id: d.id,
          leading: <DateBadge iso={d.duty_date} />,
          title: d.shift_or_role || 'เวร',
          subtitle: names || 'ยังไม่ระบุผู้เข้าเวร',
          onEdit: () => ui.openDutyForm(d),
          confirm: { title: 'ลบรายการเวรนี้?', message: `${d.shift_or_role || 'เวร'} — ${formatDate(d.duty_date)}` },
          remove: () => deleteDuty(d.id),
        })),
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, data, tokens, memberById]);

  if (!config) return null;

  async function onDelete(row) {
    const ok = await ui.confirm({ ...row.confirm, confirmText: 'ลบ', danger: true });
    if (!ok) return;
    try {
      await row.remove();
      toast.success('ลบเรียบร้อย');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={config.title}
      subtitle={`ทั้งหมด ${config.total} รายการ`}
      footer={
        <Button icon={Plus} className="w-full" onClick={config.onAdd}>
          {config.addLabel}
        </Button>
      }
    >
      <div className="sticky top-0 z-10 bg-white/70 pb-2 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหา" className="pl-10" enterKeyHint="search" />
        </div>
      </div>
      {config.rows.length === 0 ? (
        <EmptyState icon={Search} title={query ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีข้อมูล'} description={query ? 'ลองใช้คำค้นอื่น' : `กด "${config.addLabel}" เพื่อเริ่มต้น`} />
      ) : (
        <ul className="divide-y divide-slate-100 pb-4">
          {config.rows.map((row) => (
            <ManageRow key={row.id} {...row} onDelete={() => onDelete(row)} />
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ============================== ตั้ง/เปลี่ยน/กู้คืนรหัสผ่านด้วย OTP ============================== */

function useCountdown(until) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    if (!until) return undefined;
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function PasswordField({ label, value, onChange, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <TextInput
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-slate-400 hover:text-navy-700"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </Field>
  );
}

function PasswordResetInner({ onClose }) {
  const { requestOtp, verifyOtp, resetPassword } = useStore();
  const toast = useToast();
  const [step, setStep] = useState('request'); // request | otp | password
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // { sentTo, expiresAt }
  const [resendAt, setResendAt] = useState(0);
  const [otp, setOtp] = useState('');
  const [ticket, setTicket] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const expiresIn = useCountdown(sent ? sent.expiresAt : 0);
  const resendIn = useCountdown(resendAt);

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await requestOtp();
      setSent(res);
      setResendAt(Date.now() + (res.cooldownSeconds || 60) * 1000);
      setOtp('');
      setStep('otp');
      if (res.demoOtp) toast.info(`โหมดตัวอย่าง: รหัส OTP คือ ${res.demoOtp}`, 15000);
      else toast.success('ส่งรหัส OTP ไปยังอีเมลผู้ดูแลแล้ว');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    if (busy || otp.length !== 6) return;
    setBusy(true);
    try {
      const res = await verifyOtp(otp);
      setTicket(res.ticket);
      setStep('password');
    } catch (err) {
      toast.error(err.message);
      if (err.code === 'OTP_EXPIRED' || err.code === 'OTP_LOCKED') setStep('request');
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 4) return toast.error('รหัสผ่านใหม่ต้องยาวอย่างน้อย 4 ตัวอักษร');
    if (pw !== pw2) return toast.error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    try {
      await resetPassword(ticket, pw);
      toast.success('ตั้งรหัสผ่านใหม่เรียบร้อย เข้าสู่ระบบแอดมินแล้ว');
      onClose();
    } catch (err) {
      toast.error(err.message);
      if (err.code === 'OTP_EXPIRED') setStep('request');
      setBusy(false);
    }
    return undefined;
  }

  const steps = ['request', 'otp', 'password'];
  return (
    <Sheet open onClose={onClose} dismissable={false} title="ตั้งรหัสผ่านแอดมินใหม่" subtitle="ยืนยันตัวตนด้วยรหัส OTP ทางอีเมลผู้ดูแล">
      <div className="mb-5 flex gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className={cx('h-1.5 flex-1 rounded-full', steps.indexOf(step) >= i ? 'bg-navy-800' : 'bg-slate-200')} />
        ))}
      </div>

      {step === 'request' && (
        <div className="space-y-4 pb-2">
          <div className="flex items-start gap-3 rounded-2xl bg-navy-500/10 p-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
            <p className="text-sm leading-relaxed text-navy-800">
              ระบบจะส่งรหัส OTP 6 หลัก (อายุ 10 นาที) ไปยัง<strong>อีเมลผู้ดูแลระบบที่กำหนดไว้ตายตัว</strong>เท่านั้น
              ไม่สามารถเปลี่ยนอีเมลปลายทางจากหน้านี้ได้
            </p>
          </div>
          <Button icon={Mail} size="lg" className="w-full" loading={busy} onClick={send}>
            ส่งรหัส OTP
          </Button>
        </div>
      )}

      {step === 'otp' && (
        <form onSubmit={verify} className="space-y-4 pb-2">
          <p className="text-sm leading-relaxed text-slate-600">
            กรอกรหัส 6 หลักที่ส่งไปยัง <strong className="text-navy-900">{sent && sent.sentTo}</strong>
          </p>
          <TextInput
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="••••••"
            aria-label="รหัส OTP"
            className="h-16! text-center text-3xl! font-semibold tracking-[0.5em]"
          />
          <div className="flex items-center justify-between text-[13px]">
            <span className={expiresIn > 0 ? 'text-slate-500' : 'font-medium text-rose-600'}>
              {expiresIn > 0 ? `รหัสหมดอายุใน ${mmss(expiresIn)}` : 'รหัสหมดอายุแล้ว'}
            </span>
            <button type="button" onClick={send} disabled={resendIn > 0 || busy} className="font-semibold text-navy-700 disabled:text-slate-400">
              {resendIn > 0 ? `ส่งใหม่ได้ใน ${resendIn} วิ` : 'ส่งรหัสใหม่'}
            </button>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={otp.length !== 6}>
            ยืนยันรหัส OTP
          </Button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={save} className="space-y-4 pb-2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-700">
            <ShieldCheck className="h-5 w-5 shrink-0" /> ยืนยัน OTP สำเร็จ ตั้งรหัสผ่านใหม่ได้เลย
          </div>
          <PasswordField label="รหัสผ่านใหม่" value={pw} onChange={setPw} autoFocus />
          <PasswordField label="ยืนยันรหัสผ่านใหม่" value={pw2} onChange={setPw2} />
          <p className="text-xs text-slate-400">แนะนำ 6 ตัวอักษรขึ้นไป และไม่ใช้รหัสตั้งต้น</p>
          <Button type="submit" icon={KeyRound} size="lg" className="w-full" loading={busy}>
            บันทึกรหัสผ่านใหม่
          </Button>
        </form>
      )}
    </Sheet>
  );
}

export function PasswordResetSheet({ open, onClose }) {
  if (!open) return null;
  return <PasswordResetInner onClose={onClose} />;
}

export function MenuRow({ icon: Icon, title, description, onClick, tone = 'navy' }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left transition active:opacity-70">
      <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tone === 'gold' ? 'bg-gold-400/20 text-gold-700' : 'bg-navy-500/10 text-navy-600')}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-slate-800">{title}</span>
        {description && <span className="block truncate text-[13px] text-slate-500">{description}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
    </button>
  );
}
