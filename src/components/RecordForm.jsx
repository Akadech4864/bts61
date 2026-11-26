import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, Field, Segmented, Spinner, SuggestInput, TextArea, TextInput } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { thCompare } from '../lib/utils';
import { faceOf, KIND_OPTIONS, RESOURCE_TYPES } from '../lib/course';

const PhotoCropper = lazy(() => import('./PhotoCropper.jsx'));

/**
 * ฟอร์มข้อมูลหลักสูตรสำหรับแอดมิน (ผู้บริหาร / อาจารย์ / งานและเอกสาร)
 * half = ครึ่งความกว้าง | showIf(form) = แสดงเมื่อเงื่อนไขเป็นจริง
 */
const CONFIG = {
  staff: {
    titles: ['เพิ่มผู้บริหาร / เจ้าหน้าที่', 'แก้ไขข้อมูลผู้บริหาร / เจ้าหน้าที่'],
    photo: true,
    blank: { rank: '', first_name: '', last_name: '', nickname: '', role: '', phone: '', sort: '' },
    required: ['first_name', 'กรุณากรอกชื่อ'],
    fields: [
      { key: 'rank', label: 'ยศ / คำนำหน้า', placeholder: 'เช่น พ.ต.อ.' },
      { key: 'first_name', label: 'ชื่อ', required: true, half: true },
      { key: 'last_name', label: 'นามสกุล', half: true },
      { key: 'nickname', label: 'ชื่อเล่น', half: true },
      { key: 'sort', label: 'ลำดับการแสดง', half: true, numeric: true, placeholder: 'เช่น 1' },
      { key: 'role', label: 'ตำแหน่ง / หน้าที่ในหลักสูตร', textarea: true, placeholder: 'เช่น ผู้อำนวยการหลักสูตร' },
      { key: 'phone', label: 'เบอร์โทรศัพท์', type: 'tel', placeholder: '08x-xxx-xxxx' },
    ],
  },
  instructors: {
    titles: ['เพิ่มอาจารย์', 'แก้ไขข้อมูลอาจารย์'],
    photo: true,
    blank: { name: '', position: '', kind: 'p', group_no: '', sort: '', expertise: '', education: '', subjects: '', links: '', phone: '' },
    required: ['name', 'กรุณากรอกชื่ออาจารย์'],
    fields: [
      { key: 'name', label: 'ยศ ชื่อ-สกุล', required: true, placeholder: 'เช่น พ.ต.อ.ดร.สมชาย ใจดี' },
      { key: 'position', label: 'ตำแหน่ง / สังกัด', placeholder: 'เช่น อาจารย์ (สบ 5) กอจ.บช.ศ.' },
      { key: 'kind', label: 'ประเภท', options: KIND_OPTIONS },
      { key: 'group_no', label: 'อาจารย์ประจำกลุ่มที่', half: true, numeric: true, placeholder: 'ว่าง = ไม่มี', hint: 'วิชาเอกสารศึกษา' },
      { key: 'sort', label: 'ลำดับการแสดง', half: true, numeric: true },
      { key: 'expertise', label: 'หัวข้อ / ความเชี่ยวชาญ', textarea: true },
      { key: 'education', label: 'วุฒิการศึกษา' },
      {
        key: 'subjects', label: 'วิชาที่สอนในหลักสูตร', textarea: true, rows: 5,
        placeholder: '5 วิชาเอกสารศึกษา | อาจารย์ประจำ', hint: 'บรรทัดละ 1 วิชา — ชื่อวิชา | บทบาท',
      },
      { key: 'links', label: 'ไฟล์ประวัติ / ลิงก์', textarea: true, placeholder: 'ไฟล์ประวัติส่วนบุคคล | https://…', hint: 'บรรทัดละ 1 รายการ — ชื่อ | ลิงก์' },
      { key: 'phone', label: 'เบอร์โทรศัพท์', type: 'tel' },
    ],
  },
  resources: {
    titles: ['เพิ่มงาน / เอกสาร', 'แก้ไขงาน / เอกสาร'],
    photo: false,
    blank: { subject: '', type: 'link', title: '', url: '', due_date: '', due_time: '', detail: '', sort: '' },
    required: ['title', 'กรุณากรอกหัวข้อ'],
    fields: [
      { key: 'subject', label: 'วิชา / หมวด', suggest: true, placeholder: 'เช่น วิชาเอกสารศึกษา' },
      { key: 'type', label: 'ประเภท', options: RESOURCE_TYPES },
      { key: 'title', label: 'หัวข้อ', required: true },
      { key: 'due_date', label: 'กำหนดส่ง', type: 'date', half: true, showIf: (f) => f.type === 'task' },
      { key: 'due_time', label: 'เวลา (ถ้ามี)', type: 'time', half: true, showIf: (f) => f.type === 'task' },
      { key: 'url', label: 'ลิงก์ (ถ้ามี)', type: 'url', placeholder: 'https://…', showIf: (f) => f.type !== 'info' },
      { key: 'detail', label: 'รายละเอียด', textarea: true, rows: 5, hint: 'ขึ้นบรรทัดใหม่ได้ · "หัวข้อ: รายละเอียด" จะแสดงหัวข้อเป็นตัวหนา' },
      { key: 'sort', label: 'ลำดับการแสดง', numeric: true },
    ],
  },
};

function RecordFormInner({ collection, initial, onClose }) {
  const cfg = CONFIG[collection];
  const { data, saveRecord, deleteRecord } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ id: '', ...cfg.blank, ...(initial || {}) }));
  const [photo, setPhoto] = useState(null); // { blob, url } รูปใหม่ที่ครอปแล้ว
  const [removePhoto, setRemovePhoto] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const isNew = !form.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const subjectOptions = useMemo(
    () => [...new Set((data.resources || []).map((r) => r.subject).filter(Boolean))].sort(thCompare),
    [data.resources],
  );

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    setCropSrc(url);
  }

  function onCropped(blob) {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    setPhoto({ blob, url });
    setRemovePhoto(false);
    setCropSrc(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    if (!String(form[cfg.required[0]] || '').trim()) {
      toast.error(cfg.required[1]);
      return;
    }
    setSaving(true);
    try {
      const item = { id: form.id };
      cfg.fields.forEach((f) => {
        item[f.key] = typeof form[f.key] === 'string' ? form[f.key].trim() : form[f.key];
      });
      await saveRecord(collection, item, { photoBlob: photo && photo.blob, removePhoto });
      toast.success(isNew ? 'เพิ่มข้อมูลเรียบร้อย' : 'บันทึกข้อมูลเรียบร้อย');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  async function onDelete() {
    const label = form.title || form.name || [form.rank, form.first_name, form.last_name].filter(Boolean).join(' ');
    const ok = await ui.confirm({ title: 'ลบรายการนี้?', message: label, confirmText: 'ลบรายการ', danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteRecord(collection, form.id);
      toast.success('ลบรายการเรียบร้อย');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  const previewUrl = photo ? photo.url : removePhoto ? '' : form.photo_url;
  const pickClass =
    'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl glass px-3 text-sm font-semibold text-navy-800 transition hover:bg-white/80 active:scale-[0.98]';
  const visible = cfg.fields.filter((f) => !f.showIf || f.showIf(form));

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        dismissable={false}
        title={cfg.titles[isNew ? 0 : 1]}
        footer={
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="dangerSoft" icon={Trash2} loading={deleting} disabled={saving} onClick={onDelete} className="shrink-0">
                ลบ
              </Button>
            )}
            <Button type="submit" form="record-form" className="flex-1" loading={saving} disabled={deleting}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
          </div>
        }
      >
        <form id="record-form" onSubmit={submit} className="space-y-4 pb-5" autoComplete="off">
          {cfg.photo && (
            <div className="flex gap-4">
              <Photo
                member={faceOf({ ...form, photo_url: previewUrl })}
                width={400}
                eager
                className="aspect-[3/4] w-28 shrink-0 rounded-3xl shadow-[0_10px_24px_-12px_rgb(11_28_54/0.5)] ring-2 ring-white"
                textClass="text-4xl"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                <p className="text-[13px] font-medium text-slate-600">รูปถ่าย</p>
                <label className={pickClass}>
                  <Camera className="h-[18px] w-[18px]" /> ถ่ายรูป
                  <input type="file" accept="image/*" capture="user" className="sr-only" onChange={onFile} />
                </label>
                <label className={pickClass}>
                  <ImagePlus className="h-[18px] w-[18px]" /> เลือกรูปจากเครื่อง
                  <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
                </label>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setRemovePhoto(!!form.photo_url);
                    }}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg px-1 py-1 text-[13px] font-medium text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ลบรูป
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {visible.map((f) => (f.options ? (
              // ตัวเลือกแบบปุ่ม: ไม่ห่อด้วย <label> เพื่อไม่ให้แตะที่ชื่อช่องแล้วเลือกปุ่มแรกโดยไม่ตั้งใจ
              <div key={f.key} className="col-span-2">
                <span className="mb-1.5 block text-[13px] font-medium text-slate-600">{f.label}</span>
                <Segmented value={form[f.key]} onChange={set(f.key)} options={f.options} className="w-full [&>button]:flex-1" />
              </div>
            ) : (
              <Field key={f.key} label={f.label} required={f.required} hint={f.hint} className={f.half ? '' : 'col-span-2'}>
                {f.textarea ? (
                  <TextArea rows={f.rows || 3} value={form[f.key] || ''} onChange={(e) => set(f.key)(e.target.value)} placeholder={f.placeholder} />
                ) : f.suggest ? (
                  <SuggestInput value={form[f.key] || ''} onChange={set(f.key)} options={subjectOptions} placeholder={f.placeholder} />
                ) : (
                  <TextInput
                    type={f.type || 'text'}
                    inputMode={f.numeric ? 'numeric' : f.type === 'tel' ? 'tel' : undefined}
                    value={form[f.key] || ''}
                    onChange={(e) => set(f.key)(f.numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
                    placeholder={f.placeholder}
                    autoCapitalize={f.type === 'url' ? 'none' : undefined}
                  />
                )}
              </Field>
            )))}
          </div>
        </form>
      </Sheet>

      {cropSrc && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] grid place-items-center bg-navy-950/90 text-white">
              <Spinner className="h-8 w-8" />
            </div>
          }
        >
          <PhotoCropper src={cropSrc} onCancel={() => setCropSrc(null)} onDone={onCropped} />
        </Suspense>
      )}
    </>
  );
}

/** state: null | { key, collection, item? } */
export default function RecordForm({ state, onClose }) {
  if (!state) return null;
  return <RecordFormInner key={state.key} collection={state.collection} initial={state.item} onClose={onClose} />;
}
