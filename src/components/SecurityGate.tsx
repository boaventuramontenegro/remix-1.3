import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LoadingScreen } from './Logo';
import { LockScreen } from './LockScreen';
import { Button } from './ui/button';
import { accountQuery, usePreferences } from '@/lib/preferences';
import { readPin, checkPin, biometricUnlock, biometriaDisponivel, limparSeguranca, registerFailure, resetFailures } from '@/lib/device-security';
import { readPinTheme } from '@/lib/pinThemes';
import { supabase } from '@/integrations/supabase/client';

export function SecurityGate({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useQuery(accountQuery);
  const { config } = usePreferences();
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [showPin, setShowPin] = useState(false);
  const [message, setMessage] = useState('');
  const [tremor, setTremor] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [version, setVersion] = useState(0);
  const [theme, setTheme] = useState('classico');
  const lockEpoch = useRef(0);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rec = user && locked !== null ? readPin(user.id) : null;
  const hasPin = !!rec?.hash;
  const hasBio = !!rec?.credential && rec.biometricEnabled !== false;
  const retryAt = rec?.retryAt ?? 0;
  const cooling = retryAt > now;
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  void version;

  useEffect(() => {
    if (!user) { setLocked(false); return; }
    const lock = () => {
      lockEpoch.current++;
      const r = readPin(user.id);
      const bio = !!r?.credential && r.biometricEnabled !== false;
      setLocked(!!r?.hash || bio);
      setShowPin(!!r?.hash && !bio);
      setPin(''); setMessage(''); setNow(Date.now());
      setTheme(readPinTheme(user.id, config.pin_tema));
    };
    lock();
    let hiddenAt: number | null = null;
    const visibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt !== null) {
        if (Date.now() - hiddenAt >= config.pin_tempo_bloqueio * 1000) lock();
        hiddenAt = null;
      }
    };
    const refresh = () => {
      setVersion(v => v + 1);
      const r = readPin(user.id);
      if (!r?.hash && !(r?.credential && r.biometricEnabled !== false)) setLocked(false);
    };
    const themeChanged = () => setTheme(readPinTheme(user.id, config.pin_tema));
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('meubolso-bloquear', lock);
    window.addEventListener('meubolso-seguranca', refresh);
    window.addEventListener('meubolso-pin-tema', themeChanged);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('meubolso-bloquear', lock); window.removeEventListener('meubolso-seguranca', refresh); window.removeEventListener('meubolso-pin-tema', themeChanged); };
  }, [user?.id, config.pin_tempo_bloqueio]);

  useEffect(() => {
    if (!locked || !retryAt || retryAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [locked, retryAt]);

  const tryBio = async () => {
    if (!user || busyRef.current || (readPin(user.id)?.retryAt ?? 0) > Date.now()) return;
    const epoch = lockEpoch.current;
    busyRef.current = true; setBusy(true);
    try {
      if (!(await biometriaDisponivel())) throw Error('unavailable');
      await biometricUnlock(user.id);
      if (epoch !== lockEpoch.current) return;
      resetFailures(user.id); setLocked(false); setPin('');
    } catch {
      if (epoch !== lockEpoch.current) return;
      if (readPin(user.id)?.hash) { setShowPin(true); setMessage('Não foi possível usar a digital. Digite seu PIN.'); }
      else { registerFailure(user.id); setMessage('Digital não reconhecida. Toque para tentar de novo.'); }
      setNow(Date.now()); setVersion(v => v + 1);
    } finally { busyRef.current = false; setBusy(false); }
  };

  useEffect(() => {
    if (!locked || !hasBio) return;
    // Exactly one automatic verification per lock; retries are explicitly tapped.
    void tryBio();
  }, [locked, user?.id]);

  const unlock = async (next: string) => {
    if (!user || busyRef.current || (readPin(user.id)?.retryAt ?? 0) > Date.now()) return;
    busyRef.current = true; setBusy(true); setPin(next);
    try {
      if (await checkPin(user.id, next)) { setLocked(false); setPin(''); }
      else { setMessage('PIN incorreto.'); setTremor(true); navigator.vibrate?.(40); setTimeout(() => { setTremor(false); setPin(''); }, 300); }
    } catch { setMessage('Aguarde antes de tentar novamente.'); setPin(''); }
    finally { setNow(Date.now()); setVersion(v => v + 1); busyRef.current = false; setBusy(false); }
  };

  const recover = async () => {
    if (!user || !rec?.recoveryAllowed || cooling) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setMessage('Não foi possível sair. Tente novamente.'); setBusy(false); return; }
    limparSeguranca(user.id);
    await qc.cancelQueries(); qc.clear();
    navigate({ to: '/auth', replace: true });
  };
  if (isPending || locked === null) return <LoadingScreen />;
  if (!locked) return children;
  return <LockScreen themeId={theme} tamanho={rec?.length ?? 4} pin={pin} onPinChange={setPin} onComplete={unlock} showPin={hasPin && showPin} showBio={hasBio} onBio={() => void tryBio()} busy={busy || cooling} tremor={tremor} message={cooling ? `Aguarde ${remaining} s para tentar novamente.` : message}>
    {cooling && showPin && <p className="lock-hint">Aguarde {remaining} s</p>}
    {rec?.recoveryAllowed && !cooling && <Button variant="ghost" className="text-brand-white hover:bg-brand-white/20 hover:text-brand-white text-xs" disabled={busy} onClick={recover}>Entrar com e-mail e senha</Button>}
  </LockScreen>;
}
