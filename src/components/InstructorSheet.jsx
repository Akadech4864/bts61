import { useState } from 'react';
import {
  Award, BookOpen, Briefcase, ChevronDown, ExternalLink, FileText, FlaskConical, GraduationCap, IdCard, Lightbulb, Mic,
  Pencil, Phone, Trophy,
} from 'lucide-react';
import { Photo } from './Avatar';
import { Sheet } from './Sheet';
import { Button } from './ui';
import { cx, formatPhone, phoneDigits, telHref, toArabicDigits } from '../lib/utils';
import { faceOf, isLead, parseLinks, parseProfile, parseSubjects, subjectTitle } from '../lib/course';

function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-500/10 text-slate-600',
    gold: 'bg-gold-400/25 text-gold-700',
    navy: 'bg-navy-500/10 text-navy-700',
    violet: 'bg-violet-500/15 text-violet-700',
  };
  return <span className={cx('inline-flex shrink-0 items-center rounded-full px-2 py-px text-[11px] font-semibold leading-5', tones[tone])}>{children}</span>;
}

/** ไอคอนตามชื่อหัวข้อในแบบฟอร์มประวัติวิทยากร */
const SECTION_ICONS = [
  [/ทั่วไป|ส่วนตัว/, IdCard],
  [/ติดต่อ/, Phone],
  [/การศึกษา/, GraduationCap],
  [/ฝึกอบรม/, Award],
  [/เชี่ยวชาญ|หัวข้อการบรรยาย/, Lightbulb],
  [/รางวัล/, Trophy],
  [/วิจัย/, FlaskConical],
  [/ผลงาน|บทความ|หนังสือ/, BookOpen],
  [/วิทยากร/, Mic],
  [/ทำงาน/, Briefcase],
];
const iconFor = (title) => (SECTION_ICONS.find(([re]) => re.test(title)) || [null, FileText])[1];

const COLLAPSE_AT = 6;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** ข้อความที่มีอีเมล -> แตะเพื่อส่งอีเมลได้ */
function WithEmails({ text }) {
  const parts = [];
  let last = 0;
  String(text).replace(EMAIL, (m, i) => {
    if (i > last) parts.push(text.slice(last, i));
    parts.push(<a key={i} href={`mailto:${m}`} className="font-medium text-navy-700 underline-offset-2 hover:underline">{m}</a>);
    last = i + m.length;
    return m;
  });
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function ProfileSection({ section }) {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(section.title);
  const long = section.items.length > COLLAPSE_AT + 1;
  const items = long && !open ? section.items.slice(0, COLLAPSE_AT) : section.items;
  // หัวข้อข้อมูลทั่วไป/ติดต่อ เป็นคู่ "หัวข้อ: ข้อมูล" แสดงแบบตาราง ส่วนหัวข้ออื่นเป็นรายการ
  const asTable = section.items.every((it) => it.label) && section.items.length <= 8;
  return (
    <section className="glass rounded-3xl px-4 py-3">
      <h4 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-navy-900">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-500/10 text-navy-600">
          <Icon className="h-4 w-4" />
        </span>
        {section.title}
        {long && <span className="text-[12px] font-medium text-slate-400">({section.items.length})</span>}
      </h4>
      {asTable ? (
        <dl className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[6.5rem_1fr] gap-2 text-[13.5px] leading-snug">
              <dt className="text-slate-500">{it.label}</dt>
              <dd className="min-w-0 break-words text-slate-800"><WithEmails text={it.text} /></dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-slate-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
              <span className="min-w-0 break-words">
                {it.label && <strong className="font-semibold text-navy-900">{it.label}: </strong>}
                <WithEmails text={it.text} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold text-navy-700 hover:bg-white/60"
        >
          {open ? 'ย่อ' : `แสดงทั้งหมด ${section.items.length} รายการ`}
          <ChevronDown className={cx('h-3.5 w-3.5 transition', open && 'rotate-180')} />
        </button>
      )}
    </section>
  );
}

/** ชื่อปุ่มไฟล์ต้นฉบับ: "ไฟล์ประวัติส่วนบุคคล" -> "ประวัติวิทยากร", "ไฟล์ประวัติ (ทำเนียบกฎหมาย)" -> "ทำเนียบกฎหมาย" */
function fileLabel(label) {
  const rest = String(label || '').replace(/^ไฟล์ประวัติ\s*/, '').replace(/^\((.*)\)$/, '$1').trim();
  if (!rest || rest === 'ส่วนบุคคล') return 'ประวัติวิทยากร';
  return rest;
}

/** รายละเอียดอาจารย์ / ประวัติวิทยากร (ใช้ในหน้าอาจารย์และหน้าตารางสอน) */
export default function InstructorSheet({ ins: raw, onClose, onEdit }) {
  if (!raw) return null;
  const ins = raw.subjectList ? raw : { ...raw, subjectList: parseSubjects(raw.subjects) };
  const links = parseLinks(ins.links);
  const profile = parseProfile(ins.profile);
  const hasPhone = !!phoneDigits(ins.phone);

  return (
    <Sheet open onClose={onClose} title="ประวัติวิทยากร">
      <div className="space-y-3 pb-5">
        <div className="flex gap-4">
          <Photo member={faceOf(ins)} width={400} eager className="aspect-[3/4] w-28 shrink-0 rounded-3xl object-[center_25%] shadow-[0_10px_24px_-12px_rgb(11_28_54/0.5)] ring-2 ring-white" textClass="text-4xl" />
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-lg font-bold leading-snug text-navy-900">{ins.name}</h3>
            {ins.position && <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{ins.position}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={ins.kind === 'e' ? 'violet' : 'navy'}>{ins.kind === 'e' ? 'อาจารย์พิเศษ' : 'อาจารย์ประจำ'}</Badge>
              {ins.group_no && <Badge tone="gold">อาจารย์ประจำกลุ่ม {ins.group_no}</Badge>}
            </div>
            {hasPhone && (
              <a href={telHref(ins.phone)} className="btn-gold mt-3 inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-white">
                <Phone className="h-4 w-4" /> {formatPhone(ins.phone)}
              </a>
            )}
          </div>
        </div>

        {profile.length > 0 ? (
          profile.map((section, i) => <ProfileSection key={`${section.title}-${i}`} section={section} />)
        ) : (
          (ins.expertise || ins.education) && (
            <div className="glass divide-y divide-white/70 rounded-3xl px-4">
              {ins.expertise && (
                <div className="py-3">
                  <p className="text-xs text-slate-500">หัวข้อ / ความเชี่ยวชาญ</p>
                  <p className="text-[15px] leading-snug text-slate-800">{toArabicDigits(ins.expertise)}</p>
                </div>
              )}
              {ins.education && (
                <div className="py-3">
                  <p className="text-xs text-slate-500">วุฒิการศึกษา</p>
                  <p className="text-[15px] leading-snug text-slate-800">{toArabicDigits(ins.education)}</p>
                </div>
              )}
            </div>
          )
        )}

        {ins.subjectList.length > 0 && (
          <section className="glass rounded-3xl px-4 py-3">
            <h4 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-navy-900">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-400/20 text-gold-700">
                <BookOpen className="h-4 w-4" />
              </span>
              วิชาที่สอนในหลักสูตร บตส. ({ins.subjectList.length} วิชา)
            </h4>
            <ul className="space-y-2">
              {ins.subjectList.map((s) => (
                <li key={s.name} className="flex items-start gap-2 text-[14px] leading-snug text-slate-800">
                  <span className="mt-0.5 min-w-9 shrink-0 rounded-md bg-navy-500/10 px-1.5 text-center text-[11px] font-semibold leading-5 text-navy-700">{s.code || '•'}</span>
                  <span className="min-w-0 flex-1">
                    {subjectTitle(s)}
                    {s.role && <span className={cx('ml-1 text-[12px]', isLead(s.role) ? 'font-semibold text-gold-700' : 'text-slate-500')}>({s.role})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="glass rounded-3xl px-4 py-3">
          <h4 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-navy-900">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-500/10 text-navy-600">
              <FileText className="h-4 w-4" />
            </span>
            ไฟล์ต้นฉบับ
          </h4>
          {links.length > 0 ? (
            <div className="grid gap-2">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-inset ring-white transition hover:bg-white active:scale-[0.99]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl btn-navy text-white">
                    <ExternalLink className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-navy-900">เปิดไฟล์ต้นฉบับ</span>
                    <span className="block truncate text-[12px] text-slate-500">{fileLabel(l.label)} · Google Drive</span>
                  </span>
                </a>
              ))}
              <p className="text-[11px] leading-snug text-slate-400">
                {profile.length > 0
                  ? 'ข้อมูลด้านบนสรุปจากไฟล์ต้นฉบับ · ไฟล์เก็บอยู่ใน Google Drive ของผู้จัดทำทำเนียบ'
                  : 'ยังไม่มีประวัติโดยละเอียดในระบบ เพราะเจ้าของไฟล์ยังไม่เปิดสิทธิ์ให้ดู หากเปิดไม่ได้ ต้องขอสิทธิ์จากเจ้าของไฟล์'}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">ยังไม่มีไฟล์ประวัติในทำเนียบวิทยากร</p>
          )}
        </section>

        {onEdit && (
          <Button variant="secondary" icon={Pencil} className="w-full" onClick={onEdit}>
            แก้ไขข้อมูลอาจารย์
          </Button>
        )}
      </div>
    </Sheet>
  );
}
