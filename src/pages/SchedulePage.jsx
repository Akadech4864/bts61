import { useState } from 'react';
import { SubTabs } from '../components/ui';
import { useUI } from '../lib/ui';
import ClassPage from './ClassPage';
import DutyPage from './DutyPage';

const SUBS = [
  { value: 'classes', label: 'ตารางสอน' },
  { value: 'duty', label: 'ตารางเวร' },
];

/** หมวด "ตาราง": รวมตารางสอนและตารางเวรไว้ในเมนูเดียว สลับด้วยแท็บย่อย */
export default function SchedulePage() {
  const ui = useUI();
  const [sub, setSub] = useState(ui.view && ui.view.sub === 'duty' ? 'duty' : 'classes');
  const switcher = (
    <SubTabs
      options={SUBS}
      value={sub}
      label="ประเภทตาราง"
      onChange={(next) => {
        setSub(next);
        window.scrollTo(0, 0);
      }}
    />
  );
  return sub === 'duty' ? <DutyPage switcher={switcher} /> : <ClassPage switcher={switcher} />;
}
