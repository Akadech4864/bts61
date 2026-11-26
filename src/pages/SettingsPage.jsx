import { useState } from 'react';
import {
  BookOpen, CalendarDays, Eye, EyeOff, FlaskConical, FolderOpen, GraduationCap, KeyRound, Landmark, Lock, LogOut, RefreshCw, ShieldCheck, TriangleAlert, Users,
} from 'lucide-react';
import AiKeyCard from '../components/AiKeyCard';
import { Button, Card, PageHeader, Switch, TextInput } from '../components/ui';
import { ManageSheet, MenuRow, PasswordResetSheet } from '../components/AdminSheets';
import { useToast } from '../components/Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { isDemo } from '../lib/api';
import { APP_NAME, COURSE_PERIOD, COURSE_PLACE } from '../config';
import { cx, formatDateTime } from '../lib/utils';

function SectionTitle({ children }) {
  return <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
}

function LoginCard({ onForgot }) {
  const { login } = useStore();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      const session = await login(password);
      setPassword('');
      toast.success('เข้าสู่ระบบแอดมินแล้ว');
      if (session.usingDefaultPassword && !isDemo) toast.info('ยังใช้รหัสผ่านตั้งต้นอยู่ ควรเปลี่ยนรหัสผ่านใหม่', 6000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl btn-navy text-gold-300">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight text-navy-900">เข้าสู่ระบบแอดมิน</h2>
          <p className="text-[13px] text-slate-500">สำหรับผู้ดูแลระบบของรุ่นเท่านั้น</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <TextInput
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isDemo ? 'รหัสผ่าน (โหมดตัวอย่าง: demo)' : 'รหัสผ่านแอดมิน'}
            autoComplete="current-password"
            aria-label="รหัสผ่านแอดมิน"
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
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!password}>
          เข้าสู่ระบบ
        </Button>
      </form>
      <button type="button" onClick={onForgot} className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">
        ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่ด้วย OTP
      </button>
    </Card>
  );
}

function PermissionCard() {
  const { data, saveSettings } = useStore();
  const toast = useToast();
  const [busyKey, setBusyKey] = useState('');
  const s = data.settings;
  const master = !!s.public_edit_enabled;

  async function toggle(key, value, label) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await saveSettings({ [key]: value });
      toast.success(`${value ? 'เปิด' : 'ปิด'}: ${label}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyKey('');
    }
  }

  const subs = [
    { key: 'allow_public_add', label: 'เพิ่มรายชื่อใหม่', description: 'ผู้ใช้ทั่วไปเพิ่มรายชื่อที่ยังไม่มีในระบบได้' },
    { key: 'allow_public_edit', label: 'แก้ไขข้อมูล', description: 'ชื่อ-สกุล ชื่อเล่น ตำแหน่ง สังกัด เบอร์โทร' },
    { key: 'allow_public_photo_edit', label: 'อัปโหลด / เปลี่ยนรูปถ่าย', description: 'ถ่ายรูปหรือเลือกรูปหน้าตรงของตนเอง' },
  ];

  return (
    <Card className="overflow-hidden">
      <div className={cx('px-5 transition-colors', master ? 'glass-dark rounded-none! border-0!' : 'bg-white/40')}>
        <label className="flex cursor-pointer items-center gap-3 py-4">
          <span className="min-w-0 flex-1">
            <span className={cx('block text-base font-semibold', master ? 'text-white' : 'text-navy-900')}>โหมดแก้ไขสำหรับผู้ใช้งานทั่วไป</span>
            <span className={cx('mt-0.5 block text-[13px] leading-snug', master ? 'text-white/70' : 'text-slate-500')}>
              {master ? 'เปิดอยู่ — มีผลกับผู้ใช้ทุกคนทันที' : 'ปิดอยู่ — เฉพาะแอดมินเท่านั้นที่แก้ไขได้'}
            </span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={master}
              disabled={!!busyKey}
              onChange={(e) => toggle('public_edit_enabled', e.target.checked, 'โหมดแก้ไขสำหรับผู้ใช้งานทั่วไป')}
            />
            <span className="h-8 w-14 rounded-full bg-slate-300 transition peer-checked:bg-gold-400" />
            <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-6" />
          </span>
        </label>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {subs.map((sub) => (
          <Switch
            key={sub.key}
            label={sub.label}
            description={sub.description}
            checked={!!s[sub.key]}
            disabled={!master || (!!busyKey && busyKey !== sub.key)}
            busy={busyKey === sub.key}
            onChange={(v) => toggle(sub.key, v, sub.label)}
          />
        ))}
      </div>
      {!master && <p className="border-t border-white/70 bg-white/30 px-5 py-2.5 text-xs text-slate-500">เปิดสวิตช์หลักก่อน จึงจะกำหนดสิทธิ์ย่อยได้</p>}
    </Card>
  );
}

export default function SettingsPage() {
  const { data, isAdmin, auth, logout, refresh, syncing, lastSync, error } = useStore();
  const toast = useToast();
  const ui = useUI();
  const [manage, setManage] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const s = data.settings;
  const publicOpen = s.public_edit_enabled && (s.allow_public_add || s.allow_public_edit || s.allow_public_photo_edit);

  return (
    <div className="mx-auto max-w-2xl px-4 page-bottom">
      <PageHeader title={isAdmin ? 'แผงควบคุมแอดมิน' : 'ตั้งค่า / แอดมิน'} />

      {isDemo && (
        <div className="glass mb-4 flex items-start gap-3 rounded-2xl p-4 ring-1 ring-inset ring-gold-300">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
          <div className="text-[13px] leading-relaxed text-gold-700">
            <p className="font-semibold">โหมดตัวอย่าง — ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>
            <p>ข้อมูลที่เห็นเป็นข้อมูลสมมติและเก็บในเครื่องนี้เท่านั้น ใส่ Web App URL ใน <code className="rounded bg-white/70 px-1">src/config.js</code> เพื่อใช้งานจริง (รหัสแอดมินของโหมดตัวอย่างคือ <strong>demo</strong>)</p>
          </div>
        </div>
      )}

      {!isAdmin ? (
        <>
          <LoginCard onForgot={() => setResetOpen(true)} />
          <SectionTitle>สถานะการแก้ไขข้อมูล</SectionTitle>
          <Card className="flex items-center gap-3 p-4">
            <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', publicOpen ? 'bg-emerald-500/15 text-emerald-600' : 'bg-white/60 text-slate-400')}>
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-slate-800">{publicOpen ? 'ผู้ดูแลเปิดให้แก้ไขข้อมูลได้' : 'ผู้ดูแลยังไม่เปิดให้แก้ไขข้อมูล'}</p>
              <p className="text-[13px] text-slate-500">
                {publicOpen
                  ? [s.allow_public_add && 'เพิ่มรายชื่อ', s.allow_public_edit && 'แก้ไขข้อมูล', s.allow_public_photo_edit && 'เปลี่ยนรูปถ่าย'].filter(Boolean).join(' · ')
                  : 'หากข้อมูลของท่านไม่ถูกต้อง กรุณาแจ้งผู้ดูแลระบบของรุ่น'}
              </p>
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="glass-dark flex items-center gap-3 rounded-3xl p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">เข้าสู่ระบบแอดมินแล้ว</p>
              <p className="truncate text-[13px] text-white/60">เซสชันหมดอายุ {auth ? formatDateTime(auth.expiresAt) : ''}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                toast.info('ออกจากระบบแอดมินแล้ว');
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm font-semibold ring-1 ring-inset ring-white/15 transition active:scale-95"
            >
              <LogOut className="h-4 w-4" /> ออก
            </button>
          </div>

          {auth && auth.usingDefaultPassword && !isDemo && (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="glass mt-3 flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset ring-rose-300"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <span className="text-[13px] leading-relaxed text-rose-700">
                <strong className="block font-semibold">ยังใช้รหัสผ่านตั้งต้นอยู่</strong>
                แตะที่นี่เพื่อตั้งรหัสผ่านใหม่ (ยืนยันด้วย OTP ทางอีเมล) เพื่อความปลอดภัยของข้อมูลรุ่น
              </span>
            </button>
          )}

          <SectionTitle>สิทธิ์ของผู้ใช้งานทั่วไป</SectionTitle>
          <PermissionCard />

          <SectionTitle>จัดการข้อมูล</SectionTitle>
          <Card className="divide-y divide-slate-100 px-4">
            <MenuRow icon={Users} title="รายชื่อผู้เข้าอบรม" description={`${data.members.length} คน · เพิ่ม แก้ไข ลบ`} onClick={() => setManage('members')} />
            <MenuRow icon={BookOpen} title="ตารางสอน" description={`${data.classes.length} รายการ · เพิ่ม แก้ไข ลบ`} onClick={() => setManage('classes')} />
            <MenuRow icon={CalendarDays} title="ตารางเวร" description={`${data.duty.length} รายการ · เพิ่ม แก้ไข ลบ`} onClick={() => setManage('duty')} />
            <MenuRow icon={GraduationCap} title="อาจารย์" description={`${(data.instructors || []).length} ท่าน · แก้ไขได้ที่เมนูหลักสูตร > อาจารย์`} onClick={() => ui.go('course', { tab: 'instructors' })} />
            <MenuRow icon={FolderOpen} title="งาน / เอกสาร" description={`${(data.resources || []).length} รายการ · แก้ไขได้ที่เมนูหลักสูตร > วิชา`} onClick={() => ui.go('course', { tab: 'docs' })} />
            <MenuRow icon={Landmark} title="ผู้บริหารหลักสูตร" description={`${(data.staff || []).length} ท่าน · แก้ไขได้ที่เมนูหลักสูตร > ข้อมูลหลักสูตร`} onClick={() => ui.go('course', { tab: 'info' })} />
          </Card>

          <SectionTitle>AI ช่วยกรอกข้อมูล</SectionTitle>
          <AiKeyCard />

          <SectionTitle>ความปลอดภัย</SectionTitle>
          <Card className="px-4">
            <MenuRow icon={KeyRound} tone="gold" title="เปลี่ยนรหัสผ่านแอดมิน" description="ยืนยันด้วยรหัส OTP ทางอีเมลผู้ดูแล" onClick={() => setResetOpen(true)} />
          </Card>
        </>
      )}

      <SectionTitle>ข้อมูลระบบ</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-slate-800">ซิงก์ข้อมูลล่าสุด</p>
            <p className={cx('truncate text-[13px]', error ? 'text-rose-600' : 'text-slate-500')}>
              {error || (lastSync ? formatDateTime(lastSync) : 'ยังไม่เคยซิงก์')}
            </p>
          </div>
          <Button variant="soft" size="sm" icon={RefreshCw} loading={syncing} onClick={() => refresh().then((ok) => ok && toast.success('อัปเดตข้อมูลล่าสุดแล้ว'))}>
            รีเฟรช
          </Button>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          {[
            ['ผู้เข้าอบรม', data.members.length],
            ['รายการสอน', data.classes.length],
            ['รายการเวร', data.duty.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/50 py-2.5 ring-1 ring-inset ring-white/70">
              <dd className="text-xl font-bold text-navy-900 tabular-nums">{value}</dd>
              <dt className="text-[11px] text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-8 flex flex-col items-center gap-2 px-6 text-center">
        <img src="./logo.jpg" alt="" className="h-14 w-14 rounded-full bg-white object-cover shadow-[0_6px_16px_-6px_rgb(11_28_54/0.4)] ring-2 ring-white/80" />
        <p className="text-sm font-semibold text-navy-900">{APP_NAME}</p>
        <p className="text-xs leading-relaxed text-slate-400">
          {COURSE_PERIOD} · {COURSE_PLACE}
        </p>
      </div>

      <ManageSheet kind={manage} onClose={() => setManage(null)} />
      <PasswordResetSheet open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
