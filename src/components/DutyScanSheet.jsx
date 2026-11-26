import { useMemo, useRef, useState } from 'react';
import { Camera, CircleAlert, ImagePlus, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, TextInput, inputClass } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { cx, formatDate, guessMembers, nickOf, normalize } from '../lib/utils';
import { firstNameShort } from './DutySwap';

/** ย่อรูปให้ด้านยาวไม่เกิน 2000px แล้วแปลงเป็น JPEG base64 (ส่งเร็วขึ้น และไม่เกินขนาดที่ระบบรับ) */
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('เปิดไฟล์รูปไม่ได้ กรุณาเลือกรูปใหม่'));
      el.src = url;
    });
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** ชื่อในรูปน่าจะเป็นคนนี้หรือไม่ (ชื่อจริงหรือชื่อเล่นปรากฏในข้อความ) */
function nameFits(m, raw) {
  const t = normalize(raw).replace(/\s+/g, '');
  if (!t) return true;
  const first = normalize(m.first_name).replace(/\s+/g, '');
  const nick = normalize(m.nickname).replace(/\s+/g, '');
  return (first && t.includes(first)) || (nick && t.includes(nick));
}

/** จับคู่ชื่อที่ AI อ่านได้กับรายชื่อในทำเนียบ: ลำดับที่ + ชื่อตรงกัน = แน่ใจ, อย่างใดอย่างหนึ่ง = ให้ตรวจ */
function matchPerson(p, members, bySeq) {
  const viaSeq = p.seq ? bySeq.get(String(p.seq)) : null;
  if (viaSeq && nameFits(viaSeq, p.name)) return { memberId: viaSeq.id, sure: true };
  const guess = p.name ? guessMembers(members, p.name, 1)[0] : null;
  if (guess && viaSeq && guess.id === viaSeq.id) return { memberId: guess.id, sure: true };
  if (guess && nameFits(guess, p.name)) return { memberId: guess.id, sure: !viaSeq };
  if (viaSeq) return { memberId: viaSeq.id, sure: false };
  return { memberId: null, sure: false };
}

let rowSeq = 0;

function PersonChip({ person, member, onRemove, onPick }) {
  if (member) {
    return (
      <span className={cx('inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-1.5 ring-1 ring-inset', person.sure ? 'bg-white/80 ring-slate-200' : 'bg-amber-300/30 ring-amber-400')}>
        <Photo member={member} width={64} className="h-7 w-7 shrink-0 rounded-full object-[center_20%]" textClass="text-[10px]" />
        <button type="button" onClick={onPick} className="min-w-0 truncate text-left text-[13px] font-semibold text-navy-900">
          {nickOf(member)} <span className="font-normal text-slate-500">{firstNameShort(member)}</span>
        </button>
        <button type="button" onClick={onRemove} aria-label="เอาออก" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-200"><X className="h-3.5 w-3.5" /></button>
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-300/40 py-1 pl-2.5 pr-1.5 ring-1 ring-inset ring-amber-500">
      <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-700" />
      <button type="button" onClick={onPick} className="min-w-0 truncate text-left text-[13px] font-semibold text-amber-900">{person.name || '?'} · เลือกคน</button>
      <button type="button" onClick={onRemove} aria-label="เอาออก" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-amber-700 hover:bg-amber-300/60"><X className="h-3.5 w-3.5" /></button>
    </span>
  );
}

function PersonPicker({ initial, members, onPick, onClose }) {
  const [q, setQ] = useState(initial || '');
  const hits = useMemo(() => (q.trim() ? guessMembers(members, q, 6) : []), [members, q]);
  return (
    <div className="mt-2 rounded-2xl bg-white/90 p-2 ring-1 ring-inset ring-slate-200">
      <div className="flex gap-1.5">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่อ ชื่อเล่น หรือลำดับที่" autoFocus className="h-10" />
        <button type="button" onClick={onClose} className="h-10 shrink-0 rounded-xl px-3 text-[13px] font-semibold text-slate-500">ปิด</button>
      </div>
      <div className="mt-1.5 space-y-1">
        {hits.map((m) => (
          <button key={m.id} type="button" onClick={() => onPick(m.id)} className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left hover:bg-navy-500/5">
            <Photo member={m} width={64} className="h-8 w-8 shrink-0 rounded-full object-[center_20%]" textClass="text-[10px]" />
            <span className="min-w-0 truncate text-[13.5px]"><strong className="text-navy-900">{nickOf(m)}</strong> <span className="text-slate-500">{m.rank} {m.first_name} {m.last_name}</span></span>
            {m.seq && <span className="ml-auto shrink-0 text-[11px] text-slate-400">#{m.seq}</span>}
          </button>
        ))}
        {q.trim() && !hits.length && <p className="p-2 text-center text-[12.5px] text-slate-500">ไม่พบรายชื่อ</p>}
      </div>
    </div>
  );
}

/** แอดมิน: ถ่าย/เลือกรูปตารางเวร -> AI อ่าน -> ตรวจ/แก้ -> บันทึกทั้งหมด */
function ScanInner({ onClose }) {
  const { data, memberById, scanDuty, saveDuty } = useStore();
  const toast = useToast();
  const [image, setImage] = useState(null);
  const [reading, setReading] = useState(false);
  const [rows, setRows] = useState(null);
  const [picking, setPicking] = useState(null); // `${rowKey}:${personIndex}` | `${rowKey}:new`
  const [saving, setSaving] = useState(null); // { done, total }
  const fileRef = useRef(null);
  const camRef = useRef(null);

  const bySeq = useMemo(() => new Map(data.members.filter((m) => m.seq).map((m) => [String(m.seq), m])), [data.members]);
  const roles = useMemo(() => [...new Set(data.duty.map((d) => d.shift_or_role).filter(Boolean))], [data.duty]);
  const existingOf = (date, role) => data.duty.find((d) => d.duty_date === date && (d.shift_or_role || '') === (role || ''));

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImage(await prepareImage(file));
      setRows(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function read() {
    if (!image || reading) return;
    setReading(true);
    try {
      const res = await scanDuty({ base64: image.base64, mimeType: image.mimeType });
      const next = (res.rows || []).map((r) => ({
        key: ++rowSeq,
        date: r.date,
        role: r.role,
        note: r.note || '',
        people: (r.people || []).map((p) => ({ name: p.name, seq: p.seq, ...matchPerson(p, data.members, bySeq) })),
      }));
      setRows(next);
      if (!next.length) toast.info('ไม่พบรายการเวรในรูป ลองรูปที่ชัดขึ้น');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReading(false);
    }
  }

  const update = (key, patch) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)));
  const unresolved = (rows || []).reduce((n, r) => n + r.people.filter((p) => !p.memberId).length, 0);
  const toCheck = (rows || []).reduce((n, r) => n + r.people.filter((p) => p.memberId && !p.sure).length, 0);

  async function saveAll() {
    if (!rows || !rows.length || saving) return;
    if (unresolved) {
      toast.error(`ยังมีชื่อที่ต้องเลือกคน ${unresolved} รายการ`);
      return;
    }
    const bad = rows.find((r) => !r.date || !r.role.trim());
    if (bad) {
      toast.error('ทุกรายการต้องมีวันที่และหน้าที่');
      return;
    }
    setSaving({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i];
        const ids = [...new Set(r.people.map((p) => p.memberId).filter(Boolean))];
        const names = ids.map((id) => memberById.get(id)).filter(Boolean)
          .map((m) => `${m.rank}${/[.]$|หญิง$/.test(m.rank || '') ? ' ' : ''}${m.first_name} ${m.last_name}`.trim());
        const existing = existingOf(r.date, r.role.trim());
        await saveDuty({ id: existing ? existing.id : '', duty_date: r.date, shift_or_role: r.role.trim(), member_ids: ids, member_names: names.join(', '), note: r.note.trim() });
        setSaving({ done: i + 1, total: rows.length });
      }
      toast.success(`บันทึกเวร ${rows.length} รายการแล้ว`);
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(null);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      dismissable={false}
      title="เพิ่มเวรจากรูป"
      subtitle="AI อ่านตาราง แล้วให้ตรวจก่อนบันทึก"
      footer={rows && rows.length ? (
        <Button icon={Save} className="w-full" loading={!!saving} onClick={saveAll} disabled={!!unresolved}>
          {saving ? `กำลังบันทึก ${saving.done}/${saving.total}…` : unresolved ? `ต้องเลือกคนอีก ${unresolved} ชื่อ` : `บันทึกทั้งหมด ${rows.length} รายการ`}
        </Button>
      ) : image ? (
        <Button icon={Sparkles} className="w-full" loading={reading} onClick={read}>
          {reading ? 'AI กำลังอ่านตาราง… (ประมาณ 20–60 วินาที)' : 'ให้ AI อ่านตาราง'}
        </Button>
      ) : null}
    >
      <div className="space-y-3 pb-4">
        {!rows && (
          <>
            {image ? (
              <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <img src={image.preview} alt="รูปตารางเวรที่เลือก" className="max-h-[50vh] w-full bg-white object-contain" />
              </div>
            ) : (
              <p className="rounded-2xl bg-white/60 p-4 text-[13.5px] leading-relaxed text-slate-600">
                ถ่ายรูปหรือเลือกรูปตารางเวร (ภาพถ่าย, ภาพหน้าจอ LINE หรือหน้า PDF ที่แคปไว้) ให้เห็นวันที่ หัวตาราง และชื่อชัดเจน
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => camRef.current && camRef.current.click()} className="glass inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-navy-800">
                <Camera className="h-[18px] w-[18px]" /> ถ่ายรูป
              </button>
              <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="glass inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-navy-800">
                <ImagePlus className="h-[18px] w-[18px]" /> {image ? 'เปลี่ยนรูป' : 'เลือกรูป'}
              </button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} />
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
          </>
        )}

        {rows && (
          <>
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[13px] text-slate-600">
                อ่านได้ {rows.length} รายการ
                {toCheck > 0 && <span className="ml-1 font-semibold text-amber-700">· ตรวจชื่อสีเหลือง {toCheck}</span>}
              </p>
              <button type="button" onClick={() => setRows(null)} className="shrink-0 text-[13px] font-semibold text-navy-700">อ่านรูปใหม่</button>
            </div>
            {rows.map((r) => {
              const existing = existingOf(r.date, r.role.trim());
              return (
                <div key={r.key} className="rounded-2xl bg-white/70 p-3 ring-1 ring-inset ring-slate-200">
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <input type="date" value={r.date} onChange={(e) => update(r.key, { date: e.target.value })} aria-label="วันที่" className={cx(inputClass, 'h-10 text-[14px]')} />
                    </div>
                    <button type="button" onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))} aria-label="ลบรายการนี้" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-rose-600 hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <TextInput value={r.role} onChange={(e) => update(r.key, { role: e.target.value })} list="scan-roles" placeholder="หน้าที่ เช่น เวรทั่วไป" aria-label="หน้าที่" className="mt-2 h-10 text-[14px]" />
                  <p className="mt-1 px-1 text-[11.5px] text-slate-500">
                    {r.date ? formatDate(r.date, 'long') : 'ยังไม่มีวันที่'}
                    {existing && <span className="ml-1 font-semibold text-amber-700">· มีอยู่แล้ว จะแทนที่ของเดิม</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.people.map((p, i) => (
                      <PersonChip
                        key={`${p.name}-${i}`}
                        person={p}
                        member={p.memberId ? memberById.get(p.memberId) : null}
                        onRemove={() => update(r.key, (row) => ({ people: row.people.filter((_, k) => k !== i) }))}
                        onPick={() => setPicking(`${r.key}:${i}`)}
                      />
                    ))}
                    <button type="button" onClick={() => setPicking(`${r.key}:new`)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-200">
                      <Plus className="h-3.5 w-3.5" /> เพิ่มคน
                    </button>
                  </div>
                  {picking && picking.startsWith(`${r.key}:`) && (
                    <PersonPicker
                      initial={picking.endsWith(':new') ? '' : (r.people[Number(picking.split(':')[1])] || {}).name}
                      members={data.members}
                      onClose={() => setPicking(null)}
                      onPick={(id) => {
                        const idx = picking.split(':')[1];
                        update(r.key, (row) => ({
                          people: idx === 'new'
                            ? [...row.people, { name: '', seq: '', memberId: id, sure: true }]
                            : row.people.map((p, k) => (k === Number(idx) ? { ...p, memberId: id, sure: true } : p)),
                        }));
                        setPicking(null);
                      }}
                    />
                  )}
                  <TextInput value={r.note} onChange={(e) => update(r.key, { note: e.target.value })} placeholder="หมายเหตุ (ถ้ามี)" className="mt-2 h-10 text-[13.5px]" />
                </div>
              );
            })}
            <datalist id="scan-roles">{roles.map((x) => <option key={x} value={x} />)}</datalist>
            <p className="px-1 text-[12px] leading-snug text-slate-500">
              สีเหลือง = AI ไม่แน่ใจหรือหาไม่พบ แตะที่ชื่อเพื่อเลือกคนที่ถูกต้อง · ตรวจวันที่และหน้าที่ก่อนกดบันทึก
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

export default function DutyScanSheet({ open, onClose }) {
  if (!open) return null;
  return <ScanInner onClose={onClose} />;
}

