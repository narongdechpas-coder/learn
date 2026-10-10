import { useEffect, useState } from 'react';
import type { Case, Claim, Customer, DocKey } from '../types';
import { COVERAGE_LABEL, DOC_LABEL, fmtBaht, fmtDate, usageText, useT, type TKey } from '../i18n';
import { fileClaim, sendRenewalPreview, setReminders, uploadDoc } from '../store';
import { vehicleText } from '../data/vehicles';
import { addBizMinutes, bkkParts, startOfBkkDay } from '../lib/time';
import { CAR_IMG, CarArt, FakeQr, type CarKind } from './icons';
import { Field } from './common';

/* ---------- photo → form (simulated OCR) ---------- */

/** What the demo "reads" from each photo. */
export type OcrKind = 'id' | 'reg' | 'passport';

export const OCR_SAMPLE: Record<OcrKind, Partial<Customer>> = {
  id: {
    firstName: 'วิภาวดี',
    lastName: 'ศรีสุข',
    idCard: '3101400789123',
    address: '45/12 ซอยลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',
  },
  reg: { plate: '2กท 4589', province: 'กรุงเทพมหานคร', chassis: 'MR0JB8CD601234567' },
  passport: { passport: 'AC4589123' },
};

/** Document each photo is attached as. */
export const OCR_DOC: Record<OcrKind, DocKey> = { id: 'idcard', reg: 'regbook', passport: 'passport' };
const OCR_LABEL: Record<OcrKind, [TKey, TKey]> = { id: ['ocrId', 'ocrDoneId'], reg: ['ocrReg', 'ocrDoneReg'], passport: ['ocrPassport', 'ocrDonePassport'] };

const isJpg = (f: File) => /\.(jpe?g)$/i.test(f.name) && (f.type === '' || f.type === 'image/jpeg');

/**
 * Photo of an ID card, registration book or passport: the demo "reads" it, fills the form and keeps
 * the photo as the document. Travel and PA use it for their required copies (title, lead and kinds).
 */
export function OcrBox({ onRead, kinds = ['id', 'reg'], idPrefix = 'ocr', title, lead, attached = [], invalid = false }: {
  onRead: (kind: OcrKind, file: File) => void;
  kinds?: OcrKind[];
  idPrefix?: string;
  title?: string;
  lead?: string;
  /** Already attached some other way (sample documents). */
  attached?: OcrKind[];
  invalid?: boolean;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState<OcrKind | null>(null);
  const [read, setRead] = useState<OcrKind[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const done = kinds.filter((k) => read.includes(k) || attached.includes(k));
  const pick = (kind: OcrKind, file?: File) => {
    if (!file) return;
    if (!isJpg(file)) return setErr(t('errType', { file: file.name }));
    if (file.size > 3 * 1024 * 1024) return setErr(t('errSize', { file: file.name, size: `${(file.size / 1048576).toFixed(2)}MB` }));
    setErr(null);
    setBusy(kind);
    setTimeout(() => {
      onRead(kind, file);
      setBusy(null);
      setRead((d) => (d.includes(kind) ? d : [...d, kind]));
    }, 1100);
  };
  return (
    <div className={`ocr-box${invalid ? ' invalid' : ''}`}>
      <div className="ocr-head">
        <span className="ocr-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm8 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /></svg>
        </span>
        <div>
          <b>{title ?? t('ocrTitle')}</b>
          <p className="hint">{lead ?? t('ocrLead')}</p>
        </div>
      </div>
      <div className="ocr-actions">
        {kinds.map((k) => (
          <label key={k} htmlFor={`${idPrefix}-${k}`} className={`btn${done.includes(k) ? ' done' : ''}`}>
            {busy === k ? <><span className="spinner" aria-hidden="true" /> {t('ocrReading')}</> : <>{done.includes(k) ? '✓ ' : ''}{t(OCR_LABEL[k][0])}</>}
            <input id={`${idPrefix}-${k}`} type="file" accept=".jpg,.jpeg,image/jpeg" className="sr-only" onChange={(e) => { pick(k, e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        ))}
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {done.map((k) => (
        <p key={k} className="ok-note" role="status">✓ {t(OCR_LABEL[k][1])}</p>
      ))}
      <p className="hint">{t('ocrNote')}</p>
    </div>
  );
}

/* ---------- car photos on the phone ---------- */

export const ANGLES: DocKey[] = ['front', 'back', 'left', 'right'];
const ANGLE_KIND: Record<string, { kind: CarKind; flip?: boolean }> = {
  front: { kind: 'front' },
  back: { kind: 'rear' },
  left: { kind: 'sedan', flip: true },
  right: { kind: 'sedan' },
};

export function AngleGuide({ angle }: { angle: DocKey }) {
  const a = ANGLE_KIND[angle];
  if (!a) return null;
  return <CarArt kind={a.kind} flip={a.flip} ghost className="angle-guide" />;
}

/** Paints a believable "photo" of the car for one angle and returns it as a JPEG file. */
export async function fakePhoto(angle: DocKey): Promise<File> {
  const a = ANGLE_KIND[angle];
  const img = new Image();
  img.src = CAR_IMG[a.kind];
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 960;
  const g = canvas.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, '#bcdcf5');
  sky.addColorStop(1, '#eef6fb');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1280, 600);
  const road = g.createLinearGradient(0, 560, 0, 960);
  road.addColorStop(0, '#9aa3a8');
  road.addColorStop(1, '#6d767b');
  g.fillStyle = road;
  g.fillRect(0, 560, 1280, 400);
  g.fillStyle = '#d9e2e7';
  g.fillRect(60, 300, 220, 260);
  g.fillStyle = '#cfd9df';
  g.fillRect(980, 260, 240, 300);
  const h = a.kind === 'front' || a.kind === 'rear' ? 520 : 400;
  const w = (img.width / img.height) * h;
  const x = (1280 - w) / 2;
  const y = 690 - h;
  // Soft ground shadow: a radial gradient squashed into a flat ellipse under the wheels.
  g.save();
  g.translate(640, y + h - 4);
  g.scale(1, 0.08);
  const shadow = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.55);
  shadow.addColorStop(0, 'rgba(20,24,26,0.5)');
  shadow.addColorStop(1, 'rgba(20,24,26,0)');
  g.fillStyle = shadow;
  g.fillRect(-w * 0.55, -w * 0.55, w * 1.1, w * 1.1);
  g.restore();
  g.save();
  if (a.flip) {
    g.translate(1280, 0);
    g.scale(-1, 1);
  }
  g.drawImage(img, x, y, w, h);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = '28px sans-serif';
  g.textAlign = 'right';
  g.fillText(new Date().toISOString().slice(0, 16).replace('T', ' '), 1240, 920);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.82));
  return new File([blob], `${angle}-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

/** A sample scan of the registration book or ID card (clearly marked as a sample) as a JPEG file. */
export async function fakeDoc(kind: 'regbook' | 'idcard' | 'passport', c: Pick<Case, 'customer' | 'vehicle'>): Promise<File> {
  return fakeDocSync(kind, c);
}

/** Same sample document, made synchronously (sample buttons attach it straight away). */
export function fakeDocSync(kind: 'regbook' | 'idcard' | 'passport', c: Pick<Case, 'customer' | 'vehicle'>): File {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#e9e4da';
  g.fillRect(0, 0, 1200, 800);
  const card = kind !== 'regbook';
  const passport = kind === 'passport';
  g.fillStyle = passport ? '#e4ecf6' : card ? '#dcebf5' : '#f6f1e3';
  g.strokeStyle = card ? '#7aa4c4' : '#b9a77a';
  g.lineWidth = 4;
  const [x, y, w, h] = card ? [150, 160, 900, 520] : [100, 60, 1000, 680];
  g.beginPath();
  g.roundRect(x, y, w, h, card ? 28 : 8);
  g.fill();
  g.stroke();
  g.fillStyle = '#2b3a44';
  g.font = 'bold 40px sans-serif';
  g.fillText(passport ? 'หนังสือเดินทาง PASSPORT' : card ? 'บัตรประจำตัวประชาชน' : 'สำเนาคู่มือจดทะเบียนรถ', x + 40, y + 70);
  g.font = '30px sans-serif';
  const v = c.vehicle;
  const lines = passport
    ? [`Passport No. ${c.customer.passport || 'AC4589123'}`, `ชื่อ ${c.customer.firstName} ${c.customer.lastName}`, `วันเกิด ${c.customer.birthDate ?? '-'}`]
    : card
    ? [`เลขประจำตัว ${c.customer.idCard || '1 1037 00123 45 7'}`, `ชื่อ ${c.customer.firstName} ${c.customer.lastName}`, `ที่อยู่ ${c.customer.address.slice(0, 34)}`]
    : [`ทะเบียน ${c.customer.plate || '1กข 1234'} ${c.customer.province}`, `ยี่ห้อ/รุ่น ${v ? vehicleText(v) : '-'}`, `เลขตัวถัง ${c.customer.chassis || 'MR053REH105123456'}`, `ผู้ถือกรรมสิทธิ์ ${c.customer.firstName} ${c.customer.lastName}`];
  lines.forEach((l, i) => g.fillText(l, x + 40, y + 150 + i * 60));
  if (card) {
    g.fillStyle = '#b8c9d6';
    g.fillRect(x + w - 260, y + 120, 200, 250);
  }
  // Never mistakable for a real document.
  g.save();
  g.translate(600, 420);
  g.rotate(-0.35);
  g.fillStyle = 'rgba(200, 40, 40, 0.28)';
  g.font = 'bold 120px sans-serif';
  g.textAlign = 'center';
  g.fillText('ตัวอย่าง SAMPLE', 0, 0);
  g.restore();
  const bin = atob(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], `${kind}-sample.jpg`, { type: 'image/jpeg' });
}

/** Fills every missing document with sample images, for demos. */
export async function attachSampleDocs(c: Case, missing: DocKey[], by?: string) {
  for (const k of missing) {
    const file = ANGLES.includes(k) ? await fakePhoto(k) : await fakeDoc(k as 'regbook' | 'idcard' | 'passport', c);
    await uploadDoc(c.id, k, file, by);
  }
}

export function PhoneCapture({ c, onClose, by }: { c: Case; onClose: () => void; by?: string }) {
  const { t, lang } = useT();
  const todo = ANGLES.filter((k) => !c.docs[k]);
  const [phone, setPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = todo[0];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const shoot = async () => {
    if (!current) return;
    setBusy(true);
    const file = await fakePhoto(current);
    await uploadDoc(c.id, current, file, by);
    setBusy(false);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal phone-modal" role="dialog" aria-modal="true" aria-label={t('phoneTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('phoneTitle')}</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>{t('close')} ✕</button>
        </div>
        <div className="phone-body">
          <div className="phone-qr">
            <FakeQr seed={`photo-${c.id}`} size={150} />
            <p>{t('phoneLead')}</p>
            {!phone && <button type="button" className="btn" onClick={() => setPhone(true)}>{t('phoneSim')} →</button>}
          </div>
          {phone && (
            <div className="phone-frame" aria-live="polite">
              <div className="phone-notch" aria-hidden="true" />
              {current ? (
                <>
                  <div className="viewfinder">
                    <AngleGuide angle={current} />
                    <span className="vf-corner tl" /><span className="vf-corner tr" /><span className="vf-corner bl" /><span className="vf-corner br" />
                  </div>
                  <p className="vf-label">{t('phoneAngle', { angle: DOC_LABEL[lang][current].replace(/^รูปรถ|^Car photo: /, '') })}</p>
                  <p className="vf-hint">{t('phoneGuide')}</p>
                  <div className="vf-dots">
                    {ANGLES.map((k) => (
                      <span key={k} className={c.docs[k] ? 'done' : k === current ? 'cur' : ''} />
                    ))}
                  </div>
                  <button type="button" className="shutter" aria-label={t('phoneShot')} disabled={busy} onClick={shoot}>
                    {busy ? <span className="spinner" aria-hidden="true" /> : null}
                  </button>
                </>
              ) : (
                <div className="vf-done">
                  <span className="done-mark pop-in" aria-hidden="true">✓</span>
                  <b>{t('phoneDone')}</b>
                  <button type="button" className="btn primary" onClick={onClose}>{t('close')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- quote turnaround ---------- */

/** "by 14:30 today" / "by 10:15 tomorrow" for a 2-business-hour quote promise. */
export function quoteEtaText(from: number, t: (k: TKey, p?: Record<string, string | number>) => string, lang: 'th' | 'en') {
  const due = addBizMinutes(from, 120);
  const p = bkkParts(due);
  const hhmm = `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  const dayDiff = Math.round((startOfBkkDay(due) - startOfBkkDay(from)) / 86400000);
  const when = dayDiff === 0 ? t('today') : dayDiff === 1 ? t('tomorrowWord') : fmtDate(due, lang, { weekday: 'short', day: 'numeric', month: 'short' });
  return t('quoteEta', { time: lang === 'th' ? `${hhmm} น. ${when}` : `${hhmm} ${when}` });
}

/* ---------- after the policy is issued ---------- */

export function IssuedExtras({ c }: { c: Case }) {
  const { t, lang } = useT();
  // Only shown for motor policies (the digital card is a car card).
  const vh = c.vehicle!;
  const [claimOpen, setClaimOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const start = new Date(`${c.customer.startDate}T00:00:00+07:00`).getTime();
  const end = start + 365 * 86400000;
  const endText = fmtDate(end, lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const nextPrice = Math.round(((c.premium ?? 0) * (c.claims?.length ? 1 : 0.95)) / 10) * 10;
  const rem = c.reminders ?? { renewal: true, tax: true };
  const code = `JKY-F${c.id.slice(-4)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      const el = document.getElementById(`ref-${c.id}`);
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <div className="issued-extras">
      <div className="digital-card">
        <div className="dc-top">
          <span className="dc-brand">Jacky ประกันภัย</span>
          <span className="dc-type">{COVERAGE_LABEL[lang][c.coverage]}{c.addCmi ? ` ${t('plusCmi')}` : ''}</span>
        </div>
        <div className="dc-car">
          <CarArt kind={vh.usage === '320' ? 'pickup' : vh.usage === '210' ? 'van' : 'sedan'} />
        </div>
        <div className="dc-plate">{c.customer.plate}</div>
        <div className="dc-meta">
          <span>{vehicleText(vh)}</span>
          <span>{usageText(vh.usage, lang)}</span>
        </div>
        <div className="dc-bottom">
          <span className="num">{c.policyNo}</span>
          <span>{t('cardExpiry')} {endText}</span>
        </div>
        <div className="dc-hotline">{t('hotline')} <b className="num">1234</b></div>
      </div>
      <div className="extras-side">
        <button type="button" className="btn primary claim-btn" onClick={() => setClaimOpen(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4Z" /></svg>
          {t('claimBtn')}
        </button>
        {c.claims && c.claims.length > 0 && (
          <ul className="claim-list">
            {c.claims.map((cl) => (
              <li key={cl.no}><b className="num">{cl.no}</b> · {fmtDate(cl.at, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</li>
            ))}
          </ul>
        )}
        <div className="renew-box">
          <b>{t('renewTitle')}</b>
          <p className="hint">{t('renewLead', { date: endText, price: fmtBaht(nextPrice, lang) })}</p>
          <label className="check"><input id={`rr-${c.id}`} type="checkbox" checked={rem.renewal} onChange={(e) => setReminders(c.id, { ...rem, renewal: e.target.checked })} />{t('remindRenew')}</label>
          <label className="check"><input id={`rt-${c.id}`} type="checkbox" checked={rem.tax} onChange={(e) => setReminders(c.id, { ...rem, tax: e.target.checked })} />{t('remindTax')}</label>
          {sent ? (
            <p className="ok-note" role="status">✓ {t('renewSent')}</p>
          ) : (
            <button type="button" className="link" onClick={() => { sendRenewalPreview(c.id, nextPrice, endText); setSent(true); }}>{t('renewPreview')} →</button>
          )}
        </div>
        <div className="refer-box">
          <b>{t('referTitle')}</b>
          <p className="hint">{t('referLead')}</p>
          <div className="refer-row">
            <code id={`ref-${c.id}`}>{code}</code>
            <button type="button" className="btn small" onClick={copy}>{copied ? `✓ ${t('copied')}` : t('copy')}</button>
          </div>
        </div>
      </div>
      {claimOpen && <ClaimModal c={c} onClose={() => setClaimOpen(false)} />}
    </div>
  );
}

const CLAIM_TYPES: [Claim['type'], TKey][] = [
  ['collision', 'ctCollision'],
  ['solo', 'ctSolo'],
  ['theft', 'ctTheft'],
  ['flood', 'ctFlood'],
  ['other', 'ctOther'],
];

function ClaimModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const { t } = useT();
  const [type, setType] = useState<Claim['type']>('collision');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [no, setNo] = useState<string | null>(null);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!place.trim()) return setErr(t('claimErr'));
    setNo(fileClaim(c.id, { type, place: place.trim(), note: note.trim() }));
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal claim-modal" role="dialog" aria-modal="true" aria-label={t('claimTitle')} onClick={(e) => e.stopPropagation()} onSubmit={send} noValidate>
        <div className="modal-head">
          <h3>{t('claimTitle')}</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>{t('close')} ✕</button>
        </div>
        {no ? (
          <div className="claim-done">
            <span className="done-mark pop-in" aria-hidden="true">✓</span>
            <p role="status">{t('claimDone', { no })}</p>
            <button type="button" className="btn primary" onClick={onClose}>{t('close')}</button>
          </div>
        ) : (
          <>
            <div className="eyebrow">{t('claimType')}</div>
            <div className="option-grid" role="radiogroup" aria-label={t('claimType')}>
              {CLAIM_TYPES.map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={type === k} className={`option-card${type === k ? ' on' : ''}`} onClick={() => setType(k)}>
                  <span className="radio-dot" aria-hidden="true" />
                  <b>{t(label)}</b>
                </button>
              ))}
            </div>
            <Field htmlFor="claim-place" label={t('claimPlace')} error={err ?? undefined}>
              <input id="claim-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t('claimPlacePh')} />
            </Field>
            <Field htmlFor="claim-note" label={<>{t('claimNote')} <span className="opt">({t('optional')})</span></>}>
              <textarea id="claim-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="actions">
              <button type="submit" className="btn primary">{t('claimSend')}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
