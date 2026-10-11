import { useState, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Fingerprint } from 'lucide-react';
import { Logo, LoadingScreen } from './Logo';
import { Button } from './ui/button';
import { TecladoPin, BolinhasPin } from './PinPad';
import { accountQuery, usePreferences } from '@/lib/preferences';
import { readPin, checkPin, pinKey, biometricUnlock, biometriaDisponivel, emIframe } from '@/lib/device-security';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SecurityGate({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useQuery(accountQuery);
  const { config } = usePreferences();
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [falhas, setFalhas] = useState(0);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rec = user ? readPin(user.id) : null;
  const temPin = !!rec;
  const temBio = !!rec?.credential;

  useEffect(() => {
    if (!user) return;
    const reset = localStorage.getItem('meubolso-forgot-pin');
    if (reset === user.id) { localStorage.removeItem(pinKey(user.id)); localStorage.removeItem('meubolso-forgot-pin'); }
    setLocked(!!readPin(user.id));
    let hiddenAt = 0;
    const cb = () => {
      if (document.hidden) { hiddenAt = Date.now(); }
      else if (hiddenAt && Date.now() - hiddenAt >= config.pin_tempo_bloqueio * 1000 && readPin(user.id)) { setLocked(true); setPin(''); }
    };
    document.addEventListener('visibilitychange', cb);
    return () => document.removeEventListener('visibilitychange', cb);
  }, [user?.id, config.pin_tempo_bloqueio]);

  useEffect(() => {
    const lock = () => { if (user && readPin(user.id)) { setLocked(true); setPin(''); setFalhas(0); } };
    window.addEventListener('meubolso-bloquear', lock);
    return () => window.removeEventListener('meubolso-bloquear', lock);
  }, [user?.id]);

  const tentarBio = async () => {
    if (!user) return;
    if (emIframe()) { toast('Abra o app publicado para usar a impressão digital', { id: 'bio-iframe' }); return; }
    try { await biometricUnlock(user.id); setLocked(false); setPin(''); }
    catch { toast.error('Não foi possível usar a impressão digital.'); }
  };

  // Pede a impressão digital automaticamente ao bloquear, se configurada e suportada.
  useEffect(() => {
    if (!locked || !temBio || !user) return;
    let vivo = true;
    biometriaDisponivel().then((ok) => { if (ok && vivo) tentarBio(); });
    return () => { vivo = false; };
  }, [locked, temBio, user?.id]);

  const unlock = async (next: string) => {
    setPin(next);
    if (next.length !== 4 || !user) return;
    setBusy(true);
    try {
      if (await checkPin(user.id, next)) { setLocked(false); setPin(''); setFalhas(0); }
      else {
        const n = falhas + 1;
        setFalhas(n);
        if (n >= 5) { await sairConta(); return; }
        toast.error('PIN incorreto.');
        setPin('');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível desbloquear.');
      setPin('');
    } finally { setBusy(false); }
  };

  const sairConta = async () => {
    if (!user) return;
    localStorage.setItem('meubolso-forgot-pin', user.id);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: '/auth', replace: true });
  };

  if (isPending || locked === null) return <LoadingScreen />;
  if (!locked) return children;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-hero text-brand-white">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-8 px-8 py-10">
        <Logo variante="claro" tamanho="lg" />
        <h1 className="text-xl font-semibold">Desbloquear Meu Bolso</h1>
        {temBio && (
          <Button variant="ghost" className="h-12 rounded-2xl border border-brand-white/20 text-brand-white hover:bg-brand-white/20 hover:text-brand-white" onClick={tentarBio}>
            <Fingerprint /> Usar impressão digital
          </Button>
        )}
        {temPin && (
          <>
            <BolinhasPin quantas={pin.length} dark />
            <TecladoPin valor={pin} onChange={setPin} disabled={busy} onDigits={unlock} dark />
          </>
        )}
        <Button variant="ghost" className="text-brand-white hover:bg-brand-white/20 hover:text-brand-white" onClick={sairConta}>
          Entrar com e-mail e senha
        </Button>
      </div>
    </div>
  );
}
