import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, FileText, ImagePlus, Paperclip, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, Field, Segmented, Spinner, SuggestInput, TextArea, TextInput, inputClass } from './ui';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { cx, formatDate, fullName, readStored, thCompare, writeStored } from '../lib/utils';
import { buildSubjects, DOC_ACCEPT, DOC_CATEGORIES, fileSizeLabel, subjectKey } from '../lib/docs';
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
    blank: { name: '', position: '', kind: 'p', group_no: '', sort: '', expertise: '', education: '', subjects: '', profile: '', links: '', phone: '' },
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
      {
        key: 'profile', label: 'ประวัติวิทยากร (โดยละเอียด)', textarea: true, rows: 10,
        placeholder: '# ประวัติการศึกษา\nปริญญาโท: นิติศาสตรมหาบัณฑิต …\n# ประวัติการทำงาน\nพนักงานสอบสวน …',
        hint: 'บรรทัดที่ขึ้นต้นด้วย # คือหัวข้อ · บรรทัดอื่นคือรายการในหัวข้อนั้น · "หัวข้อย่อย: รายละเอียด" จะแสดงหัวข้อย่อยเป็นตัวหนา',
      },
      { key: 'links', label: 'ไฟล์ต้นฉบับ / ลิงก์', textarea: true, placeholder: 'ไฟล์ประวัติส่วนบุคคล | https://…', hint: 'บรรทัดละ 1 รายการ — ชื่อ | ลิงก์' },
      { key: 'phone', label: 'เบอร์โทรศัพท์', type: 'tel' },
    ],
  },
  resources: {
    titles: ['แนบเอกสาร / เพิ่มงาน', 'แก้ไขเอกสาร / งาน'],
    photo: false,
    blank: { subject: '', type: 'link', category: '', title: '', url: '', class_date: '', topic: '', due_date: '', due_time: '', detail: '', sort: '' },
    required: ['title', 'กรุณากรอกชื่อเอกสาร / หัวข้อ'],
    fields: [
      { key: 'subject', label: 'วิชา', suggest: true, placeholder: 'เลือกหรือพิมพ์ชื่อวิชา' },
      { key: 'type', label: 'ประเภท', options: RESOURCE_TYPES },
      { key: 'title', label: 'ชื่อเอกสาร / หัวข้อ', required: true, placeholder: 'เช่น สไลด์ประกอบการบรรยาย ครั้งที่ 1' },
      { key: 'category', label: 'หมวด', chips: DOC_CATEGORIES, showIf: (f) => f.type === 'link' },
      { key: 'file', label: 'ไฟล์ หรือ ลิงก์', custom: 'file', showIf: (f) => f.type === 'link' },
      { key: 'url', label: 'ลิงก์ (ถ้ามี)', type: 'url', placeholder: 'https://…', showIf: (f) => f.type !== 'link' },
      { key: 'session', label: 'คาบเรียนในตารางสอน (ถ้ามี)', custom: 'session', showIf: (f) => f.type !== 'info' },
      { key: 'due_date', label: 'กำหนดส่ง', type: 'date', half: true, showIf: (f) => f.type === 'task' },
      { key: 'due_time', label: 'เวลา (ถ้ามี)', type: 'time', half: true, showIf: (f) => f.type === 'task' },
      { key: 'detail', label: 'รายละเอียด', textarea: true, rows: 4, hint: 'ขึ้นบรรทัดใหม่ได้ · "หัวข้อ: รายละเอียด" จะแสดงหัวข้อเป็นตัวหนา' },
      { key: 'sort', label: 'ลำดับการแสดง', numeric: true },
    ],
  },
};

// ชื่อผู้แนบ: ใช้คนเดียวกับ "เวรของฉัน" ในหน้าตารางเวร (เลือกครั้งเดียว จำไว้ในเครื่อง)
const ME_KEY = 'bts61:duty-me';
const uploaderLabel = (m) => `${fullName(m)}${m.nickname ? ` (${m.nickname})` : ''}`;

/** publicMode = ผู้เข้าอบรมแนบเอกสารเอง (ไม่มีช่องสำหรับแอดมิน เช่น ประเภท/ลำดับ) */
function RecordFormInner({ collection, initial, onClose, publicMode = false }) {
  const cfg = CONFIG[collection];
  const fields = publicMode ? cfg.fields.filter((f) => f.key !== 'type' && f.key !== 'sort') : cfg.fields;
  const { data, saveRecord, deleteRecord } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ id: '', ...cfg.blank, ...(initial || {}) }));
  const [photo, setPhoto] = useState(null); // { blob, url } รูปใหม่ที่ครอปแล้ว
  const [removePhoto, setRemovePhoto] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [docFiles, setDocFiles] = useState([]); // ไฟล์เอกสารใหม่ที่จะอัปโหลด (เพิ่มใหม่เลือกได้หลายไฟล์ แต่ละไฟล์เป็น 1 รายการ)
  const [removeFile, setRemoveFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploaderId, setUploaderId] = useState(() => {
    const v = readStored(ME_KEY, '');
    return typeof v === 'string' ? v : '';
  });
  const people = useMemo(
    () => (publicMode ? [...data.members].sort((a, b) => (Number(a.seq) || 9999) - (Number(b.seq) || 9999) || thCompare(a.first_name || '', b.first_name || '')) : []),
    [publicMode, data.members],
  );
  const uploader = people.find((m) => m.id === uploaderId) || null;
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const isNew = !form.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const subjectOptions = useMemo(
    () => (collection === 'resources'
      ? buildSubjects(data.classes, data.resources || []).map((x) => x.name)
      : [...new Set((data.resources || []).map((r) => r.subject).filter(Boolean))].sort(thCompare)),
    [collection, data.classes, data.resources],
  );
  // คาบเรียนของวิชาที่เลือก (ใช้ผูกเอกสารกับวันที่เรียน)
  const sessionOptions = useMemo(
    () => (collection === 'resources' && form.subject
      ? data.classes.filter((c) => subjectKey(c.subject) === subjectKey(form.subject)).sort((a, b) => a.class_date.localeCompare(b.class_date) || String(a.start_time).localeCompare(String(b.start_time)))
      : []),
    [collection, data.classes, form.subject],
  );
  const hasFile = docFiles.length > 0 || (!!form.file_id && !removeFile);

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
    const many = form.type === 'link' && docFiles.length > 1;
    if (!many && !String(form[cfg.required[0]] || '').trim()) {
      toast.error(cfg.required[1]);
      return;
    }
    if (publicMode && isNew && !uploader) {
      toast.error('กรุณาเลือกชื่อของคุณ (ผู้แนบ)');
      return;
    }
    if (publicMode && !String(form.subject || '').trim()) {
      toast.error('กรุณาเลือกวิชา');
      return;
    }
    setSaving(true);
    try {
      const item = { id: form.id };
      if (publicMode) {
        item.uploaded_by = isNew ? uploaderLabel(uploader) : form.uploaded_by || '';
        if (isNew) writeStored(ME_KEY, uploader.id);
      }
      fields.forEach((f) => {
        if (f.custom === 'file') return;
        if (f.custom === 'session') {
          item.class_date = form.class_date || '';
          item.topic = form.topic || '';
          return;
        }
        item[f.key] = typeof form[f.key] === 'string' ? form[f.key].trim() : form[f.key];
      });
      if (fields.some((f) => f.custom === 'file')) {
        // มีไฟล์แนบอยู่แล้ว ลิงก์คือที่อยู่ของไฟล์นั้น ไม่ต้องส่งซ้ำ
        if (form.type === 'link' && hasFile) delete item.url;
        else item.url = String(form.url || '').trim();
        if (form.type === 'link' && !hasFile && !item.url) {
          toast.error('กรุณาแนบไฟล์ หรือใส่ลิงก์ของเอกสาร');
          setSaving(false);
          return;
        }
      }
      if (many) {
        // หลายไฟล์: บันทึกทีละไฟล์ ชื่อเอกสาร = ชื่อที่กรอก (ลำดับ) หรือชื่อไฟล์
        const base = String(form.title || '').trim();
        for (let i = 0; i < docFiles.length; i += 1) {
          const f = docFiles[i];
          const title = base ? `${base} (${i + 1})` : f.name.replace(/\.[^.]+$/, '');
          await saveRecord(collection, { ...item, id: '', title }, { file: f });
        }
        toast.success(`แนบเอกสาร ${docFiles.length} ไฟล์เรียบร้อย`);
        onClose();
        return;
      }
      await saveRecord(collection, item, { photoBlob: photo && photo.blob, removePhoto, file: form.type === 'link' ? docFiles[0] || null : null, removeFile });
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
  const visible = fields.filter((f) => !f.showIf || f.showIf(form));
  const titles = publicMode ? ['แนบเอกสาร', 'แก้ไขเอกสารที่แนบ'] : cfg.titles;

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        dismissable={false}
        title={titles[isNew ? 0 : 1]}
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

          {publicMode && (
            <div className="space-y-2">
              <p className="rounded-2xl bg-navy-500/[0.07] px-3.5 py-2.5 text-[12.5px] leading-snug text-navy-800">
                เอกสารจะแสดงให้ทุกคนเห็นทันที · แก้ไขหรือลบได้จากเครื่องนี้ (แอดมินลบได้ทุกรายการ)
              </p>
              {isNew ? (
                <Field label="แนบโดย (ชื่อของคุณ)" required>
                  <select value={uploaderId} onChange={(e) => setUploaderId(e.target.value)} className={cx(inputClass, 'pr-8')}>
                    <option value="">— เลือกชื่อของคุณ —</option>
                    {people.map((m) => (
                      <option key={m.id} value={m.id}>{m.seq ? `${m.seq}. ` : ''}{uploaderLabel(m)}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                form.uploaded_by && <p className="px-1 text-[13px] text-slate-500">แนบโดย {form.uploaded_by}</p>
              )}
            </div>
          )}
          {!publicMode && form.uploaded_by && <p className="px-1 text-[13px] text-slate-500">แนบโดย {form.uploaded_by} (ผู้เข้าอบรม)</p>}

          <div className="grid grid-cols-2 gap-3">
            {visible.map((f) => (f.custom === 'file' ? (
              <div key={f.key} className="col-span-2">
                <span className="mb-1.5 block text-[13px] font-medium text-slate-600">{f.label}</span>
                <div className="space-y-2">
                  {(docFiles.length ? docFiles.map((file, idx) => ({ key: `${file.name}-${idx}`, name: file.name, size: file.size, idx })) : form.file_id && !removeFile ? [{ key: 'current', name: form.file_name, size: form.file_size, idx: -1 }] : []).map((row) => (
                    <div key={row.key} className="flex items-center gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-slate-200">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-500/10 text-navy-700"><FileText className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-navy-900">{row.name}</span>
                        <span className="block text-[12px] text-slate-500">{fileSizeLabel(row.size)}{row.idx >= 0 ? ' · จะอัปโหลดเมื่อกดบันทึก' : ' · เก็บใน Google Drive'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (row.idx >= 0) setDocFiles((list) => list.filter((_, k) => k !== row.idx));
                          else setRemoveFile(true);
                        }}
                        className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-rose-600"
                      >
                        เอาออก
                      </button>
                    </div>
                  ))}
                  {(isNew || !hasFile) && (
                    <label className={pickClass + ' w-full'}>
                      <Paperclip className="h-[18px] w-[18px]" />
                      {hasFile ? 'แนบไฟล์เพิ่ม' : isNew ? 'แนบไฟล์ (เลือกได้หลายไฟล์ ไฟล์ละไม่เกิน 15 MB)' : 'แนบไฟล์ (ไม่เกิน 15 MB)'}
                      <input
                        type="file"
                        accept={DOC_ACCEPT}
                        multiple={isNew}
                        className="sr-only"
                        onChange={(e) => {
                          const picked = Array.from(e.target.files || []);
                          e.target.value = '';
                          if (!picked.length) return;
                          const tooBig = picked.filter((file) => file.size > 15 * 1024 * 1024);
                          if (tooBig.length) toast.error(`${tooBig.map((file) => file.name).join(', ')} ใหญ่เกิน 15 MB — ให้แชร์จาก Drive/YouTube แล้ววางลิงก์แทน`);
                          const ok = picked.filter((file) => file.size <= 15 * 1024 * 1024);
                          if (!ok.length) return;
                          setRemoveFile(false);
                          setDocFiles((list) => (isNew ? [...list, ...ok] : ok.slice(0, 1)));
                          if (!String(form.title || '').trim() && ok.length === 1 && !docFiles.length) set('title')(ok[0].name.replace(/\.[^.]+$/, ''));
                        }}
                      />
                    </label>
                  )}
                  {!hasFile && (
                    <TextInput
                      type="url"
                      value={form.url && !String(form.url).startsWith('data:') ? form.url : ''}
                      onChange={(e) => set('url')(e.target.value)}
                      placeholder="หรือวางลิงก์ (Google Drive, Canva, YouTube …)"
                      autoCapitalize="none"
                    />
                  )}
                  {docFiles.length > 1 && (
                    <p className="px-1 text-[12px] text-slate-500">จะบันทึกเป็น {docFiles.length} รายการ — ชื่อเอกสารใช้ชื่อไฟล์ หรือชื่อที่กรอกตามด้วยลำดับ</p>
                  )}
                </div>
              </div>
            ) : f.custom === 'session' ? (
              <Field key={f.key} label={f.label} className="col-span-2" hint={form.subject ? undefined : 'เลือกวิชาก่อน'}>
                <select
                  value={(sessionOptions.find((c) => c.class_date === form.class_date && (c.topic || '') === (form.topic || '')) || sessionOptions.find((c) => c.class_date === form.class_date) || {}).id || ''}
                  onChange={(e) => {
                    const c = sessionOptions.find((x) => x.id === e.target.value);
                    setForm((prev) => ({ ...prev, class_date: c ? c.class_date : '', topic: c ? c.topic || '' : '' }));
                  }}
                  disabled={!sessionOptions.length}
                  className={cx(inputClass, 'pr-8 disabled:opacity-50')}
                >
                  <option value="">— ไม่ผูกกับคาบเรียน —</option>
                  {sessionOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatDate(c.class_date, 'medium')}{c.start_time ? ` ${c.start_time}` : ''}{c.session ? ` · ครั้งที่ ${c.session}` : ''}{c.topic ? ` · ${c.topic}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            ) : f.chips ? (
              <div key={f.key} className="col-span-2">
                <span className="mb-1.5 block text-[13px] font-medium text-slate-600">{f.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {f.chips.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => set(f.key)(form[f.key] === c.value ? '' : c.value)}
                      aria-pressed={form[f.key] === c.value}
                      className={cx('h-9 rounded-full px-3.5 text-[13px] font-semibold transition', form[f.key] === c.value ? 'btn-navy text-white' : 'glass text-slate-600')}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : f.options ? (
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

/** state: null | { key, collection, item?, public? } */
export default function RecordForm({ state, onClose }) {
  if (!state) return null;
  return <RecordFormInner key={state.key} collection={state.collection} initial={state.item} onClose={onClose} publicMode={!!state.public} />;
}
