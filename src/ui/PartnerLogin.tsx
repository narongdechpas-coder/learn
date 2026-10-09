import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { useStore } from '../store';

const SAMPLE_OTP = '246810';
const mask = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return `${d.slice(0, 3)}-xxx-${d.slice(-4)}`;
};

/** Business Partner sign-in from the customer site: partner code, then an OTP to the registered phone (simulated). */
export function PartnerLogin({ onClose, onDone }: { onClose: () => void; onDone: (agentId: string) => void }) {
  const { t } = useT();
  const s = useStore();
  const [step, setStep] = useState<'code' | 'otp'>('code');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(0);
  const agent = s.agents.find((a) => a.code.toLowerCase() === code.trim().toLowerCase());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (!wait) return;
    const h = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(h);
  }, [wait]);

  const sendOtp = () => {
    setErr('');
    if (!agent) return setErr(t('plNoCode'));
    if (!agent.active) return setErr(t('plSuspended'));
    setOtp('');
    setStep('otp');
    setWait(30);
  };
  const verify = () => {
    if (otp !== SAMPLE_OTP) return setErr(t('plBadOtp'));
    onDone(agent!.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pl-modal" role="dialog" aria-modal="true" aria-label={t('plTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('plTitle')}</h3>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label="close">×</button>
        </div>
        <ol className="pl-steps" aria-hidden="true">
          <li className={step === 'code' ? 'on' : 'done'}>1 · {t('plStepCode')}</li>
          <li className={step === 'otp' ? 'on' : ''}>2 · {t('plStepOtp')}</li>
        </ol>
        {step === 'code' ? (
          <form className="pl-form" onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
            <label htmlFor="pl-code">{t('plCode')}</label>
            <input id="pl-code" autoFocus autoComplete="username" placeholder="AG-1001" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} />
            <p className="hint">{t('plCodeHint')}</p>
            {err && <p className="error" role="alert">{err}</p>}
            <button type="submit" className="btn primary block">{t('plSend')}</button>
            <div className="pl-demo">
              <b>{t('plDemo')}</b>
              <span>{t('plDemoCodes')}</span>
              <div className="pl-samples">
                {s.agents.map((a) => (
                  <button key={a.id} type="button" className="chip" title={a.th} onClick={() => { setCode(a.code); setErr(''); }}>{a.code}</button>
                ))}
              </div>
              <span>{t('plDemoOtp', { otp: SAMPLE_OTP })}</span>
            </div>
          </form>
        ) : (
          <form className="pl-form" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <p>{t('plSent', { phone: mask(agent!.phone) })}</p>
            <label htmlFor="pl-otp">{t('plOtp')}</label>
            <div className="otp-row">
              <input id="pl-otp" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setErr(''); }} />
              <button type="button" className="link" onClick={() => setOtp(SAMPLE_OTP)}>{t('otpFill')}</button>
            </div>
            <p className="pl-demo">{t('plDemoOtp', { otp: SAMPLE_OTP })}</p>
            {err && <p className="error" role="alert">{err}</p>}
            <button type="submit" className="btn primary block" disabled={otp.length !== 6}>{t('plVerify')}</button>
            <div className="pl-foot">
              <button type="button" className="link" onClick={() => { setStep('code'); setErr(''); }}>← {t('plChangeCode')}</button>
              <button type="button" className="link" disabled={wait > 0} onClick={() => { setWait(30); setOtp(''); setErr(''); }}>{wait > 0 ? t('plResendIn', { s: wait }) : t('plResend')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
