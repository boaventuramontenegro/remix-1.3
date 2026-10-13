import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { Fingerprint } from 'lucide-react';
import { Logo } from './Logo';
import { BolinhasPin, TecladoPin } from './PinPad';
import { Button } from './ui/button';
import { getPinTheme } from '@/lib/pinThemes';

export function LockScreen({ themeId, tamanho = 4, pin, onPinChange, onComplete, showPin, showBio, onBio, busy, tremor, message, children }: {
  themeId: string; tamanho?: number; pin: string; onPinChange: (v: string) => void; onComplete?: (v: string) => void;
  showPin: boolean; showBio: boolean; onBio?: () => void; busy?: boolean; tremor?: boolean; message?: string; children?: ReactNode;
}) {
  const theme = getPinTheme(themeId);
  const [loadedImage, setLoadedImage] = useState<string>();
  useEffect(() => {
    if (!theme?.fundo) return;
    let active = true;
    const img = new Image();
    img.onload = () => { if (active) setLoadedImage(theme.fundo); };
    img.src = theme.fundo;
    return () => { active = false; };
  }, [theme?.fundo]);
  const vars = { '--pin-overlay': theme?.escurecimento ?? 0, ...(theme?.fundo && loadedImage === theme.fundo ? { '--pin-wallpaper': `url("${theme.fundo}")` } : {}) } as CSSProperties;
  return <div className="lock-screen" data-pin-theme={theme?.token} style={vars}>
    <div className="lock-content">
      <Logo variante="claro" tamanho="lg" className="lock-logo" />
      <h1 className="lock-title">Desbloquear Meu Bolso</h1>
      {showBio && <div className="flex flex-col items-center gap-3">
        <Button variant="ghost" aria-label="Usar impressão digital" disabled={busy} className={`lock-fingerprint ${showPin ? 'lock-fingerprint-small' : 'motion-safe:animate-pulse'}`} onClick={onBio}>
          <Fingerprint className={showPin ? 'size-8' : 'size-14'} strokeWidth={1.4} />
        </Button>
        {!showPin && <p className="lock-hint">{message || 'Toque para usar a digital'}</p>}
      </div>}
      {showPin && <div className="lock-pin motion-safe:animate-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-300">
        {message && <p className="lock-hint text-center">{message}</p>}
        <BolinhasPin quantas={pin.length} tamanho={tamanho} dark tremor={tremor} themed />
        <TecladoPin valor={pin} onChange={onPinChange} onDigits={onComplete} tamanho={tamanho} disabled={busy} dark themed />
      </div>}
      {children}
    </div>
  </div>;
}