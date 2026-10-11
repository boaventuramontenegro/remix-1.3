import { useEffect, useSyncExternalStore } from 'react';
import { usePreferences } from './preferences';
const temaListeners = new Set<() => void>();
if (typeof document !== 'undefined') new MutationObserver(() => temaListeners.forEach((l) => l())).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
const temaAtual = (): 'light' | 'dark' => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light');
/** Tema resolvido ('light' | 'dark'), reativo a mudanças — usado pelo Toaster global. */
export function useTemaResolvido() { return useSyncExternalStore((l) => { temaListeners.add(l); return () => { temaListeners.delete(l); }; }, temaAtual, () => 'light' as const); }
export function applyTheme(theme: string) { const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark',dark); localStorage.setItem('meubolso-tema',theme); }
export function ThemeSync() { const {config} = usePreferences(); useEffect(() => {applyTheme(config.tema); const mq=matchMedia('(prefers-color-scheme: dark)'); const cb=()=>applyTheme(config.tema); mq.addEventListener('change',cb); return ()=>mq.removeEventListener('change',cb);},[config.tema]); return null; }
export const themeInitScript = `try{var t=localStorage.getItem('meubolso-tema')||'auto';document.documentElement.classList.toggle('dark',t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){}`;
