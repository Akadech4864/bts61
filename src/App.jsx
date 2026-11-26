import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomNav, { ALIAS_VIEWS, TAB_ALIASES, TABS } from './components/BottomNav';
import ProfileSheet from './components/ProfileSheet';
import MemberForm from './components/MemberForm';
import { ClassForm, DutyForm } from './components/ScheduleForms';
import { Sheet } from './components/Sheet';
import { Button } from './components/ui';
import { ToastProvider } from './components/Toast';
import UpdateBanner from './components/UpdateBanner';
import { StoreProvider, useStore } from './lib/store';
import { UIContext } from './lib/ui';
import { readStored, writeStored } from './lib/utils';
import DirectoryPage from './pages/DirectoryPage';
import HomePage from './pages/HomePage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import CoursePage from './pages/CoursePage';

const PAGES = { home: HomePage, directory: DirectoryPage, schedule: SchedulePage, course: CoursePage, settings: SettingsPage };
const TAB_KEY = 'bts61:tab';

function ConfirmDialog({ request, onAnswer }) {
  if (!request) return null;
  return (
    <Sheet open center size="sm" onClose={() => onAnswer(false)}>
      <div className="px-1 pb-1 pt-7 text-center">
        <h2 className="text-lg font-bold text-navy-900">{request.title}</h2>
        {request.message && <p className="mt-2 text-sm leading-relaxed text-slate-600">{request.message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => onAnswer(false)}>
            ยกเลิก
          </Button>
          <Button variant={request.danger ? 'danger' : 'primary'} onClick={() => onAnswer(true)}>
            {request.confirmText || 'ยืนยัน'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Shell() {
  const { isAdmin, data } = useStore();
  // เปิดแอพที่หน้าแรกเสมอ (วันนี้มีอะไร) — แท็บที่จำไว้ใช้เฉพาะตอนโหลดหน้าใหม่ภายในไม่กี่นาที เช่น กดอัปเดตเวอร์ชัน
  const [stored] = useState(() => {
    const last = readStored(TAB_KEY, null);
    const fresh = last && typeof last === 'object' && Date.now() - (last.at || 0) < 2 * 60 * 1000;
    return fresh ? last.tab : 'home';
  });
  const [tab, setTab] = useState(() => {
    const saved = TAB_ALIASES[stored] || stored;
    return TABS.some((t) => t.id === saved) ? saved : 'home';
  });
  // ส่งต่อมุมมองย่อยเมื่อเปลี่ยนหน้า เช่น { tab: 'instructors', mode: 'groups' } หรือ { sub: 'classes', date: '2026-12-01' }
  const [view, setView] = useState(() => ALIAS_VIEWS[stored] || null);
  const [navSeq, setNavSeq] = useState(0);
  const [profileId, setProfileId] = useState(null);
  const [memberForm, setMemberForm] = useState(null);
  const [classForm, setClassForm] = useState(null);
  const [dutyForm, setDutyForm] = useState(null);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const formSeq = useRef(0);

  const go = useCallback((requested, nextView = null) => {
    const next = TAB_ALIASES[requested] || requested;
    const aliasView = ALIAS_VIEWS[requested];
    setTab(next);
    setView(aliasView ? { ...aliasView, ...(nextView || {}) } : nextView);
    setNavSeq((n) => n + 1); // เปิดหน้าใหม่ทุกครั้ง แม้อยู่หมวดเดิม (เช่น เอกสาร → อาจารย์ประจำกลุ่ม)
    writeStored(TAB_KEY, { tab: next, at: Date.now() });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const t = TABS.find((x) => x.id === tab) || TABS[0];
    document.title = `${t.title || t.label} · บตส.รุ่นที่ 61`;
  }, [tab]);

  const confirmResolve = useRef(null);
  const answer = useCallback((value) => {
    if (confirmResolve.current) confirmResolve.current(value);
    confirmResolve.current = null;
    setConfirmRequest(null);
  }, []);

  const ui = useMemo(
    () => ({
      tab,
      view,
      go,
      openProfile: (id) => setProfileId(id),
      openMemberForm: (member, prefill) => setMemberForm({ key: ++formSeq.current, member: member || null, prefill: prefill || null }),
      openClassForm: (item) => setClassForm({ key: ++formSeq.current, item: item || null }),
      openDutyForm: (item) => setDutyForm({ key: ++formSeq.current, item: item || null }),
      confirm: (options) =>
        new Promise((resolve) => {
          if (confirmResolve.current) confirmResolve.current(false);
          confirmResolve.current = resolve;
          setConfirmRequest(options);
        }),
    }),
    [tab, view, go],
  );

  const closeProfile = useCallback(() => setProfileId(null), []);
  const Page = PAGES[tab] || DirectoryPage;

  return (
    <UIContext.Provider value={ui}>
      <div className="app-bg" aria-hidden="true" />
      <main key={`${tab}:${navSeq}`} className="animate-fade-in">
        <Page />
      </main>
      <BottomNav tab={tab} onChange={go} adminActive={isAdmin} dots={{ schedule: (data.swaps || []).some((s) => s.status === 'pending') }} />

      <ProfileSheet memberId={profileId} onClose={closeProfile} />
      <MemberForm state={memberForm} onClose={() => setMemberForm(null)} />
      <ClassForm state={classForm} onClose={() => setClassForm(null)} />
      <DutyForm state={dutyForm} onClose={() => setDutyForm(null)} />
      <ConfirmDialog request={confirmRequest} onAnswer={answer} />
      <UpdateBanner />
    </UIContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ToastProvider>
  );
}
