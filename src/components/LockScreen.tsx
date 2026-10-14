import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { Fingerprint } from 'lucide-react';
import { Logo } from './Logo';
import { BolinhasPin, TecladoPin } from './PinPad';
import { Button } from './ui/button';
import { getPinTheme, applyLockBars, restoreAppBars } from '@/lib/pinThemes';

/** Estados: 'bio' (só logo, painel do sistema aberto), 'bio-falhou' (ícone pequeno embaixo), 'pin' (bolinhas + teclado). */
export function LockScreen({ themeId, tamanho = 4, pin, onPinChange, onComplete, showPin, showBio, bioFailed, onBio, busy, tremor, message, preview, children }: {
  themeId: string; tamanho?: number; pin: string; onPinChange: (v: string) => void; onComplete?: (v: string) => void;
  showPin: boolean; showBio: boolean; bioFailed?: boolean; onBio?: () => void; busy?: boolean; tremor?: boolean; message?: string; preview?: boolean; children?: ReactNode;
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
  useEffect(() => {
    if (preview) return;
    applyLockBars(themeId);
    // Router head updates must not restore the green color while locked.
    const observer = new MutationObserver(() => {
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (Array.from(metas).some(m => m.content !== theme.statusBarColor)) applyLockBars(themeId);
    });
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
    return () => { observer.disconnect(); restoreAppBars(); };
  }, [themeId, theme.statusBarColor, preview]);
  const vars = { '--pin-overlay': theme?.escurecimento ?? 0, ...(theme?.fundo && loadedImage === theme.fundo ? { '--pin-wallpaper': `url("${theme.fundo}")` } : {}) } as CSSProperties;
  return <div className="lock-screen" data-app-ready data-pin-theme={theme?.token} style={vars}>
    <div className="lock-content">
      <Logo variante="claro" tamanho="lg" className="lock-logo" />
      <div className="lock-body">
        {showPin && <div className="lock-pin motion-safe:animate-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-300">
          <p className="lock-hint text-center min-h-5" aria-live="polite">{message}</p>
          <BolinhasPin quantas={pin.length} tamanho={tamanho} dark tremor={!!tremor} themed />
          <div className={busy ? 'w-full opacity-50 transition-opacity' : 'w-full transition-opacity'}>
            <TecladoPin valor={pin} onChange={onPinChange} {...(onComplete ? { onDigits: onComplete } : {})} tamanho={tamanho} disabled={!!busy} dark themed {...(showBio && onBio ? { bioKey: onBio } : {})} />
          </div>
        </div>}
        {!showPin && showBio && bioFailed && <div className="flex flex-col items-center gap-3">
          {message && <p className="lock-hint text-center" aria-live="polite">{message}</p>}
          <Button variant="ghost" aria-label="Usar impressão digital" disabled={busy} className="pin-key lock-bio-key" onClick={onBio}><Fingerprint className="size-7" /></Button>
        </div>}
      </div>
      {children}
    </div>
  </div>;
}
