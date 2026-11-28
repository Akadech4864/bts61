import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Info, Pencil, Star, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Photo } from './Avatar';
import { Button, Field, Segmented, Spinner, SuggestInput, TextInput, inputClass } from './ui';
import MemberSuggest from './MemberSuggest';
import { SocialEditor, socialPayload, socialRows } from './Social';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { RANK_OPTIONS } from '../config';
import { BUREAUS, PROVINCES } from '../lib/constants';
import { cx, fullName, guessMembers, isCivilianRank, isEmail, MAX_MEMBER_PHOTOS, memberPhotos, normalizeProvince, orgTypeOf, thCompare } from '../lib/utils';
import { autoCropJpeg } from '../lib/image';
import { photoObjectUrl } from '../lib/photos';

const PhotoCropper = lazy(() => import('./PhotoCropper.jsx'));

const FIELDS = ['id', 'rank', 'first_name', 'last_name', 'nickname', 'position', 'province', 'division_bk', 'bureau_bch', 'agency', 'phone', 'email', 'group_name', 'seq'];
const BLANK = { id: '', rank: '', first_name: '', last_name: '', nickname: '', position: '', province: '', division_bk: '', bureau_bch: '', agency: '', phone: '', email: '', group_name: '', seq: '', photo_url: '' };
const ORG_TYPES = [
  { value: 'police', label: 'สังกัดตำรวจ' },
  { value: 'other', label: 'หน่วยงานอื่น' },
];

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort(thCompare);
// รายการรูปในฟอร์ม: keep = รูปเดิมในระบบ, new = รูปใหม่ที่ครอปแล้ว รอบันทึก
const keepItems = (m) => memberPhotos(m).map((p) => ({ key: p.key, kind: 'keep', url: p.url }));
let newSeq = 0;

function MemberFormInner({ initial, prefill, onClose }) {
  const { data, can, isAdmin, saveMember, memberById } = useStore();
  const ui = useUI();
  const toast = useToast();

  const [form, setForm] = useState(() => ({ ...BLANK, ...(initial || prefill || {}) }));
  const [socials, setSocials] = useState(() => socialRows((initial || prefill || {}).social)); // [{ key, type, value }]
  const [photos, setPhotos] = useState(() => keepItems(initial || prefill)); // รูปทั้งหมดตามลำดับ (รายการแรก = รูปหลัก)
  const [origKeys] = useState(() => keepItems(initial || prefill).map((x) => x.key).join('|'));
  const [crop, setCrop] = useState(null); // { src, replaceKey? } รูปที่กำลังจัดกรอบ
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [matched, setMatched] = useState(false); // ดึงข้อมูลเดิมมาจากระบบเดาชื่อ
  const [customRank, setCustomRank] = useState(false); // เลือก "อื่น ๆ" แล้วพิมพ์คำนำหน้าเอง
  const [orgType, setOrgType] = useState(() => orgTypeOf(form)); // police = บก./บช., other = ชื่อหน่วยงาน
  const orgTouched = useRef(false); // ผู้ใช้เลือกประเภทสังกัดเองแล้ว ไม่ต้องเปลี่ยนตามคำนำหน้าอีก
  const urls = useRef([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const isNew = !form.id;
  const canInfo = isNew ? can.add : can.edit;
  const canPhoto = can.photo;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const suggestions = useMemo(
    () => (isNew && nameFocused ? guessMembers(data.members, form.first_name, 5) : []),
    [isNew, nameFocused, data.members, form.first_name],
  );
  const options = useMemo(
    () => ({
      // ตัวเลือกมาตรฐาน + คำนำหน้าอื่นที่มีใช้อยู่แล้วในฐานข้อมูล
      rank: [...new Set([...RANK_OPTIONS, ...data.members.map((m) => m.rank).filter(Boolean)])],
      province: uniqueSorted([...data.members.map((m) => normalizeProvince(m.province)), ...PROVINCES]),
      division: uniqueSorted(data.members.map((m) => m.division_bk)),
      agency: uniqueSorted(data.members.map((m) => m.agency)),
      bureau: uniqueSorted([...data.members.map((m) => m.bureau_bch), ...BUREAUS]),
    }),
    [data.members],
  );

  function pickExisting(m) {
    setNameFocused(false);
    if (!can.edit && !can.photo) {
      toast.info('รายชื่อนี้มีอยู่ในระบบแล้ว — เปิดข้อมูลให้ดูแทน');
      onClose();
      ui.openProfile(m.id);
      return;
    }
    setForm({ ...BLANK, ...m });
    setSocials(socialRows(m.social));
    setCustomRank(!!m.rank && !options.rank.includes(m.rank));
    setOrgType(orgTypeOf(m));
    orgTouched.current = false;
    // รูปใหม่ที่เพิ่งเพิ่มไว้ต่อท้ายรูปเดิมของรายชื่อนั้น
    setPhotos((prev) => [...keepItems(m), ...prev.filter((x) => x.kind === 'new')].slice(0, MAX_MEMBER_PHOTOS));
    setMatched(true);
  }

  const objectUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return url;
  };
  const newItem = (blob) => ({ key: `new-${(newSeq += 1)}`, kind: 'new', blob, url: objectUrl(blob) });

  /** เลือกรูป: รูปเดียวเปิดหน้าจัดกรอบ / หลายรูปครอปกลางภาพให้อัตโนมัติ (แตะ "จัดกรอบ" แก้ทีหลังได้) */
  async function onFiles(e, replaceKey) {
    const all = Array.from(e.target.files || []);
    e.target.value = '';
    const files = all.filter((f) => !f.type || f.type.startsWith('image/'));
    if (!files.length) {
      if (all.length) toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    if (replaceKey || files.length === 1) {
      setCrop({ src: objectUrl(files[0]), replaceKey });
      return;
    }
    const room = MAX_MEMBER_PHOTOS - photos.length;
    const picked = files.slice(0, room);
    if (files.length > room) toast.info(`มีรูปได้สูงสุด ${MAX_MEMBER_PHOTOS} รูป — เพิ่มได้อีก ${room} รูป`);
    setBusyPhoto(true);
    const added = [];
    for (const f of picked) {
      const src = URL.createObjectURL(f);
      try {
        added.push(newItem(await autoCropJpeg(src)));
      } catch (err) {
        toast.error(err.message);
      } finally {
        URL.revokeObjectURL(src);
      }
    }
    setPhotos((prev) => [...prev, ...added].slice(0, MAX_MEMBER_PHOTOS));
    setBusyPhoto(false);
    if (added.length) toast.success(`เพิ่ม ${added.length} รูปแล้ว — แตะ ✎ ที่รูปเพื่อจัดกรอบใหม่ได้`);
  }

  function onCropped(blob) {
    const item = newItem(blob);
    const target = crop && crop.replaceKey;
    setPhotos((prev) => {
      if (target && prev.some((x) => x.key === target)) return prev.map((x) => (x.key === target ? item : x));
      return [...prev, item].slice(0, MAX_MEMBER_PHOTOS);
    });
    setCrop(null);
  }

  /** จัดกรอบรูปที่มีอยู่แล้วใหม่ (ครอป/หมุน) — บันทึกแล้วจะแทนที่รูปเดิมตำแหน่งเดิม */
  async function recrop(item) {
    setBusyPhoto(true);
    const src = await photoObjectUrl(item.url);
    setBusyPhoto(false);
    if (!src) {
      toast.error('เปิดรูปนี้มาแก้ไขไม่ได้ — ลบรูปนี้แล้วเพิ่มรูปใหม่แทน');
      return;
    }
    setCrop({ src, replaceKey: item.key });
  }

  const movePhoto = (i, to) =>
    setPhotos((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [it] = next.splice(i, 1);
      next.splice(to, 0, it);
      return next;
    });
  const removePhotoAt = (key) => setPhotos((prev) => prev.filter((x) => x.key !== key));

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    if (canInfo && !form.first_name.trim()) {
      toast.error('กรุณากรอกชื่อจริง');
      return;
    }
    if (canInfo && !String(form.rank || '').trim()) {
      toast.error('กรุณาเลือกคำนำหน้า / ยศ');
      return;
    }
    // ชื่อเล่นบังคับกรอกสำหรับผู้เข้าอบรม (แอดมินแก้ข้อมูลแทนได้แม้ยังไม่ทราบชื่อเล่น)
    if (canInfo && !isAdmin && !String(form.nickname || '').trim()) {
      toast.error('กรุณากรอกชื่อเล่น');
      return;
    }
    if (canInfo && String(form.email || '').trim() && !isEmail(form.email)) {
      toast.error('รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com');
      return;
    }
    setSaving(true);
    try {
      const member = {};
      FIELDS.forEach((k) => { member[k] = typeof form[k] === 'string' ? form[k].trim() : form[k]; });
      member.province = normalizeProvince(member.province);
      member.social = socialPayload(socials);
      // เก็บเฉพาะสังกัดของประเภทที่เลือก: ตำรวจ = บก./บช., หน่วยงานอื่น = ชื่อหน่วยงาน
      if (orgType === 'other') {
        member.division_bk = '';
        member.bureau_bch = '';
      } else {
        member.agency = '';
      }
      const changed = photos.map((x) => x.key).join('|') !== origKeys || photos.some((x) => x.kind === 'new');
      await saveMember(member, { gallery: canPhoto && changed ? photos.map((x) => (x.kind === 'new' ? { kind: 'new', blob: x.blob } : { kind: 'keep', key: x.key })) : null });
      toast.success(isNew ? 'เพิ่มรายชื่อเรียบร้อย' : 'บันทึกข้อมูลเรียบร้อย');
      onClose();
    } catch (err) {
      const existing = err.code === 'DUPLICATE' && err.extra && memberById.get(err.extra.existingId);
      if (existing && can.edit) {
        // ชื่อซ้ำ: สลับไปแก้ไขรายชื่อเดิม โดยคงค่าที่ผู้ใช้เพิ่งกรอกไว้
        setForm((prev) => {
          const typed = {};
          FIELDS.forEach((k) => { if (k !== 'id' && prev[k]) typed[k] = prev[k]; });
          return { ...BLANK, ...existing, ...typed, id: existing.id };
        });
        // โซเชียลที่เพิ่งกรอกคงไว้ ถ้ายังไม่ได้กรอกจึงดึงของเดิมมาแสดง (กันบันทึกทับเป็นค่าว่าง)
        setSocials((prev) => (prev.some((r) => r.value.trim()) ? prev : socialRows(existing.social)));
        setPhotos((prev) => [...keepItems(existing), ...prev.filter((x) => x.kind === 'new')].slice(0, MAX_MEMBER_PHOTOS));
        setMatched(true);
        setCustomRank(!!form.rank && !options.rank.includes(form.rank));
        toast.info('มีชื่อนี้ในระบบแล้ว — สลับเป็นการอัปเดตข้อมูลเดิม กด "บันทึก" อีกครั้งเพื่อยืนยัน', 5000);
      } else {
        toast.error(err.message);
      }
      setSaving(false);
    }
  }

  const full = photos.length >= MAX_MEMBER_PHOTOS;
  const tileBtn = 'grid h-7 w-7 place-items-center rounded-full bg-navy-950/60 text-white ring-1 ring-inset ring-white/30 backdrop-blur transition active:scale-90 disabled:opacity-30';
  const addTile =
    'flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-navy-200 bg-white/40 text-[12.5px] font-semibold text-navy-700 transition hover:bg-white/70 active:scale-[0.98]';

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        dismissable={false}
        title={isNew ? 'เพิ่มรายชื่อ' : 'แก้ไขข้อมูล'}
        subtitle={isNew ? 'พิมพ์ชื่อจริงก่อน ระบบจะค้นหาและกรอกข้อมูลที่มีอยู่ให้อัตโนมัติ' : fullName(form)}
        footer={
          <Button type="submit" form="member-form" size="lg" className="w-full" loading={saving}>
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        }
      >
        <form id="member-form" onSubmit={submit} className="space-y-4 pb-5" autoComplete="off">
          {matched && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-gold-300/25 px-3.5 py-3 text-[13px] leading-snug text-gold-700 ring-1 ring-inset ring-gold-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>ดึงข้อมูลเดิมจากระบบมาให้แล้ว แก้ไขเฉพาะส่วนที่ต้องการแล้วกดบันทึก (ไม่สร้างรายชื่อซ้ำ)</span>
            </div>
          )}
          {!canInfo && canPhoto && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-navy-500/10 px-3.5 py-3 text-[13px] leading-snug text-navy-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>ขณะนี้ผู้ดูแลเปิดให้เปลี่ยนรูปถ่ายเท่านั้น ข้อมูลอื่นแก้ไขไม่ได้</span>
            </div>
          )}

          {canPhoto && (
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-slate-600">
                  รูปถ่าย <span className="font-normal text-slate-400">· รูปแรกคือรูปหลัก มีหลายรูปจะสลับให้อัตโนมัติ</span>
                </p>
                <span className="shrink-0 text-[12px] tabular-nums text-slate-400">{photos.length}/{MAX_MEMBER_PHOTOS}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-photo-grid>
                {photos.map((it, i) => (
                  <div key={it.key} className="relative overflow-hidden rounded-2xl shadow-[0_8px_18px_-10px_rgb(11_28_54/0.5)] ring-2 ring-white" data-photo-item={it.kind}>
                    <Photo member={{ ...form, photo_url: it.url }} width={320} eager className="aspect-[3/4] w-full object-[center_22%]" textClass="text-3xl" />
                    {i === 0 ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-gold-400 px-2 py-0.5 text-[10.5px] font-bold text-navy-950 shadow">รูปหลัก</span>
                    ) : (
                      <button type="button" onClick={() => movePhoto(i, 0)} aria-label={`ตั้งรูปที่ ${i + 1} เป็นรูปหลัก`} title="ตั้งเป็นรูปหลัก" className={cx(tileBtn, 'absolute left-1.5 top-1.5')}>
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => removePhotoAt(it.key)} aria-label={`ลบรูปที่ ${i + 1}`} title="ลบรูปนี้" className={cx(tileBtn, 'absolute right-1.5 top-1.5 bg-rose-600/85')}>
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-navy-950/70 to-transparent px-1.5 pb-1.5 pt-5">
                      <button type="button" onClick={() => movePhoto(i, i - 1)} disabled={i === 0} aria-label={`เลื่อนรูปที่ ${i + 1} ไปทางซ้าย`} className={tileBtn}>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => recrop(it)} disabled={busyPhoto} aria-label={`จัดกรอบรูปที่ ${i + 1}`} title="แก้ไขรูป (จัดกรอบ / หมุน)" className={tileBtn}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => movePhoto(i, i + 1)} disabled={i === photos.length - 1} aria-label={`เลื่อนรูปที่ ${i + 1} ไปทางขวา`} className={tileBtn}>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!full && (
                  <>
                    <label className={addTile}>
                      <Camera className="h-6 w-6" /> ถ่ายรูป
                      <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => onFiles(e)} />
                    </label>
                    <label className={cx(addTile, busyPhoto && 'pointer-events-none opacity-60')}>
                      {busyPhoto ? <Spinner className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
                      {photos.length ? 'เพิ่มรูป' : 'เลือกรูป'}
                      <span className="-mt-1 text-[10.5px] font-normal text-slate-500">เลือกได้หลายรูป</span>
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e)} data-photo-input />
                    </label>
                  </>
                )}
              </div>
              {photos.length > 0 && (
                <p className="mt-1.5 text-[11.5px] leading-snug text-slate-400">☆ ตั้งเป็นรูปหลัก · ✎ แก้ไข/จัดกรอบ · ‹ › เลื่อนลำดับ · ✕ ลบ — รูปจะเปลี่ยนจริงเมื่อกด "บันทึก"</p>
              )}
            </div>
          )}

          {/* พิมพ์ชื่อจริงก่อน เพื่อให้ระบบค้นหาและกรอกข้อมูลเดิม (รวมคำนำหน้า) ให้อัตโนมัติ */}
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-slate-600">
              ชื่อจริง<span className="ml-0.5 text-rose-500">*</span>
            </span>
            <div className="relative">
              <input
                value={form.first_name}
                onChange={(e) => {
                  set('first_name')(e.target.value);
                  setNameFocused(true);
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                disabled={!canInfo}
                placeholder="พิมพ์ชื่อจริง (ไม่ต้องพิมพ์ยศ/คำนำหน้า)"
                enterKeyHint="next"
                autoComplete="off"
                aria-label="ชื่อจริง"
                className={inputClass}
              />
              <MemberSuggest items={suggestions} onPick={pickExisting} title="พบในระบบแล้ว — แตะเพื่อดึงข้อมูลมากรอกให้อัตโนมัติ" />
            </div>
            {isNew && (
              <span className="mt-1 block text-xs text-slate-400">พิมพ์ชื่อจริงก่อน ถ้ามีข้อมูลในระบบแล้ว ระบบจะกรอกคำนำหน้าและข้อมูลอื่นให้เอง</span>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-slate-600">
              คำนำหน้า / ยศ<span className="ml-0.5 text-rose-500">*</span>
            </span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="คำนำหน้า / ยศ">
              {options.rank.map((r) => {
                const active = !customRank && form.rank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!canInfo}
                    onClick={() => {
                      setCustomRank(false);
                      set('rank')(r);
                      // นาย/นาง/นางสาว มักไม่ใช่ตำรวจ: สลับเป็น "หน่วยงานอื่น" ให้ (ถ้ายังไม่ได้เลือกเองและยังไม่ได้กรอก บก./บช.)
                      if (!orgTouched.current && !form.division_bk && !form.bureau_bch) {
                        setOrgType(isCivilianRank(r) ? 'other' : 'police');
                      }
                    }}
                    className={cx(
                      'h-10 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50',
                      active ? 'btn-navy text-white' : 'glass text-slate-700',
                    )}
                  >
                    {r}
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={customRank}
                disabled={!canInfo}
                onClick={() => {
                  setCustomRank(true);
                  if (options.rank.includes(form.rank)) set('rank')('');
                }}
                className={cx(
                  'h-10 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50',
                  customRank ? 'btn-navy text-white' : 'glass text-slate-500',
                )}
              >
                อื่น ๆ
              </button>
            </div>
            {customRank && (
              <TextInput
                value={form.rank}
                onChange={(e) => set('rank')(e.target.value)}
                disabled={!canInfo}
                placeholder="พิมพ์คำนำหน้า / ยศ เช่น ดร., ว่าที่ ร.ต."
                aria-label="คำนำหน้า / ยศ อื่น ๆ"
                className="mt-2"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="นามสกุล">
              <TextInput value={form.last_name} onChange={(e) => set('last_name')(e.target.value)} disabled={!canInfo} placeholder="นามสกุล" />
            </Field>
            <Field label="ชื่อเล่น" required={!isAdmin}>
              <TextInput value={form.nickname} onChange={(e) => set('nickname')(e.target.value)} disabled={!canInfo} placeholder="ชื่อเล่น" />
            </Field>
          </div>

          <Field label="ตำแหน่ง">
            <TextInput value={form.position} onChange={(e) => set('position')(e.target.value)} disabled={!canInfo} placeholder="เช่น รอง ผบก.ภ.จว.เชียงใหม่" />
          </Field>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-slate-600">สังกัด</span>
            <Segmented
              value={orgType}
              onChange={(v) => {
                if (!canInfo) return;
                orgTouched.current = true;
                setOrgType(v);
              }}
              options={ORG_TYPES}
              className="mb-3 w-full [&>button]:flex-1"
            />
            {orgType === 'police' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="บก. (กองบังคับการ)">
                  <SuggestInput value={form.division_bk} onChange={set('division_bk')} options={options.division} disabled={!canInfo} placeholder="เช่น ภ.จว.เชียงใหม่" />
                </Field>
                <Field label="บช. (กองบัญชาการ)">
                  <SuggestInput value={form.bureau_bch} onChange={set('bureau_bch')} options={options.bureau} disabled={!canInfo} placeholder="เช่น ภ.5" />
                </Field>
              </div>
            ) : (
              <Field label="ชื่อหน่วยงาน" hint="สำหรับผู้เข้าอบรมที่ไม่ได้สังกัดสำนักงานตำรวจแห่งชาติ">
                <SuggestInput value={form.agency} onChange={set('agency')} options={options.agency} disabled={!canInfo} placeholder="เช่น สำนักงานอัยการสูงสุด, กรมราชทัณฑ์" />
              </Field>
            )}
          </div>

          <Field label="จังหวัด">
            <SuggestInput
              value={form.province}
              onChange={set('province')}
              onBlur={() => setForm((f) => ({ ...f, province: normalizeProvince(f.province) }))}
              options={options.province}
              disabled={!canInfo}
              placeholder="พิมพ์เพื่อค้นหาจังหวัด เช่น กทม."
            />
          </Field>

          <Field label="เบอร์โทรศัพท์">
            <TextInput
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
              disabled={!canInfo}
              placeholder="08x-xxx-xxxx"
              autoComplete="off"
            />
          </Field>

          <Field label="อีเมล">
            <TextInput
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              disabled={!canInfo}
              placeholder="name@example.com"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={120}
            />
          </Field>

          {(canInfo || socials.length > 0) && <SocialEditor rows={socials} onChange={setSocials} disabled={!canInfo} />}

          {isAdmin && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/40 p-3 ring-1 ring-inset ring-white/70">
              <Field label="กลุ่ม (เฉพาะแอดมิน)">
                <TextInput value={form.group_name} onChange={(e) => set('group_name')(e.target.value)} placeholder="เช่น กลุ่ม 1" />
              </Field>
              <Field label="ลำดับที่ (เฉพาะแอดมิน)">
                <TextInput inputMode="numeric" value={form.seq} onChange={(e) => set('seq')(e.target.value.replace(/\D/g, ''))} placeholder="เช่น 12" />
              </Field>
            </div>
          )}
        </form>
      </Sheet>

      {crop && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] grid place-items-center bg-navy-950/90 text-white">
              <Spinner className="h-8 w-8" />
            </div>
          }
        >
          <PhotoCropper src={crop.src} onCancel={() => setCrop(null)} onDone={onCropped} />
        </Suspense>
      )}
    </>
  );
}

/** state: null | { key, member?, prefill? } */
export default function MemberForm({ state, onClose }) {
  if (!state) return null;
  return <MemberFormInner key={state.key} initial={state.member} prefill={state.prefill} onClose={onClose} />;
}
