import { createContext, useContext } from 'react';

/**
 * คำสั่งระดับแอพที่ทุกหน้าจอเรียกใช้ได้:
 *   tab, view (มุมมองย่อยที่ส่งมากับ go), go(tab, view?), openProfile(memberId), openMemberForm(member?, prefill?),
 *   openClassForm(item?), openDutyForm(item?), confirm({ title, message, confirmText, danger })
 */
export const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);
