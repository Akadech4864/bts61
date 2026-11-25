/** เครื่องมือรูปภาพฝั่ง Client: ครอป หมุน ย่อขนาด และบีบอัดก่อนอัปโหลด */

export const PHOTO_ASPECT = 3 / 4;
const OUT_WIDTH = 600;
const OUT_HEIGHT = 800;
const MAX_SOURCE_SIDE = 2400;
// รูปถูกส่งผ่าน Apps Script เป็น base64 จึงบีบให้เล็กพอโหลดเร็วบนมือถือ แต่ยังเห็นหน้าชัด
const TARGET_BYTES = 140 * 1024;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ กรุณาเลือกรูปอื่น (รองรับ JPG / PNG)'));
    img.src = src;
  });
}

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('บีบอัดรูปไม่สำเร็จ'))), 'image/jpeg', quality);
  });
}

/**
 * ตัดรูปตามกรอบที่ผู้ใช้จัด (pixelCrop จาก react-easy-crop) แล้วย่อเป็น JPEG 600x800
 * @returns {Promise<Blob>}
 */
export async function cropToJpeg(src, pixelCrop, rotation = 0) {
  const image = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const boxW = image.naturalWidth * cos + image.naturalHeight * sin;
  const boxH = image.naturalWidth * sin + image.naturalHeight * cos;
  // ย่อรูปต้นฉบับขนาดใหญ่จากกล้องมือถือก่อน เพื่อไม่ให้กินหน่วยความจำ
  const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(boxW, boxH));

  const stage = document.createElement('canvas');
  stage.width = Math.round(boxW * scale);
  stage.height = Math.round(boxH * scale);
  const sctx = stage.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.translate(stage.width / 2, stage.height / 2);
  sctx.rotate(rad);
  sctx.scale(scale, scale);
  sctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const cropW = pixelCrop.width * scale;
  const outW = Math.max(120, Math.min(OUT_WIDTH, Math.round(cropW)));
  const outH = Math.round((outW * OUT_HEIGHT) / OUT_WIDTH);
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, outW, outH);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(stage, pixelCrop.x * scale, pixelCrop.y * scale, cropW, pixelCrop.height * scale, 0, 0, outW, outH);

  let quality = 0.84;
  let blob = await toBlob(out, quality);
  while (blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await toBlob(out, quality);
  }
  return blob;
}
