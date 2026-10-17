import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, Fingerprint, LockKeyhole, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { BottomSheet } from './BottomSheet';
import { ConfirmSheet } from './ConfirmSheet';
import { CriarPinSheet, PedirPinSheet } from './PinPad';
import { LockScreen } from './LockScreen';
import { biometriaDisponivel, biometricUnlock, checkPin, createPin, enableBiometric, limparSeguranca, readPin, removeBiometric, removePin, setBiometricEnabled } from '@/lib/device-security';
import { pinThemes, readPinTheme, savePinTheme, readPinAppearance, savePinAppearance, type PinKeyAppearance } from '@/lib/pinThemes';

export function DeviceSecuritySettings({ userId, themeId, timeout, onTimeout, onTheme }: { userId: string; themeId: string; timeout: number; onTimeout: (v: number) => void; onTheme: (v: string) => void }) {
  const [record, setRecord] = useState<ReturnType<typeof readPin>>(null);
  const [supported, setSupported] = useState(false);
  const [authorize, setAuthorize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<'bio' | 'reset' | 'pin' | null>(null);
  const [create, setCreate] = useState(false);
  const [verify, setVerify] = useState(false);
  const [afterVerify, setAfterVerify] = useState<() => void>(() => () => {});
  const [length, setLength] = useState(4);
  const [selected, setSelected] = useState('classico');
  const [preview, setPreview] = useState<string | null>(null);
  const [demo, setDemo] = useState('');
  const [appearance, setAppearance] = useState<PinKeyAppearance>('cards');
  const refresh = () => setRecord(readPin(userId));
  useEffect(() => { refresh(); setSelected(readPinTheme(userId, themeId)); setAppearance(readPinAppearance(userId)); biometriaDisponivel().then(setSupported); }, [userId]);
  const hasPin = !!record?.hash;
  const bioOn = !!record?.credential && record.biometricEnabled !== false;
  const authenticate = async (next: () => void) => {
    setError('');
    if (record?.credential && supported) {
      setBusy(true);
      try { await biometricUnlock(userId); next(); return; }
      catch { if (!hasPin) { setError('Não foi possível confirmar pela digital.'); return; } }
      finally { setBusy(false); }
    }
    if (hasPin) { setAfterVerify(() => next); setVerify(true); }
    else next();
  };
  const newPin = (size: number) => { setLength(size); setCreate(true); };
  const confirmAction = () => {
    if (confirmation === 'bio') removeBiometric(userId);
    if (confirmation === 'reset') limparSeguranca(userId);
    if (confirmation === 'pin') removePin(userId);
    refresh(); setConfirmation(null);
  };
  const status = (on: boolean) => <span className={`text-xs font-medium ${on ? 'text-primary' : 'text-muted-foreground'}`}>{on ? 'Ativada' : 'Desativada'}</span>;
  return <>
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Fingerprint size={20}/><p className="text-sm font-semibold">Impressão digital</p></div>{status(bioOn)}</div>
      <div className="flex items-center justify-between gap-3"><span className="text-sm">Usar impressão digital</span><Switch aria-label="Usar impressão digital" disabled={!supported || busy} checked={bioOn} onCheckedChange={on => { if (!on) { setBiometricEnabled(userId, false); refresh(); } else if (record?.credential) { setBiometricEnabled(userId, true); refresh(); } else { setError(''); setAuthorize(true); } }}/></div>
      {!supported && <p className="text-xs text-muted-foreground">Abra o app instalado para usar a digital</p>}
      {record?.credential && <Button variant="ghost" className="text-destructive" onClick={() => setConfirmation('bio')}>Remover digital deste aparelho</Button>}
    </div>
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><LockKeyhole size={20}/><p className="text-sm font-semibold">PIN</p></div>{status(hasPin)}</div>
      {hasPin ? <>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void authenticate(() => newPin(record?.length ?? 4))}>Alterar PIN</Button><Button variant="ghost" disabled={busy} className="text-destructive" onClick={() => void authenticate(() => setConfirmation('pin'))}>Remover PIN</Button></div>
        <p className="text-xs text-muted-foreground">Tamanho do PIN</p>
        <div className="flex flex-wrap gap-2">{[4,5,6,7,8].map(n => <Button key={n} variant={record?.length === n ? 'default' : 'outline'} className="rounded-full" disabled={busy} onClick={() => { if (n !== record?.length) void authenticate(() => newPin(n)); }}>{n}</Button>)}</div>
      </> : <Button variant="outline" onClick={() => newPin(record?.length ?? 4)}>Criar PIN</Button>}
      {error && <p role="status" className="text-xs text-destructive">{error}</p>}
      <p className="text-sm font-medium">Aparência dos números do PIN</p>
      <div className="flex flex-wrap gap-2">{(['cards', 'numeros'] as const).map(value => <Button key={value} variant={appearance === value ? 'default' : 'outline'} aria-pressed={appearance === value} onClick={() => { savePinAppearance(userId, value); setAppearance(value); }}>{value === 'cards' ? 'Com botões' : 'Só números'}</Button>)}</div>
    </div>
    <div className="space-y-3 py-4">
      <p className="text-sm font-semibold">Estilo da tela de bloqueio</p>
      <div className="flex gap-3 overflow-x-auto pb-2">{pinThemes.map(t => <Button key={t.id} variant="ghost" aria-label={`Prévia ${t.nome}`} className="h-auto w-28 shrink-0 flex-col gap-2 p-1 hover:bg-transparent" onClick={() => { setDemo(''); setPreview(t.id); }}>
        <span data-pin-theme={t.token} className={`lock-theme-thumb ${selected === t.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`} style={t.miniatura ? { '--pin-thumbnail': `url("${t.miniatura}")` } as CSSProperties : undefined}>
          <Wallet size={24}/><span className="text-[9px] font-semibold">Meu Bolso</span><span className="text-[8px]">○ ○ ○ ○</span><span className="grid w-4/5 grid-cols-3 gap-1">{Array.from({length:12},(_,i)=><span key={i} className="pin-key-mini"/>)}</span>
        </span><span className="text-xs">{t.nome}</span>
      </Button>)}</div>
    </div>
    <div className="space-y-3 py-4"><p className="text-sm font-medium">Tempo para bloquear de novo</p><div className="flex gap-2">{([[0,'Na hora'],[60,'1 min'],[300,'5 min']] as const).map(([v,label]) => <Button key={v} variant={timeout === v ? 'default' : 'outline'} className="rounded-full" onClick={() => onTimeout(v)}>{label}</Button>)}</div></div>
    <div className="py-3"><Button variant="ghost" className="w-full text-destructive" onClick={() => setConfirmation('reset')}>Redefinir bloqueio do app</Button></div>
    <BottomSheet open={authorize} onOpenChange={setAuthorize} title="Autorizar impressão digital" description="O app usa a verificação do seu celular. Sua digital nunca é recebida nem guardada pelo app.">
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <Button className="h-12 w-full" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await enableBiometric(userId); refresh(); setAuthorize(false); } catch { setError('Não foi possível autorizar a digital. Tente novamente.'); } finally { setBusy(false); } }}>Autorizar</Button>
    </BottomSheet>
    <CriarPinSheet open={create} onOpenChange={setCreate} tamanho={length} onCriar={async pin => { await createPin(userId, pin); refresh(); }}/>
    <PedirPinSheet open={verify} onOpenChange={setVerify} tamanho={record?.length ?? 4} onVerificar={async pin => { const ok = await checkPin(userId, pin); if (ok) afterVerify(); refresh(); return ok; }}/>
    <ConfirmSheet open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }} title={confirmation === 'reset' ? 'Redefinir bloqueio do app?' : confirmation === 'bio' ? 'Remover digital deste aparelho?' : 'Remover PIN?'} description={confirmation === 'reset' ? 'O PIN e a digital serão removidos deste aparelho. Seu estilo e seus dados continuam.' : confirmation === 'bio' ? 'Para usar a digital novamente, será necessário autorizar este aparelho.' : 'A digital continua ativa, se estiver ligada.'} onConfirm={confirmAction}/>
    {preview && <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Prévia do estilo">
      <LockScreen themeId={preview} keyAppearance={appearance} tamanho={record?.length ?? 4} pin={demo} onPinChange={setDemo} onComplete={() => setTimeout(() => setDemo(''), 400)} showPin showBio preview onBio={() => {}}>
        <Button className="h-12 w-full" onClick={() => { savePinTheme(userId, preview); setSelected(preview); onTheme(preview); setPreview(null); }}>Usar este estilo</Button>
      </LockScreen>
      <Button variant="ghost" aria-label="Voltar da prévia" className="fixed left-4 top-4 z-[110] size-11 rounded-full text-brand-white hover:bg-brand-white/20 hover:text-brand-white" onClick={() => setPreview(null)}><ArrowLeft/></Button>
    </div>}
  </>;
}
