import { useState } from 'react';
import MoreMenuButton from '../components/MoreMenu';
import { PageHeader, SubTabs } from '../components/ui';
import { useUI } from '../lib/ui';
import { CourseInfoPanel } from './AboutPage';
import { InstructorsPanel } from './InstructorsPage';
import { DocsPanel, StudyPanel } from './DocsPage';
import { FEATURED_SUBJECT } from '../lib/course';
import { subjectKey } from '../lib/docs';

const SUBTABS = [
  { value: 'info', label: 'ข้อมูล' },
  { value: 'instructors', label: 'อาจารย์' },
  { value: 'docs', label: 'วิชา' },
  { value: 'study', label: 'เอกสารศึกษา' },
];

/** หมวดหลักสูตร: ข้อมูลหลักสูตร / อาจารย์ (รวมประวัติ) / วิชา (เอกสารประกอบการสอน) / เอกสารศึกษา (งานเขียนรายบุคคล) */
export default function CoursePage() {
  const ui = useUI();
  // แท็บประวัติเดิมรวมอยู่ในแท็บอาจารย์แล้ว
  // แท็บประวัติเดิมรวมอยู่ในแท็บอาจารย์ / วิชาเอกสารศึกษาเปิดที่แท็บของตัวเอง
  let asked = ui.view && (ui.view.tab === 'profiles' ? 'instructors' : ui.view.tab);
  if (asked === 'docs' && ui.view.subject && subjectKey(ui.view.subject) === subjectKey(FEATURED_SUBJECT)) asked = 'study';
  const initial = SUBTABS.some((s) => s.value === asked) ? asked : 'info';
  const [tab, setTab] = useState(initial);
  const [mode, setMode] = useState((ui.view && ui.view.mode) || '');
  const go = (next, nextMode = '') => {
    setMode(nextMode);
    setTab(next);
    ui.remember({ tab: next, mode: nextMode, subject: '' });
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
      {tab === 'study' && <StudyPanel />}
    </div>
  );
}
