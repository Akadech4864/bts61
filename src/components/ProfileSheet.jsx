import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Copy, Landmark, Mail, MapPin, Pencil, Phone, Trash2, UsersRound, X } from 'lucide-react';
import { Sheet, useOverlay } from './Sheet';
import { Photo, prefersReducedMotion } from './Avatar';
import { Button } from './ui';
import { SocialList } from './Social';
import { useToast } from './Toast';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { copyText, cx, formatPhone, fullName, memberPhotos, orgTypeOf, phoneDigits, telHref } from '../lib/utils';

/**
 * รูปของสมาชิก: มีหลายรูปจะเลื่อนเปลี่ยนเองทุก 4 วินาที ปัดซ้าย/ขวาเองได้ (หยุดเลื่อนอัตโนมัติชั่วคราวเมื่อแตะ)
 * จุดด้านบนบอกว่าอยู่รูปที่เท่าไร — แตะรูปเพื่อดูขนาดเต็ม
 */
function PhotoCarousel({ member, onZoom }) {
  const photos = memberPhotos(member);
  const n = photos.length;
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const pausedUntil = useRef(0);

  useEffect(() => {
    setIndex(0);
    if (ref.current) ref.current.scrollLeft = 0;
  }, [member.id]);
  useEffect(() => {
    if (n < 2 || prefersReducedMotion()) return undefined;
    const timer = setInterval(() => {
      const el = ref.current;
      if (!el || Date.now() < pausedUntil.current || document.visibilityState !== 'visible') return;
      const w = el.clientWidth || 1;
      const next = (Math.round(el.scrollLeft / w) + 1) % n;
      el.scrollTo({ left: next * w, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(timer);
  }, [n]);

  const photoClass = 'aspect-[3/4] max-h-[58dvh] w-full object-[center_22%]';
  if (n < 2) {
    return (
      <button type="button" className="block w-full" onClick={() => member.photo_url && onZoom(0)} aria-label="ดูรูปขนาดเต็ม">
        <Photo member={member} width={900} eager className={photoClass} textClass="text-8xl" />
      </button>
    );
  }
  const pause = () => { pausedUntil.current = Date.now() + 8000; };
  const goTo = (k) => {
    pause();
    const el = ref.current;
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1)))}
        onPointerDown={pause}
        onTouchStart={pause}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        aria-roledescription="carousel"
        aria-label={`รูปถ่าย ${n} รูป`}
      >
        {photos.map((p, k) => (
          <button
            key={p.key}
            type="button"
            className="block w-full shrink-0 snap-center snap-always"
            onClick={() => onZoom(k)}
            aria-label={`รูปที่ ${k + 1} จาก ${n} — แตะเพื่อดูขนาดเต็ม`}
          >
            <Photo member={{ ...member, photo_url: p.url }} width={900} eager={k === 0} className={photoClass} textClass="text-8xl" />
          </button>
        ))}
      </div>
      <div className="absolute inset-x-0 top-8 flex justify-center gap-1.5">
        {photos.map((p, k) => (
          <button
            key={p.key}
            type="button"
            onClick={() => goTo(k)}
            aria-label={`ไปที่รูปที่ ${k + 1}`}
            className={cx('h-1.5 rounded-full shadow transition-all', k === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55')}
          />
        ))}
      </div>
    </div>
  );
}

function Lightbox({ member, index = 0, onClose }) {
  useOverlay(true, onClose);
  const p = memberPhotos(member)[index];
  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-navy-950/95" onClick={onClose}>
      <Photo member={p ? { ...member, photo_url: p.url } : member} width={1200} eager className="max-h-full max-w-full bg-transparent! object-contain!" />
      <button
        type="button"
        aria-label="ปิด"
        className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <X className="h-5 w-5" />
      </button>
    </div>,
    document.body,
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-navy-500/10 text-navy-600 ring-1 ring-inset ring-white/80">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={value ? 'text-[15px] font-medium leading-snug text-slate-800' : 'text-[15px] text-slate-300'}>{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfileSheet({ memberId, onClose }) {
  const { memberById, can, isAdmin, deleteMember } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [zoom, setZoom] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const m = memberId ? memberById.get(memberId) : null;

  useEffect(() => {
    if (memberId && !m) onClose();
  }, [memberId, m, onClose]);
  useEffect(() => setZoom(false), [memberId]);

  if (!m) return null;

  const hasPhone = !!phoneDigits(m.phone);
  const canEdit = can.edit || can.photo;

  async function onCopy() {
    const ok = await copyText(phoneDigits(m.phone));
    if (ok) toast.success('คัดลอกเบอร์แล้ว');
    else toast.error('คัดลอกไม่สำเร็จ กรุณากดค้างที่เบอร์เพื่อคัดลอก');
  }

  async function onDelete() {
    const ok = await ui.confirm({
      title: 'ลบรายชื่อนี้?',
      message: `${fullName(m)} จะถูกลบออกจากทำเนียบรุ่น และรูปถ่ายจะถูกย้ายลงถังขยะของ Google Drive`,
      confirmText: 'ลบรายชื่อ',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMember(m.id);
      toast.success('ลบรายชื่อเรียบร้อย');
      onClose();
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet open onClose={onClose} flush>
        <div className="relative">
          <PhotoCarousel member={m} onZoom={(k) => setZoom(k)} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 via-navy-950/45 to-transparent px-5 pb-4 pt-20">
            {m.seq && (
              <span className="mb-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/90 backdrop-blur">
                ลำดับที่ {m.seq}
              </span>
            )}
            <p className="text-4xl font-bold leading-tight text-white drop-shadow">{m.nickname || m.first_name}</p>
            <p className="mt-1 text-[17px] font-medium text-white/90">{fullName(m)}</p>
          </div>
        </div>

        <div className="px-5 pb-safe pt-4">
          {m.position && <p className="text-[15px] font-medium leading-snug text-navy-800">{m.position}</p>}

          <div className="glass-dark mt-4 rounded-3xl p-4">
            <p className="text-xs text-white/60">เบอร์โทรศัพท์</p>
            {hasPhone ? (
              <>
                <a href={telHref(m.phone)} className="mt-0.5 block text-2xl font-semibold tracking-wide">
                  {formatPhone(m.phone)}
                </a>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={telHref(m.phone)}
                    className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white transition active:scale-[0.98]"
                  >
                    <Phone className="h-[18px] w-[18px]" /> โทรออก
                  </a>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur transition active:scale-[0.98]"
                  >
                    <Copy className="h-[18px] w-[18px]" /> คัดลอกเบอร์
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-0.5 text-[15px] text-white/70">ยังไม่มีเบอร์โทรในระบบ</p>
            )}
          </div>

          <SocialList value={m.social} />

          <div className="glass mt-3 divide-y divide-white/70 rounded-3xl px-4">
            {m.email && (
              <a href={`mailto:${encodeURI(m.email)}`} className="block transition active:opacity-70 [&_p]:break-all" aria-label={`ส่งอีเมลถึง ${m.email}`}>
                <InfoRow icon={Mail} label="อีเมล" value={m.email} />
              </a>
            )}
            {orgTypeOf(m) === 'other' ? (
              <InfoRow icon={Landmark} label="หน่วยงาน" value={m.agency} />
            ) : (
              <>
                <InfoRow icon={Building2} label="บก. (กองบังคับการ)" value={m.division_bk} />
                <InfoRow icon={Landmark} label="บช. (กองบัญชาการ)" value={m.bureau_bch} />
              </>
            )}
            <InfoRow icon={MapPin} label="จังหวัด" value={m.province} />
            {m.group_name && <InfoRow icon={UsersRound} label="กลุ่ม" value={m.group_name} />}
          </div>

          {(canEdit || isAdmin) && (
            <div className="mt-4 flex gap-2">
              {canEdit && (
                <Button variant="secondary" icon={Pencil} className="flex-1" onClick={() => ui.openMemberForm(m)}>
                  {can.edit ? 'แก้ไขข้อมูล' : 'เปลี่ยนรูปถ่าย'}
                </Button>
              )}
              {isAdmin && (
                <Button variant="dangerSoft" icon={Trash2} loading={deleting} onClick={onDelete}>
                  ลบ
                </Button>
              )}
            </div>
          )}
        </div>
      </Sheet>
      {zoom !== false && <Lightbox member={m} index={zoom} onClose={() => setZoom(false)} />}
    </>
  );
}
