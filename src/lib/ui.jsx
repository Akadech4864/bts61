import { createContext, useContext } from 'react';

/**
 * คำสั่งระดับแอพที่ทุกหน้าจอเรียกใช้ได้:
 *   go(tab), openProfile(memberId), openMemberForm(member?, prefill?),
 *   openClassForm(item?), openDutyForm(item?), confirm({ title, message, confirmText, danger })
 */
export const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);
