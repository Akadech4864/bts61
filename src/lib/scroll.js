/**
 * เลื่อนหน้าด้วยโค้ด (เช่น เปิดมาที่การ์ดวันนี้) — ไม่ให้เมนูล่าง/แถบลอยหุบ เพราะผู้ใช้ไม่ได้เลื่อนเอง
 * useHideOnScroll (BottomNav) จะข้ามการเลื่อนในช่วงนี้และแสดงเมนูไว้
 */
let programmaticUntil = 0;

export function isProgrammaticScroll() {
  return Date.now() < programmaticUntil;
}

export function scrollToY(y) {
  programmaticUntil = Date.now() + 800;
  window.scrollTo(0, Math.max(0, y));
}
