import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, Field, SuggestInput, TextArea, TextInput } from './ui';
import MemberSuggest from './MemberSuggest';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { formatDate, fullName, guessMembers, nickOf, resolveDuty, thCompare, toISODate } from '../lib/utils';

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort(thCompare);

function FormFooter({ isNew, saving, deleting, onDelete, formId }) {
  return (
    <div className="flex gap-2">
      {!isNew && (
        <Button variant="dangerSoft" icon={Trash2} loading={deleting} disabled={saving} onClick={onDelete} className="shrink-0">
          ลบ
        </Button>
      )}
      <Button type="submit" form={formId} className="flex-1" loading={saving} disabled={deleting}>
        {saving ? 'กำลังบันทึก…' : 'บันทึก'}
      </Button>
    </div>
  );
}

/* ============================== ตารางสอน ============================== */

function ClassFormInner({ initial, onClose }) {
  const { data, saveClass, deleteClass } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    id: '', class_date: toISODate(new Date()), start_time: '09:00', end_time: '12:00', subject: '', speaker: '', location: '', note: '',
    ...(initial || {}),
  }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !form.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const options = useMemo(
    () => ({
      location: uniqueSorted(data.classes.map((c) => c.location)),
      speaker: uniqueSorted(data.classes.map((c) => c.speaker)),
    }),
    [data.classes],
  );

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    if (!form.class_date) return toast.error('กรุณาระบุวันที่เรียน');
    if (!form.subject.trim()) return toast.error('กรุณาระบุหัวข้อวิชา');
    if (form.start_time && form.end_time && form.end_time <= form.start_time) return toast.error('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
    setSaving(true);
    try {
      await saveClass(form);
      toast.success(isNew ? 'เพิ่มตารางสอนเรียบร้อย' : 'บันทึกตารางสอนเรียบร้อย');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
    return undefined;
  }

  async function onDelete() {
    const ok = await ui.confirm({
      title: 'ลบรายการสอนนี้?',
      message: `${form.subject} — ${formatDate(form.class_date)}`,
      confirmText: 'ลบรายการ',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteClass(form.id);
      toast.success('ลบรายการสอนเรียบร้อย');
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
      dismissable={false}
      title={isNew ? 'เพิ่มตารางสอน' : 'แก้ไขตารางสอน'}
      footer={<FormFooter isNew={isNew} saving={saving} deleting={deleting} onDelete={onDelete} formId="class-form" />}
    >
      <form id="class-form" onSubmit={submit} className="space-y-4 pb-5" autoComplete="off">
        <Field label="วันที่" required>
          <TextInput type="date" value={form.class_date} onChange={(e) => set('class_date')(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เวลาเริ่ม">
            <TextInput type="time" value={form.start_time} onChange={(e) => set('start_time')(e.target.value)} />
          </Field>
          <Field label="เวลาสิ้นสุด">
            <TextInput type="time" value={form.end_time} onChange={(e) => set('end_time')(e.target.value)} />
          </Field>
        </div>
        <Field label="หัวข้อวิชา" required>
          <TextInput value={form.subject} onChange={(e) => set('subject')(e.target.value)} placeholder="ชื่อวิชา / กิจกรรม" />
        </Field>
        <Field label="วิทยากร">
          <SuggestInput value={form.speaker} onChange={set('speaker')} options={options.speaker} placeholder="ชื่อวิทยากร" />
        </Field>
        <Field label="ห้องเรียน / สถานที่">
          <SuggestInput value={form.location} onChange={set('location')} options={options.location} placeholder="เช่น ห้องเรียนรวม ชั้น 2" />
        </Field>
        <Field label="หมายเหตุ">
          <TextArea value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="การแต่งกาย เอกสารที่ต้องเตรียม ฯลฯ" />
        </Field>
      </form>
    </Sheet>
  );
}

export function ClassForm({ state, onClose }) {
  if (!state) return null;
  return <ClassFormInner key={state.key} initial={state.item} onClose={onClose} />;
}

/* ============================== ตารางเวร ============================== */

function DutyFormInner({ initial, onClose }) {
  const { data, memberById, saveDuty, deleteDuty } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    id: '', duty_date: toISODate(new Date()), shift_or_role: '', note: '',
    ...(initial || {}),
  }));
  const [picked, setPicked] = useState(() =>
    initial ? resolveDuty(initial, memberById, data.members).members.map((m) => m.id) : [],
  );
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !form.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const roles = useMemo(() => uniqueSorted(data.duty.map((d) => d.shift_or_role)), [data.duty]);
  const pickedMembers = picked.map((id) => memberById.get(id)).filter(Boolean);
  const suggestions = useMemo(
    () => guessMembers(data.members.filter((m) => !picked.includes(m.id)), query, 6),
    [data.members, picked, query],
  );

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    if (!form.duty_date) return toast.error('กรุณาระบุวันที่เข้าเวร');
    if (!form.shift_or_role.trim() && !pickedMembers.length) return toast.error('กรุณาระบุหน้าที่/ชุดเวร หรือเลือกผู้เข้าเวร');
    setSaving(true);
    try {
      await saveDuty({
        id: form.id,
        duty_date: form.duty_date,
        shift_or_role: form.shift_or_role,
        note: form.note,
        member_ids: pickedMembers.map((m) => m.id),
        member_names: pickedMembers.map((m) => fullName(m)).join(', '),
      });
      toast.success(isNew ? 'เพิ่มตารางเวรเรียบร้อย' : 'บันทึกตารางเวรเรียบร้อย');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
    return undefined;
  }

  async function onDelete() {
    const ok = await ui.confirm({
      title: 'ลบรายการเวรนี้?',
      message: `${form.shift_or_role || 'เวร'} — ${formatDate(form.duty_date)}`,
      confirmText: 'ลบรายการ',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteDuty(form.id);
      toast.success('ลบรายการเวรเรียบร้อย');
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
      dismissable={false}
      title={isNew ? 'เพิ่มตารางเวร' : 'แก้ไขตารางเวร'}
      footer={<FormFooter isNew={isNew} saving={saving} deleting={deleting} onDelete={onDelete} formId="duty-form" />}
    >
      <form id="duty-form" onSubmit={submit} className="space-y-4 pb-5" autoComplete="off">
        <Field label="วันที่เข้าเวร" required>
          <TextInput type="date" value={form.duty_date} onChange={(e) => set('duty_date')(e.target.value)} />
        </Field>
        <Field label="หน้าที่ / ชุดเวร">
          <SuggestInput value={form.shift_or_role} onChange={set('shift_or_role')} options={roles} placeholder="เช่น หัวหน้านักศึกษาเวรประจำวัน" />
        </Field>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-slate-600">ผู้เข้าเวร ({pickedMembers.length} คน)</span>
          {pickedMembers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pickedMembers.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-2 rounded-full glass py-1 pl-1 pr-1.5 text-sm font-medium text-navy-900">
                  <Photo member={m} width={96} className="h-7 w-7 rounded-full" textClass="text-xs" />
                  {nickOf(m)}
                  <span className="text-xs font-normal text-slate-500">{m.first_name}</span>
                  <button
                    type="button"
                    aria-label={`นำ ${nickOf(m)} ออก`}
                    onClick={() => setPicked((ids) => ids.filter((id) => id !== m.id))}
                    className="grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-navy-100 hover:text-navy-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อจริงหรือชื่อเล่นเพื่อเพิ่ม"
              className="pl-10"
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (suggestions[0]) {
                    setPicked((ids) => [...ids, suggestions[0].id]);
                    setQuery('');
                  }
                }
              }}
            />
          </div>
          <MemberSuggest
            floating={false}
            className="mt-2"
            items={suggestions}
            onPick={(m) => {
              setPicked((ids) => [...ids, m.id]);
              setQuery('');
            }}
          />
          {query.trim() && suggestions.length === 0 && (
            <p className="mt-2 text-[13px] text-slate-400">ไม่พบชื่อนี้ในทำเนียบรุ่น</p>
          )}
        </div>

        <Field label="หมายเหตุ">
          <TextArea value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="เวลารายงานตัว จุดปฏิบัติ ฯลฯ" />
        </Field>
      </form>
    </Sheet>
  );
}

export function DutyForm({ state, onClose }) {
  if (!state) return null;
  return <DutyFormInner key={state.key} initial={state.item} onClose={onClose} />;
}
