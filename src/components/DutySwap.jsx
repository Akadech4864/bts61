import { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, Pencil, Trash2, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, Field, Segmented, TextArea, inputClass } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx, formatDate, formatDateTime, nickOf, splitList, toISODate, useNow } from '../lib/utils';

/** ชื่อแบบสั้นในตารางเวร: ชื่อจริงตามด้วย ฯ */
export const firstNameShort = (m) => (m ? `${m.first_name || ''}${m.first_name && m.last_name ? 'ฯ' : ''}` : '');

const slotKey = (dutyId, memberId) => `${dutyId}|${memberId}`;

/**
 * สถานะการสลับของแต่ละช่องเวร: 'pending' = มีคำขอรออนุมัติ (จุดเหลือง), 'swapped' = สลับแล้ว (สีเขียว ค้างไว้)
 * หลังอนุมัติ คนที่มาแทนจะอยู่ในเวรเดิมของอีกฝ่าย จึงทำเครื่องหมายที่ (เวรเดิม, คนใหม่)
 */
export function swapMarks(swaps) {
  const marks = new Map();
  (swaps || []).forEach((s) => {
    if (s.status === 'approved') {
      marks.set(slotKey(s.from_duty_id, s.to_member_id), marks.get(slotKey(s.from_duty_id, s.to_member_id)) || 'swapped');
      marks.set(slotKey(s.to_duty_id, s.from_member_id), marks.get(slotKey(s.to_duty_id, s.from_member_id)) || 'swapped');
    }
  });
  (swaps || []).forEach((s) => {
    if (s.status === 'pending') {
      marks.set(slotKey(s.from_duty_id, s.from_member_id), 'pending');
      marks.set(slotKey(s.to_duty_id, s.to_member_id), 'pending');
    }
  });
  return marks;
}
export const markOf = (marks, dutyId, memberId) => marks.get(slotKey(dutyId, memberId)) || '';

/** จุดสถานะบนรูป: เหลือง = รออนุมัติ, เขียว = สลับแล้ว */
export function SwapDot({ mark, className }) {
  if (!mark) return null;
  const pending = mark === 'pending';
  return (
    <span
      role="img"
      aria-label={pending ? 'มีคำขอสลับเวรรออนุมัติ' : 'สลับเวรแล้ว'}
      title={pending ? 'มีคำขอสลับเวรรออนุมัติ' : 'สลับเวรแล้ว'}
      className={cx(
        'grid h-5 w-5 place-items-center rounded-full ring-2 ring-white',
        pending ? 'bg-amber-400 text-navy-950' : 'bg-emerald-500 text-white',
        className,
      )}
    >
      <ArrowLeftRight className="h-3 w-3" strokeWidth={2.6} />
    </span>
  );
}

/** ช่องเวรทั้งหมดที่ยังไม่ผ่าน (1 ช่อง = 1 คนในเวร 1 รายการ) */
function useSlots() {
  const { data, memberById } = useStore();
  const today = toISODate(useNow(60000));
  return useMemo(() => {
    const out = [];
    data.duty
      .filter((d) => d.duty_date && d.duty_date >= today)
      .sort((a, b) => a.duty_date.localeCompare(b.duty_date) || String(a.shift_or_role).localeCompare(String(b.shift_or_role)))
      .forEach((d) => {
        const ids = splitList(d.member_ids);
        ids.forEach((id) => {
          const m = memberById.get(id);
          if (m) out.push({ key: slotKey(d.id, m.id), duty: d, member: m, ids });
        });
      });
    return out;
  }, [data.duty, memberById, today]);
}

const slotLabel = (s) => `${formatDate(s.duty.duty_date, 'medium')} · ${s.duty.shift_or_role || 'เวร'} — ${nickOf(s.member)} (${firstNameShort(s.member)})`;

function SlotPreview({ slot, tone }) {
  if (!slot) return null;
  return (
    <div className={cx('flex items-center gap-2.5 rounded-2xl p-2', tone === 'from' ? 'bg-navy-500/[0.06]' : 'bg-gold-300/25')}>
      <Photo member={slot.member} width={96} className="h-11 w-11 shrink-0 rounded-full object-[center_20%]" textClass="text-sm" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold leading-tight text-navy-900">{nickOf(slot.member)} <span className="font-normal text-slate-500">{firstNameShort(slot.member)}</span></p>
        <p className="truncate text-[12.5px] text-slate-600">{formatDate(slot.duty.duty_date, 'medium')} · {slot.duty.shift_or_role}</p>
      </div>
    </div>
  );
}

/* ============================== ฟอร์มขอสลับเวร ============================== */

function SwapFormInner({ initial, onClose }) {
  const { data, saveSwap, deleteSwap } = useStore();
  const ui = useUI();
  const toast = useToast();
  const slots = useSlots();
  const isNew = !initial.id;
  const [fromKey, setFromKey] = useState(initial.from_duty_id ? slotKey(initial.from_duty_id, initial.from_member_id) : '');
  const [toKey, setToKey] = useState(initial.to_duty_id ? slotKey(initial.to_duty_id, initial.to_member_id) : '');
  const [reason, setReason] = useState(initial.reason || '');
  const [agreed, setAgreed] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ช่องเวรที่มีคำขออื่นรออนุมัติอยู่ เลือกซ้ำไม่ได้
  const busy = useMemo(() => {
    const set = new Set();
    (data.swaps || []).forEach((s) => {
      if (s.status !== 'pending' || s.id === initial.id) return;
      set.add(slotKey(s.from_duty_id, s.from_member_id));
      set.add(slotKey(s.to_duty_id, s.to_member_id));
    });
    return set;
  }, [data.swaps, initial.id]);

  const from = slots.find((s) => s.key === fromKey) || null;
  const toOptions = from
    ? slots.filter((s) => s.duty.id !== from.duty.id && s.member.id !== from.member.id && !from.ids.includes(s.member.id) && !s.ids.includes(from.member.id))
    : [];
  const to = toOptions.find((s) => s.key === toKey) || null;

  async function submit(e) {
    e.preventDefault();
    if (saving) return undefined;
    if (!from) return toast.error('กรุณาเลือกเวรของคุณ');
    if (!to) return toast.error('กรุณาเลือกเวรที่ต้องการสลับด้วย');
    if (!agreed) return toast.error(`กรุณายืนยันว่าได้ตกลงกับ ${nickOf(to.member)} แล้ว`);
    setSaving(true);
    try {
      await saveSwap({
        id: initial.id || '',
        from_duty_id: from.duty.id, from_member_id: from.member.id,
        to_duty_id: to.duty.id, to_member_id: to.member.id,
        reason, confirmed: true,
      });
      toast.success(isNew ? 'ส่งคำขอสลับเวรแล้ว รอแอดมินอนุมัติ' : 'แก้ไขคำขอสลับเวรแล้ว');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
    return undefined;
  }

  async function onDelete() {
    const ok = await ui.confirm({ title: 'ลบคำขอสลับเวรนี้?', message: 'คำขอจะถูกยกเลิก ตารางเวรไม่เปลี่ยนแปลง', confirmText: 'ลบคำขอ', danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteSwap(initial.id);
      toast.success('ลบคำขอแล้ว');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'ขอสลับเวร' : 'แก้ไขคำขอสลับเวร'}
      subtitle="ตกลงกับเพื่อนให้เรียบร้อย แล้วส่งคำขอให้แอดมินอนุมัติ"
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="dangerSoft" icon={Trash2} loading={deleting} disabled={saving} onClick={onDelete} className="shrink-0">ลบ</Button>
          )}
          <Button type="submit" form="swap-form" icon={Check} className="flex-1" loading={saving} disabled={deleting}>
            {saving ? 'กำลังส่ง…' : isNew ? 'ยืนยันขอสลับเวร' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      }
    >
      <form id="swap-form" onSubmit={submit} className="space-y-4 pb-4">
        {slots.length < 2 ? (
          <p className="rounded-2xl bg-white/60 p-4 text-center text-sm text-slate-500">ยังไม่มีเวรที่กำลังจะถึงให้สลับ</p>
        ) : (
          <>
            <Field label="เวรของฉัน" required>
              <select value={fromKey} onChange={(e) => { setFromKey(e.target.value); setToKey(''); }} className={cx(inputClass, 'pr-8')}>
                <option value="">— เลือกเวรของคุณ —</option>
                {slots.map((s) => (
                  <option key={s.key} value={s.key} disabled={busy.has(s.key)}>
                    {slotLabel(s)}{busy.has(s.key) ? ' (มีคำขอรออยู่)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <SlotPreview slot={from} tone="from" />

            <div className="flex justify-center text-slate-400"><ArrowLeftRight className="h-5 w-5 rotate-90" /></div>

            <Field label="สลับกับเวรของ" required>
              <select value={toKey} onChange={(e) => setToKey(e.target.value)} disabled={!from} className={cx(inputClass, 'pr-8 disabled:opacity-50')}>
                <option value="">{from ? '— เลือกเวรที่ต้องการสลับด้วย —' : 'เลือกเวรของคุณก่อน'}</option>
                {toOptions.map((s) => (
                  <option key={s.key} value={s.key} disabled={busy.has(s.key)}>
                    {slotLabel(s)}{busy.has(s.key) ? ' (มีคำขอรออยู่)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <SlotPreview slot={to} tone="to" />

            <Field label="เหตุผล (ไม่บังคับ)">
              <TextArea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="เช่น ติดภารกิจราชการ" className="min-h-[72px]" />
            </Field>

            <label className={cx('flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-inset transition', agreed ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-white/60 ring-slate-200')}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
              <span className="text-[14px] leading-snug text-slate-700">
                ยืนยันว่าได้ตกลงสลับเวรกับ <strong className="text-navy-900">{to ? nickOf(to.member) : 'เพื่อน'}</strong> เรียบร้อยแล้ว
              </span>
            </label>
          </>
        )}
      </form>
    </Sheet>
  );
}

export function SwapForm({ state, onClose }) {
  if (!state) return null;
  return <SwapFormInner key={state.key} initial={state.item || {}} onClose={onClose} />;
}

/* ============================== ประวัติการสลับเวร ============================== */

const STATUS = {
  pending: { label: 'รออนุมัติ', cls: 'bg-amber-400/25 text-amber-800' },
  approved: { label: 'สลับแล้ว', cls: 'bg-emerald-500/15 text-emerald-700' },
  rejected: { label: 'ไม่อนุมัติ', cls: 'bg-slate-500/10 text-slate-500' },
};

function SwapSide({ member, name, date, role }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Photo member={member || { first_name: name }} width={96} className="h-10 w-10 shrink-0 rounded-full object-[center_20%]" textClass="text-sm" />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-bold leading-tight text-navy-900">{member ? nickOf(member) : name}</p>
        <p className="truncate text-[12px] leading-tight text-slate-500">{formatDate(date, 'medium')}</p>
        <p className="truncate text-[12px] leading-tight text-slate-500">{role}</p>
      </div>
    </div>
  );
}

function SwapCard({ swap, canManage, isAdmin, onEdit }) {
  const { memberById, decideSwap, deleteSwap } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const st = STATUS[swap.status] || STATUS.pending;
  const pending = swap.status === 'pending';
  const fromM = memberById.get(swap.from_member_id);
  const toM = memberById.get(swap.to_member_id);
  const who = `${fromM ? nickOf(fromM) : swap.from_name} ⇄ ${toM ? nickOf(toM) : swap.to_name}`;

  const run = async (kind, fn, okText) => {
    setBusy(kind);
    try {
      await fn();
      toast.success(okText);
    } catch (err) {
      toast.error(err.message);
    }
    setBusy('');
  };
  const approve = async () => {
    const ok = await ui.confirm({ title: 'อนุมัติการสลับเวร?', message: `${who} — ระบบจะสลับรายชื่อในตารางเวรให้ทันที`, confirmText: 'อนุมัติ' });
    if (ok) run('approve', () => decideSwap(swap.id, 'approve'), 'อนุมัติและสลับเวรแล้ว');
  };
  const reject = async () => {
    const ok = await ui.confirm({ title: 'ไม่อนุมัติคำขอนี้?', message: who, confirmText: 'ไม่อนุมัติ', danger: true });
    if (ok) run('reject', () => decideSwap(swap.id, 'reject'), 'บันทึกว่าไม่อนุมัติแล้ว');
  };
  const remove = async () => {
    const ok = await ui.confirm({
      title: pending ? 'ลบคำขอสลับเวรนี้?' : 'ลบรายการนี้ออกจากประวัติ?',
      message: pending ? who : `${who} — ตารางเวรจะไม่เปลี่ยนกลับ`,
      confirmText: 'ลบ',
      danger: true,
    });
    if (ok) run('delete', () => deleteSwap(swap.id), 'ลบแล้ว');
  };

  return (
    <article className={cx('glass rounded-3xl p-3.5', pending && 'ring-1 ring-amber-300')}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className={cx('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', st.cls)}>{st.label}</span>
        <span className="truncate text-[11.5px] text-slate-400">ขอเมื่อ {formatDateTime(swap.created_at)}</span>
      </div>
      <div className="flex items-center gap-2">
        <SwapSide member={fromM} name={swap.from_name} date={swap.from_date} role={swap.from_role} />
        <ArrowLeftRight className={cx('h-5 w-5 shrink-0', swap.status === 'approved' ? 'text-emerald-600' : pending ? 'text-amber-500' : 'text-slate-300')} />
        <SwapSide member={toM} name={swap.to_name} date={swap.to_date} role={swap.to_role} />
      </div>
      {swap.reason && <p className="mt-2 text-[13px] leading-snug text-slate-600">เหตุผล: {swap.reason}</p>}
      {!pending && swap.decided_at && (
        <p className="mt-1 text-[12px] text-slate-400">
          {swap.status === 'approved' ? 'อนุมัติ' : 'พิจารณา'}เมื่อ {formatDateTime(swap.decided_at)}{swap.admin_note ? ` · ${swap.admin_note}` : ''}
        </p>
      )}
      {(isAdmin || (pending && canManage)) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {isAdmin && pending && (
            <>
              <Button size="sm" icon={Check} loading={busy === 'approve'} disabled={!!busy} onClick={approve}>อนุมัติ</Button>
              <Button size="sm" variant="soft" icon={X} loading={busy === 'reject'} disabled={!!busy} onClick={reject}>ไม่อนุมัติ</Button>
            </>
          )}
          <span className="flex-1" />
          {pending && (isAdmin || canManage) && (
            <Button size="sm" variant="ghost" icon={Pencil} disabled={!!busy} onClick={() => onEdit(swap)}>แก้ไข</Button>
          )}
          <Button size="sm" variant="ghost" icon={Trash2} loading={busy === 'delete'} disabled={!!busy} onClick={remove} className="text-rose-600">ลบ</Button>
        </div>
      )}
    </article>
  );
}

export function SwapHistory({ open, onClose, onEdit }) {
  const { data, isAdmin, mySwaps } = useStore();
  const swaps = data.swaps || [];
  const pendingCount = swaps.filter((s) => s.status === 'pending').length;
  const [filter, setFilter] = useState(pendingCount ? 'pending' : 'all');
  const list = [...swaps]
    .filter((s) => filter === 'all' || s.status === filter)
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || String(b.created_at).localeCompare(String(a.created_at)));

  return (
    <Sheet open={open} onClose={onClose} title="ประวัติการสลับเวร" subtitle={isAdmin ? 'แอดมินอนุมัติ / ไม่อนุมัติคำขอได้ที่นี่' : 'คำขอของเครื่องนี้แก้ไขหรือลบได้ระหว่างรออนุมัติ'}>
      <div className="pb-5">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          className="mb-3 w-full [&>button]:flex-1"
          options={[
            { value: 'pending', label: `รออนุมัติ${pendingCount ? ` (${pendingCount})` : ''}` },
            { value: 'approved', label: 'สลับแล้ว' },
            { value: 'all', label: 'ทั้งหมด' },
          ]}
        />
        {list.length === 0 ? (
          <p className="rounded-2xl bg-white/60 p-6 text-center text-sm text-slate-500">
            {filter === 'pending' ? 'ไม่มีคำขอที่รออนุมัติ' : 'ยังไม่มีประวัติการสลับเวร'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {list.map((s) => (
              <SwapCard key={s.id} swap={s} isAdmin={isAdmin} canManage={mySwaps.includes(s.id)} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
