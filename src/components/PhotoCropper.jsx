import { useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useOverlay } from './Sheet';
import { Spinner } from './ui';
import { useToast } from './Toast';
import { cropToJpeg, PHOTO_ASPECT } from '../lib/image';

/** หน้าต่างครอป/จัดกรอบรูปหน้าตรง (ลาก ซูม หมุน) แล้วบีบอัดเป็น JPEG ก่อนอัปโหลด */
export default function PhotoCropper({ src, onCancel, onDone }) {
  const toast = useToast();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  useOverlay(true, onCancel);

  async function confirm() {
    if (!area || busy) return;
    setBusy(true);
    try {
      onDone(await cropToJpeg(src, area, rotation));
    } catch (err) {
      toast.error(err.message || 'ประมวลผลรูปไม่สำเร็จ');
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-navy-950 text-white">
      <div className="pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={onCancel} className="h-10 rounded-full px-3 text-[15px] font-medium text-white/80 hover:bg-white/10">
            ยกเลิก
          </button>
          <p className="text-[15px] font-semibold">จัดกรอบรูปหน้าตรง</p>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="หมุนรูป"
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={PHOTO_ASPECT}
          minZoom={1}
          maxZoom={4}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
          classes={{ cropAreaClassName: 'face-guide' }}
        />
      </div>

      <div className="space-y-4 px-5 pb-safe pt-4">
        <p className="text-center text-[13px] text-white/60">ลากเพื่อเลื่อน • ถ่างนิ้วเพื่อซูม • จัดใบหน้าให้อยู่ในวงรี</p>
        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-white/60" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="ซูม"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-gold-400"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-white/60" />
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={!area || busy}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 text-base font-semibold text-navy-950 transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Spinner /> : <Check className="h-5 w-5" />}
          ใช้รูปนี้
        </button>
      </div>
    </div>,
    document.body,
  );
}
