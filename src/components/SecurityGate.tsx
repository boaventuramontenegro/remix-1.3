import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LoadingScreen } from './Logo';
import { LockScreen } from './LockScreen';
import { Button } from './ui/button';
import { accountQuery, usePreferences } from '@/lib/preferences';
import { readPin, checkPin, biometricUnlock, canAttemptBiometric, prepareBiometric, limparSeguranca, registerFailure, resetFailures } from '@/lib/device-security';
import { readPinTheme, setLockGlobals, readPinAppearance, type PinKeyAppearance } from '@/lib/pinThemes';
import { hasUnlockSession, validateUnlockSession, clearUnlockSession, unlockSessionKey } from '@/lib/unlock-session';
import { supabase } from '@/integrations/supabase/client';
import { flushSync } from 'react-dom';
import { UNLOCK_SESSION_MS } from '@/lib/unlock-session';

export function SecurityGate({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useQuery(accountQuery);
  const { config } = usePreferences();
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [showPin, setShowPin] = useState(false);
  const [bioFailed, setBioFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [tremor, setTremor] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [version, setVersion] = useState(0);
  const [theme, setTheme] = useState('classico');
  const [keyAppearance, setKeyAppearance] = useState<PinKeyAppearance>('cards');
  const lockEpoch = useRef(0);
  const lockedRef = useRef(false);
  const bioController = useRef<AbortController | null>(null);
  const automaticEpoch = useRef(-1);
  const automaticBio = useRef<() => void>(() => {});
  const [lockVersion, setLockVersion] = useState(0);
  const [suspended, setSuspended] = useState(false);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleExpiry = useRef<() => void>(() => {});
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
    if (!user) { setLocked(false); setLockGlobals(false, theme); return; }
    const lock = () => {
      if (lockedRef.current) return;
      clearUnlockSession(user.id);
      lockEpoch.current++;
      const r = readPin(user.id);
      const bio = !!r?.credential && r.biometricEnabled !== false;
      const on = !!r?.hash || bio;
      lockedRef.current = on; setLocked(on);
      setShowPin(!!r?.hash && !bio);
      setPin(''); setMessage(''); setBioFailed(false); setNow(Date.now());
      const th = readPinTheme(user.id, config.pin_tema);
      setTheme(th); setLockGlobals(on, th); setLockVersion(v => v + 1);
    };
    const resume = () => {
      if (document.hidden || busyRef.current) return;
      if (lockedRef.current) { automaticBio.current(); return; }
      const r = readPin(user.id);
      if ((r?.hash || (r?.credential && r.biometricEnabled !== false)) && !hasUnlockSession(user.id)) lock();
    };
    // Timer protects visible use too; foreground always checks persisted elapsed time.
    // Neither path creates or extends a validated session.
    scheduleExpiry.current = () => {
      clearTimeout(expiryTimer.current);
      if (lockedRef.current) return;
      try {
        const session = JSON.parse(localStorage.getItem(unlockSessionKey(user.id)) ?? 'null');
        if (!session || !hasUnlockSession(user.id)) return;
        const remaining = session.validatedAt + UNLOCK_SESSION_MS - Date.now();
        expiryTimer.current = setTimeout(() => { resume(); }, Math.max(0, remaining));
      } catch { /* no session means locked on foreground */ }
    };
    const initialize = () => {
      setKeyAppearance(readPinAppearance(user.id));
      const r = readPin(user.id);
      if (r?.credential && r.biometricEnabled !== false && canAttemptBiometric()) {
        void prepareBiometric().catch(() => { /* Actual attempt reports failure and retains PIN fallback. */ });
      }
      const on = !!r?.hash || !!(r?.credential && r.biometricEnabled !== false);
      const th = readPinTheme(user.id, config.pin_tema); setTheme(th);
      if (on && !hasUnlockSession(user.id)) lock();
      else { lockedRef.current = false; setLocked(false); setLockGlobals(false, th); }
    };
    initialize();
    scheduleExpiry.current();
    const foreground = () => {
      if (document.hidden) return;
      // Commit the privacy decision before the browser can paint restored content.
      flushSync(() => { resume(); setSuspended(false); });
      scheduleExpiry.current();
    };
    const visibility = () => {
      if (document.hidden) { flushSync(() => setSuspended(true)); }
      else foreground();
    };
    const pagehide = () => { flushSync(() => setSuspended(true)); };
    const refresh = () => {
      setVersion(v => v + 1);
      const r = readPin(user.id);
      if (!r?.hash && !(r?.credential && r.biometricEnabled !== false)) {
        lockEpoch.current++; bioController.current?.abort(); clearUnlockSession(user.id);
        lockedRef.current = false; setLocked(false); setLockGlobals(false, readPinTheme(user.id, config.pin_tema));
      }
    };
    const themeChanged = () => { setTheme(readPinTheme(user.id, config.pin_tema)); setKeyAppearance(readPinAppearance(user.id)); };
    const storage = (e: StorageEvent) => {
      if (e.key === unlockSessionKey(user.id)) {
        if (hasUnlockSession(user.id)) { bioController.current?.abort(); lockedRef.current = false; setLocked(false); setLockGlobals(false, readPinTheme(user.id, config.pin_tema)); }
        else resume();
        scheduleExpiry.current();
      } else if (e.key === `meubolso-pin-${user.id}`) { refresh(); resume(); }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', foreground); window.addEventListener('focus', foreground);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('storage', storage);
    window.addEventListener('meubolso-bloquear', lock);
    window.addEventListener('meubolso-seguranca', refresh);
    window.addEventListener('meubolso-pin-tema', themeChanged);
    return () => {
      lockEpoch.current++; bioController.current?.abort(); lockedRef.current = false;
      clearTimeout(expiryTimer.current);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', foreground); window.removeEventListener('focus', foreground);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('storage', storage);
      window.removeEventListener('meubolso-bloquear', lock);
      window.removeEventListener('meubolso-seguranca', refresh);
      window.removeEventListener('meubolso-pin-tema', themeChanged);
    };
  }, [user?.id]);

  const success = () => {
    if (!user) return;
    validateUnlockSession(user.id); lockedRef.current = false;
    setLocked(false); setPin(''); setLockGlobals(false, theme);
    scheduleExpiry.current();
  };

  useEffect(() => {
    if (!locked || !retryAt || retryAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [locked, retryAt]);

  const tryBio = async () => {
    if (!user || document.hidden || busyRef.current || (readPin(user.id)?.retryAt ?? 0) > Date.now()) return;
    const epoch = lockEpoch.current;
    const controller = new AbortController(); bioController.current = controller;
    busyRef.current = true; setBusy(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const expired = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(Error('Verificação expirou.')); }, 20000);
      });
      await Promise.race([(async () => {
        if (!canAttemptBiometric() || controller.signal.aborted) throw Error('unavailable');
        await biometricUnlock(user.id, controller.signal);
      })(), expired]);
      if (epoch !== lockEpoch.current || controller.signal.aborted) return;
      resetFailures(user.id); success();
    } catch {
      if (epoch !== lockEpoch.current || !lockedRef.current) return;
      setBioFailed(true);
      if (readPin(user.id)?.hash) { setShowPin(true); setMessage('Digite seu PIN'); }
      else { registerFailure(user.id); setMessage('Digital não reconhecida'); }
      setNow(Date.now()); setVersion(v => v + 1);
    } finally {
      clearTimeout(timeout);
      if (bioController.current === controller) { bioController.current = null; busyRef.current = false; setBusy(false); }
    }
  };

  automaticBio.current = () => {
    if (!locked || !hasBio || document.hidden || busyRef.current || automaticEpoch.current === lockEpoch.current) return;
    automaticEpoch.current = lockEpoch.current;
    void tryBio();
  };
  useEffect(() => { automaticBio.current(); }, [locked, user?.id, lockVersion]);

  const unlock = async (next: string) => {
    if (!user || busyRef.current || (readPin(user.id)?.retryAt ?? 0) > Date.now()) return;
    busyRef.current = true; setBusy(true); setPin(next);
    try {
      if (await checkPin(user.id, next)) success();
      else { setMessage('PIN incorreto.'); setTremor(true); navigator.vibrate?.(40); setTimeout(() => { setTremor(false); setPin(''); }, 300); }
    } catch { setMessage('Aguarde antes de tentar novamente.'); setPin(''); }
    finally { setNow(Date.now()); setVersion(v => v + 1); busyRef.current = false; setBusy(false); }
  };

  const recover = async () => {
    if (!user || !rec?.recoveryAllowed || cooling) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setMessage('Não foi possível sair. Tente novamente.'); setBusy(false); return; }
    clearUnlockSession(user.id); setLockGlobals(false, theme);
    limparSeguranca(user.id);
    await qc.cancelQueries(); qc.clear();
    navigate({ to: '/auth', replace: true });
  };
  if (isPending || locked === null) return <LoadingScreen />;
  if (!locked) return <div data-app-ready hidden={suspended}>{children}</div>;
  return <LockScreen themeId={theme} keyAppearance={keyAppearance} tamanho={rec?.length ?? 4} pin={pin} onPinChange={setPin} onComplete={unlock} showPin={hasPin && showPin} showBio={hasBio} bioFailed={bioFailed} onBio={() => void tryBio()} busy={busy || cooling} tremor={tremor} message={cooling ? `Aguarde ${remaining} s para tentar novamente.` : message}>
    {rec?.recoveryAllowed && !cooling && <Button variant="ghost" className="text-brand-white hover:bg-brand-white/20 hover:text-brand-white text-xs" disabled={busy} onClick={recover}>Entrar com e-mail e senha</Button>}
  </LockScreen>;
}
