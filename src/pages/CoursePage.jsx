import { useState } from 'react';
import MoreMenuButton from '../components/MoreMenu';
import { PageHeader, SubTabs } from '../components/ui';
import { useUI } from '../lib/ui';
import { CourseInfoPanel } from './AboutPage';
import { InstructorsPanel } from './InstructorsPage';
import { DocsPanel } from './DocsPage';

const SUBTABS = [
  { value: 'info', label: 'ข้อมูล' },
  { value: 'instructors', label: 'อาจารย์' },
  { value: 'docs', label: 'วิชา' },
];

/** หมวดหลักสูตร: ข้อมูลหลักสูตร / อาจารย์ (รวมประวัติ) / วิชา (เอกสาร สไลด์ ลิงก์ประกอบการสอนของแต่ละวิชา) */
export default function CoursePage() {
  const ui = useUI();
  // แท็บประวัติเดิมรวมอยู่ในแท็บอาจารย์แล้ว
  const asked = ui.view && (ui.view.tab === 'profiles' ? 'instructors' : ui.view.tab);
  const initial = SUBTABS.some((s) => s.value === asked) ? asked : 'info';
  const [tab, setTab] = useState(initial);
  const [mode, setMode] = useState((ui.view && ui.view.mode) || '');
  const go = (next, nextMode = '') => {
    setMode(nextMode);
    setTab(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 page-bottom">
      <PageHeader title="หลักสูตร" right={<MoreMenuButton />}>
        <SubTabs options={SUBTABS} value={tab} onChange={(v) => go(v)} label="หัวข้อในเมนูหลักสูตร" />
      </PageHeader>

      {tab === 'info' && <CourseInfoPanel />}
      {tab === 'instructors' && <InstructorsPanel key={mode || 'default'} initialMode={mode} />}
      {tab === 'docs' && <DocsPanel key={(ui.view && ui.view.subject) || 'all'} />}
    </div>
  );
}
