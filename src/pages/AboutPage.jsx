import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, GraduationCap, Landmark, MapPin, Pencil, Phone, Plus, Users } from 'lucide-react';
import { Photo } from '../components/Avatar';
import { Button, EmptyState, FitText, Skeleton } from '../components/ui';
import RecordForm from '../components/RecordForm';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { COURSE_BATCH, COURSE_PERIOD, COURSE_SUBTITLE } from '../config';
import { cx, formatPhone, fullName, orgTypeOf, phoneDigits, telHref } from '../lib/utils';
import { bySort } from '../lib/course';

const COURSE_ROOM = 'ห้อง 302 ชั้น 3 อาคารเรียน 8 ชั้น วิทยาลัยการตำรวจ';
const COURSE_WEEKS = 16;

function CallButton({ phone, dark = false, className }) {
  if (!phoneDigits(phone)) return null;
  return (
    <a
      href={telHref(phone)}
      onClick={(e) => e.stopPropagation()}
      className={cx(
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95',
        dark ? 'btn-gold text-white' : 'bg-navy-500/10 text-navy-800',
        className,
      )}
    >
      <Phone className="h-4 w-4" /> {formatPhone(phone)}
    </a>
  );
}

/** ผู้อำนวยการหลักสูตร (ลำดับแรก) — การ์ดใหญ่ */
function LeadCard({ person, onEdit }) {
  return (
    <section className="glass-dark relative overflow-hidden rounded-3xl p-4">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gold-400/10" />
      <div className="flex gap-4">
        <Photo member={person} width={400} eager className="aspect-[3/4] w-28 shrink-0 rounded-2xl object-[center_20%] ring-2 ring-white/30" textClass="text-4xl" />
        <div className="min-w-0 flex-1 py-1">
          <p className="text-[11px] font-semibold text-gold-300">ผู้บริหารหลักสูตร</p>
          <h3 className="mt-0.5 text-lg font-bold leading-snug">{fullName(person)}</h3>
          {person.nickname && <p className="text-[13px] text-white/70">({person.nickname})</p>}
          {person.role && <p className="mt-1.5 text-[14px] leading-snug text-white/90">{person.role}</p>}
          <CallButton phone={person.phone} dark className="mt-3" />
        </div>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label="แก้ไขข้อมูล" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}

function StaffCard({ person, onEdit }) {
  return (
    <article className="glass relative flex flex-col overflow-hidden rounded-3xl">
      <Photo member={person} width={400} className="aspect-[3/4] w-full object-[center_20%]" textClass="text-5xl" />
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[14px] font-bold leading-snug text-navy-900">{fullName(person)}</h3>
        {person.nickname && <p className="text-[12px] text-slate-500">({person.nickname})</p>}
        {person.role && <p className="mt-1 text-[12px] leading-snug text-slate-600">{person.role}</p>}
        <div className="mt-auto pt-2">
          <CallButton phone={person.phone} className="h-9 w-full px-2 text-[12px]" />
        </div>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label="แก้ไขข้อมูล" className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-slate-500 shadow-sm backdrop-blur hover:text-navy-800">
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}

/** ข้อมูลหลักสูตร + ผู้บริหาร (ใช้ในเมนูหลักสูตร > ข้อมูลหลักสูตร) */
export function CourseInfoPanel() {
  const { data, status, isAdmin } = useStore();
  const [form, setForm] = useState(null);
  const staff = useMemo(() => [...(data.staff || [])].sort(bySort), [data.staff]);
  const [lead, ...team] = staff;
  const counts = useMemo(() => {
    const other = data.members.filter((m) => orgTypeOf(m) === 'other').length;
    return { all: data.members.length, police: data.members.length - other, other };
  }, [data.members]);
  const edit = (item) => (isAdmin ? () => setForm({ key: Date.now(), collection: 'staff', item }) : null);
  const loading = status === 'loading';

  return (
    <div>

      <section className="glass rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <img src="./logo.jpg" alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover shadow-[0_6px_16px_-6px_rgb(11_28_54/0.4)] ring-2 ring-white/80" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gold-600">บตส. {COURSE_BATCH}</p>
            {/* ชื่อหลักสูตรบรรทัดเดียว ย่อขนาดให้พอดีจอ */}
            <FitText as="h2" text={COURSE_SUBTITLE} max={20} min={14} className="font-bold leading-snug text-navy-900" />
          </div>
        </div>
        <dl className="mt-4 space-y-2.5 text-[14px]">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
            <div>
              <dt className="sr-only">ระยะเวลา</dt>
              <dd className="font-medium text-slate-800">{COURSE_PERIOD}</dd>
              <dd className="text-[12px] text-slate-500">{COURSE_WEEKS} สัปดาห์</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
            <div>
              <dt className="sr-only">สถานที่</dt>
              {/* ห้องเรียน / สถานที่ แยกบรรทัด ไม่ให้ชื่อสถานที่ขาดกลางคำ */}
              <dd className="font-medium text-slate-800">{COURSE_ROOM.replace(/\s*วิทยาลัยการตำรวจ$/, '')}</dd>
              <dd className="text-[12px] text-slate-500">วิทยาลัยการตำรวจ</dd>
            </div>
          </div>
          {counts.all > 0 && (
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
              <div>
                <dt className="sr-only">ผู้เข้าอบรม</dt>
                <dd className="font-medium text-slate-800">ผู้เข้ารับการฝึกอบรม {counts.all} คน</dd>
                {counts.other > 0 && <dd className="text-[12px] text-slate-500">ตำรวจ {counts.police} คน · หน่วยงานอื่น {counts.other} คน</dd>}
              </div>
            </div>
          )}
        </dl>
      </section>

      <div className="mb-2 mt-6 flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
          <Landmark className="h-[18px] w-[18px] text-gold-600" /> ผู้บริหารและคณะผู้รับผิดชอบหลักสูตร
        </h2>
        {isAdmin && (
          <Button size="sm" variant="soft" icon={Plus} onClick={() => setForm({ key: Date.now(), collection: 'staff', item: null })} className="shrink-0">
            เพิ่ม
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      ) : !lead ? (
        <EmptyState icon={Landmark} title="ยังไม่มีข้อมูลผู้บริหารหลักสูตร" description={isAdmin ? 'กด "เพิ่ม" เพื่อกรอกข้อมูล' : undefined} />
      ) : (
        <div className="space-y-3">
          <LeadCard person={lead} onEdit={edit(lead)} />
          {team.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {team.map((p) => <StaffCard key={p.id} person={p} onEdit={edit(p)} />)}
            </div>
          )}
        </div>
      )}

      <RecordForm state={form} onClose={() => setForm(null)} />
    </div>
  );
}
