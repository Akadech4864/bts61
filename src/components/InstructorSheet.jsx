import { ExternalLink, Pencil, Phone } from 'lucide-react';
import { Photo } from './Avatar';
import { Sheet } from './Sheet';
import { Button } from './ui';
import { cx, formatPhone, phoneDigits, telHref, toArabicDigits } from '../lib/utils';
import { faceOf, isLead, parseLinks, parseSubjects, subjectTitle } from '../lib/course';

/** รายละเอียดอาจารย์ (ใช้ในหน้าอาจารย์และหน้าตารางสอน) */
function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-500/10 text-slate-600',
    gold: 'bg-gold-400/25 text-gold-700',
    navy: 'bg-navy-500/10 text-navy-700',
    violet: 'bg-violet-500/15 text-violet-700',
  };
  return <span className={cx('inline-flex shrink-0 items-center rounded-full px-2 py-px text-[11px] font-semibold leading-5', tones[tone])}>{children}</span>;
}

export default function InstructorSheet({ ins: raw, onClose, onEdit }) {
  if (!raw) return null;
  const ins = raw.subjectList ? raw : { ...raw, subjectList: parseSubjects(raw.subjects) };
  const links = parseLinks(ins.links);
  return (
    <Sheet open onClose={onClose} title="ข้อมูลอาจารย์">
      <div className="space-y-4 pb-5">
        <div className="flex gap-4">
          <Photo member={faceOf(ins)} width={400} eager className="aspect-[3/4] w-28 shrink-0 rounded-3xl object-[center_25%] shadow-[0_10px_24px_-12px_rgb(11_28_54/0.5)] ring-2 ring-white" textClass="text-4xl" />
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-lg font-bold leading-snug text-navy-900">{ins.name}</h3>
            {ins.position && <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{ins.position}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={ins.kind === 'e' ? 'violet' : 'navy'}>{ins.kind === 'e' ? 'อาจารย์พิเศษ' : 'อาจารย์ประจำ'}</Badge>
              {ins.group_no && <Badge tone="gold">อาจารย์ประจำกลุ่ม {ins.group_no}</Badge>}
            </div>
          </div>
        </div>

        {(ins.expertise || ins.education) && (
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
        )}

        {ins.subjectList.length > 0 && (
          <div className="glass rounded-3xl px-4 py-3">
            <p className="mb-1.5 text-xs text-slate-500">วิชาที่สอนในหลักสูตร ({ins.subjectList.length} วิชา)</p>
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
          </div>
        )}

        {(links.length > 0 || phoneDigits(ins.phone)) && (
          <div className="grid gap-2">
            {phoneDigits(ins.phone) && (
              <a href={telHref(ins.phone)} className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white">
                <Phone className="h-[18px] w-[18px]" /> โทร {formatPhone(ins.phone)}
              </a>
            )}
            {links.map((l, i) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[0.98]',
                  i === 0 ? 'btn-navy text-white' : 'glass text-navy-800',
                )}
              >
                <ExternalLink className="h-[18px] w-[18px]" /> {l.label}
              </a>
            ))}
          </div>
        )}

        {onEdit && (
          <Button variant="secondary" icon={Pencil} className="w-full" onClick={onEdit}>
            แก้ไขข้อมูลอาจารย์
          </Button>
        )}
      </div>
    </Sheet>
  );
}
