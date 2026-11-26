import { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, Pencil, Search, Trash2, UserRoundPlus, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, Field, Segmented, TextArea } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx, formatDate, formatDateTime, matchMember, nickOf, normalize, queryTokens, splitList, toISODate, useNow } from '../lib/utils';

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
      if (s.to_duty_id) marks.set(slotKey(s.to_duty_id, s.from_member_id), marks.get(slotKey(s.to_duty_id, s.from_member_id)) || 'swapped');
    }
  });
  (swaps || []).forEach((s) => {
    if (s.status === 'pending') {
      marks.set(slotKey(s.from_duty_id, s.from_member_id), 'pending');
      if (s.to_duty_id) marks.set(slotKey(s.to_duty_id, s.to_member_id), 'pending');
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

function SlotPreview({ slot, tone, onChange }) {
  if (!slot) return null;
  return (
    <div className={cx('flex items-center gap-2.5 rounded-2xl p-2', tone === 'from' ? 'bg-navy-500/[0.07]' : 'bg-gold-300/25')}>
      <Photo member={slot.member} width={120} className="h-12 w-12 shrink-0 rounded-full object-[center_20%] ring-2 ring-white" textClass="text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-tight text-navy-900">{nickOf(slot.member)} <span className="font-normal text-slate-500">{firstNameShort(slot.member)}</span></p>
        <p className="truncate text-[12.5px] text-slate-600">{formatDate(slot.duty.duty_date, 'medium')} · {slot.duty.shift_or_role}</p>
      </div>
      {onChange && <button type="button" onClick={onChange} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-navy-700 hover:bg-white/70">เปลี่ยน</button>}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className="h-11 w-full rounded-2xl bg-white/80 pl-10 pr-9 text-[16px] text-slate-900 outline-none ring-1 ring-inset ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-navy-500/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="ล้างคำค้น" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const StepTitle = ({ n, children }) => (
  <p className="mb-2 flex items-center gap-2 text-[14px] font-bold text-navy-900">
    <span className="grid h-6 w-6 place-items-center rounded-full bg-navy-900 text-[12px] text-white">{n}</span> {children}
  </p>
);

/** การ์ดรูปคนแบบหน้าทำเนียบรุ่น (ใช้เลือกคนที่จะสลับด้วย) */
function PersonPick({ member, badge, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(member.id)}
      className="relative overflow-hidden rounded-2xl bg-white/40 text-left shadow-[0_8px_18px_-12px_rgb(11_28_54/0.45)] ring-1 ring-white/70 transition active:scale-[0.96]"
    >
      <Photo member={member} width={220} className="aspect-[3/4] w-full" textClass="text-2xl" />
      {member.seq && (
        <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-navy-950/60 px-1 text-[10px] font-semibold tabular-nums text-white">{member.seq}</span>
      )}
      {badge && <span className="absolute right-1 top-1 rounded-full bg-gold-400 px-1.5 text-[10px] font-bold leading-5 text-navy-950">{badge}</span>}
      <span className="name-fade absolute inset-x-0 bottom-0 block px-1.5 pb-1.5 pt-6">
        <span className="block truncate text-[13px] font-bold leading-tight text-white drop-shadow">{nickOf(member)}</span>
        <span className="block truncate text-[10.5px] leading-tight text-white/85">{firstNameShort(member)}</span>
      </span>
    </button>
  );
}

/* ============================== ฟอร์มขอสลับเวร ============================== */

/**
 * ขอสลับเวร 3 ขั้น: (1) เวรของฉัน (2) เลือกคนจากการ์ดทุกคน ค้นหาชื่อได้ (3) แลกกับเวรของเขา หรือให้มาแทนโดยไม่ต้องแลกคืน
 */
function SwapFormInner({ initial, onClose }) {
  const { data, memberById, saveSwap, deleteSwap } = useStore();
  const ui = useUI();
  const toast = useToast();
  const slots = useSlots();
  const isNew = !initial.id;
  const [fromKey, setFromKey] = useState(initial.from_duty_id ? slotKey(initial.from_duty_id, initial.from_member_id) : '');
  const [toMemberId, setToMemberId] = useState(initial.to_member_id || '');
  // null = ยังไม่เลือก, '' = ให้มาแทน (ไม่ต้องแลกคืน), อื่น ๆ = id ของเวรอีกฝ่าย
  const [toDutyId, setToDutyId] = useState(initial.to_member_id ? initial.to_duty_id || '' : null);
  const [slotQuery, setSlotQuery] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [reason, setReason] = useState(initial.reason || '');
  const [agreed, setAgreed] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ช่องเวรที่มีคำขออื่นรออนุมัติอยู่ เลือกซ้ำไม่ได้
  const busy = useMemo(() => {
    const set = new Set();
    (data.swaps || []).forEach((x) => {
      if (x.status !== 'pending' || x.id === initial.id) return;
      set.add(slotKey(x.from_duty_id, x.from_member_id));
      if (x.to_duty_id) set.add(slotKey(x.to_duty_id, x.to_member_id));
    });
    return set;
  }, [data.swaps, initial.id]);

  const from = slots.find((x) => x.key === fromKey) || null;
  const slotTokens = queryTokens(slotQuery);
  const slotList = slots.filter((x) => matchMember(x.member, slotTokens) || (slotTokens.length && slotTokens.every((t) => normalize(`${x.duty.shift_or_role} ${formatDate(x.duty.duty_date, 'medium')}`).includes(t))));
  // เวรของอีกฝ่ายที่แลกได้ (ไม่ใช่เวรเดียวกัน และผู้ขอไม่ได้อยู่ในเวรนั้นอยู่แล้ว)
  const tradable = (memberId) => (from ? slots.filter((x) => x.member.id === memberId && x.duty.id !== from.duty.id && !x.ids.includes(from.member.id)) : []);
  const personTokens = queryTokens(personQuery);
  const people = useMemo(
    () => (from ? data.members.filter((m) => m.id !== from.member.id && !from.ids.includes(m.id)) : [])
      .sort((a, b) => (Number(a.seq) || 9999) - (Number(b.seq) || 9999)),
    [data.members, from],
  );
  const shownPeople = people.filter((m) => matchMember(m, personTokens));
  const toMember = toMemberId ? memberById.get(toMemberId) : null;
  const theirSlots = toMember ? tradable(toMember.id) : [];

  const pickPerson = (id) => {
    setToMemberId(id);
    const options = tradable(id).filter((x) => !busy.has(x.key));
    setToDutyId(options.length ? options[0].duty.id : '');
    setPersonQuery('');
  };

  async function submit(e) {
    e.preventDefault();
    if (saving) return undefined;
    if (!from) return toast.error('กรุณาเลือกเวรของคุณ');
    if (!toMember || toDutyId === null) return toast.error('กรุณาเลือกคนที่ต้องการสลับด้วย');
    if (!agreed) return toast.error(`กรุณายืนยันว่าได้ตกลงกับ ${nickOf(toMember)} แล้ว`);
    setSaving(true);
    try {
      await saveSwap({
        id: initial.id || '',
        from_duty_id: from.duty.id, from_member_id: from.member.id,
        to_duty_id: toDutyId || '', to_member_id: toMember.id,
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
      <form id="swap-form" onSubmit={submit} className="space-y-5 pb-4">
        {!slots.length ? (
          <p className="rounded-2xl bg-white/60 p-4 text-center text-sm text-slate-500">ยังไม่มีเวรที่กำลังจะถึงให้สลับ</p>
        ) : (
          <>
            <div>
              <StepTitle n={1}>เวรของฉัน</StepTitle>
              {from ? (
                <SlotPreview slot={from} tone="from" onChange={() => { setFromKey(''); setToMemberId(''); setToDutyId(null); }} />
              ) : (
                <>
                  {slots.length > 6 && <SearchBox value={slotQuery} onChange={setSlotQuery} placeholder="ค้นหาชื่อของคุณ" />}
                  <div className="mt-2 space-y-1.5">
                    {slotList.map((x) => {
                      const taken = busy.has(x.key);
                      return (
                        <button
                          key={x.key}
                          type="button"
                          disabled={taken}
                          onClick={() => { setFromKey(x.key); setToMemberId(''); setToDutyId(null); }}
                          className="flex w-full items-center gap-2.5 rounded-2xl bg-white/60 p-2 text-left ring-1 ring-inset ring-white/80 transition active:scale-[0.99] disabled:opacity-45"
                        >
                          <Photo member={x.member} width={96} className="h-10 w-10 shrink-0 rounded-full object-[center_20%]" textClass="text-xs" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold leading-tight text-navy-900">{nickOf(x.member)} <span className="font-normal text-slate-500">{firstNameShort(x.member)}</span></span>
                            <span className="block truncate text-[12px] text-slate-500">{formatDate(x.duty.duty_date, 'medium')} · {x.duty.shift_or_role}</span>
                          </span>
                          {taken && <span className="shrink-0 text-[11px] font-semibold text-amber-700">มีคำขอรออยู่</span>}
                        </button>
                      );
                    })}
                    {!slotList.length && <p className="py-3 text-center text-[13px] text-slate-500">ไม่พบเวรที่ตรงกับคำค้น</p>}
                  </div>
                </>
              )}
            </div>

            {from && (
              <div>
                <StepTitle n={2}>สลับกับใคร</StepTitle>
                {toMember ? (
                  <div className="flex items-center gap-2.5 rounded-2xl bg-gold-300/25 p-2">
                    <Photo member={toMember} width={120} className="h-12 w-12 shrink-0 rounded-full object-[center_20%] ring-2 ring-white" textClass="text-sm" />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-navy-900">{nickOf(toMember)} <span className="font-normal text-slate-500">{firstNameShort(toMember)}</span></p>
                    <button type="button" onClick={() => { setToMemberId(''); setToDutyId(null); }} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-navy-700 hover:bg-white/70">เปลี่ยน</button>
                  </div>
                ) : (
                  <>
                    <SearchBox value={personQuery} onChange={setPersonQuery} placeholder="ค้นหาชื่อ ชื่อเล่น หรือลำดับที่" />
                    <p className="mb-2 mt-1.5 px-1 text-[12px] text-slate-500">แตะเลือกได้ทุกคน · ป้าย "มีเวร" = แลกเวรกันได้ · คนที่ไม่มีเวรจะมาเข้าเวรแทน</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {shownPeople.map((m) => (
                        <PersonPick key={m.id} member={m} badge={tradable(m.id).length ? 'มีเวร' : ''} onPick={pickPerson} />
                      ))}
                    </div>
                    {!shownPeople.length && <p className="py-3 text-center text-[13px] text-slate-500">ไม่พบรายชื่อที่ตรงกับคำค้น</p>}
                  </>
                )}
              </div>
            )}

            {from && toMember && (
              <div>
                <StepTitle n={3}>แลกกับ</StepTitle>
                <div className="space-y-1.5">
                  {theirSlots.map((x) => {
                    const taken = busy.has(x.key);
                    const active = toDutyId === x.duty.id;
                    return (
                      <button
                        key={x.key}
                        type="button"
                        disabled={taken}
                        onClick={() => setToDutyId(x.duty.id)}
                        aria-pressed={active}
                        className={cx('flex w-full items-center gap-2.5 rounded-2xl p-3 text-left ring-1 ring-inset transition disabled:opacity-45', active ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white/60 text-navy-900 ring-white/80')}
                      >
                        <ArrowLeftRight className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 text-[14px]">
                          <span className="font-semibold">เวรของ {nickOf(toMember)}</span> · {formatDate(x.duty.duty_date, 'medium')} · {x.duty.shift_or_role}
                        </span>
                        {taken && <span className="shrink-0 text-[11px] font-semibold text-amber-600">มีคำขอรออยู่</span>}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setToDutyId('')}
                    aria-pressed={toDutyId === ''}
                    className={cx('flex w-full items-center gap-2.5 rounded-2xl p-3 text-left ring-1 ring-inset transition', toDutyId === '' ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white/60 text-navy-900 ring-white/80')}
                  >
                    <UserRoundPlus className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 text-[14px]">
                      <span className="font-semibold">ให้ {nickOf(toMember)} มาเข้าเวรแทน</span> · ไม่ต้องแลกคืน
                      {!theirSlots.length && <span className="block text-[12px] opacity-75">{nickOf(toMember)} ยังไม่มีเวรที่จะถึง</span>}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {from && toMember && (
              <>
                <Field label="เหตุผล (ไม่บังคับ)">
                  <TextArea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="เช่น ติดภารกิจราชการ" className="min-h-[72px]" />
                </Field>
                <label className={cx('flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-inset transition', agreed ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-white/60 ring-slate-200')}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
                  <span className="text-[14px] leading-snug text-slate-700">
                    ยืนยันว่าได้ตกลงกับ <strong className="text-navy-900">{nickOf(toMember)}</strong> เรียบร้อยแล้ว
                  </span>
                </label>
              </>
            )}
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
        {date ? (
          <>
            <p className="truncate text-[12px] leading-tight text-slate-500">{formatDate(date, 'medium')}</p>
            <p className="truncate text-[12px] leading-tight text-slate-500">{role}</p>
          </>
        ) : (
          <p className="text-[12px] font-semibold leading-tight text-gold-700">มาเข้าเวรแทน</p>
        )}
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
  const who = `${fromM ? nickOf(fromM) : swap.from_name} ${swap.to_duty_id ? '⇄' : '→'} ${toM ? nickOf(toM) : swap.to_name}${swap.to_duty_id ? '' : ' (มาแทน)'}`;

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
