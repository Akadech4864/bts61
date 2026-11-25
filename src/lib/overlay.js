/**
 * จัดการหน้าต่างซ้อน (bottom sheet / modal)
 * - ปุ่ม "ย้อนกลับ" ของมือถือจะปิดหน้าต่างบนสุด แทนที่จะออกจากแอพ
 * - ล็อกการเลื่อนของหน้าหลักขณะมีหน้าต่างเปิดอยู่
 *
 * หลักการ: เก็บรายการหน้าต่างที่เปิดอยู่ไว้ใน stack แล้ว "ปรับ history ให้ลึกเท่ากับจำนวนหน้าต่าง"
 * แบบหน่วงเล็กน้อย (หลังจบรอบการทำงานปัจจุบัน) การปิดหน้าต่างหนึ่งแล้วเปิดอีกหน้าต่างทันที
 * จึงไม่ทำให้ history กระโดดไปมา
 */
const stack = [];
let locks = 0;
let scheduled = false;
let traversing = false; // กำลังรอ history.go() ที่เราสั่งเอง
let traverseTimer = 0;

const historyDepth = () => (window.history.state && window.history.state.overlayDepth) || 0;

function sync() {
  scheduled = false;
  if (traversing) return; // จะถูกเรียกอีกครั้งเมื่อ popstate มาถึง
  const have = historyDepth();
  const want = stack.length;
  if (want > have) {
    for (let depth = have + 1; depth <= want; depth++) {
      window.history.pushState({ ...(window.history.state || {}), overlayDepth: depth }, '');
    }
  } else if (want < have) {
    traversing = true;
    clearTimeout(traverseTimer);
    traverseTimer = setTimeout(() => {
      traversing = false; // กันค้าง กรณีเบราว์เซอร์ไม่ส่ง popstate กลับมา
    }, 800);
    window.history.go(want - have);
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(sync, 0);
}

window.addEventListener('popstate', () => {
  if (traversing) {
    traversing = false;
    clearTimeout(traverseTimer);
    scheduleSync();
    return;
  }
  // ผู้ใช้กดปุ่มย้อนกลับ: ปิดหน้าต่างที่อยู่ลึกกว่าตำแหน่ง history ปัจจุบัน
  const depth = historyDepth();
  while (stack.length > depth) {
    const top = stack.pop();
    try {
      top.onBack();
    } catch (err) {
      console.error(err);
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !stack.length) return;
  e.preventDefault();
  const top = stack.pop();
  top.onBack();
  scheduleSync();
});

/** ลงทะเบียนหน้าต่างใหม่ คืนฟังก์ชันสำหรับเรียกเมื่อหน้าต่างถูกปิด */
export function pushOverlay(onBack) {
  const entry = { onBack };
  stack.push(entry);
  scheduleSync();
  return () => {
    const i = stack.indexOf(entry);
    if (i !== -1) stack.splice(i, 1); // ถ้าไม่พบ แปลว่าถูกปิดด้วยปุ่มย้อนกลับไปแล้ว
    scheduleSync();
  };
}

export function lockScroll() {
  locks += 1;
  if (locks === 1) document.documentElement.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.documentElement.style.overflow = '';
  };
}
