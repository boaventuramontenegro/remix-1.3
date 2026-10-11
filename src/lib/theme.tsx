import { useEffect } from 'react';
import { usePreferences } from './preferences';
export function applyTheme(theme: string) { const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark',dark); localStorage.setItem('meubolso-tema',theme); }
export function ThemeSync() { const {config} = usePreferences(); useEffect(() => {applyTheme(config.tema); const mq=matchMedia('(prefers-color-scheme: dark)'); const cb=()=>applyTheme(config.tema); mq.addEventListener('change',cb); return ()=>mq.removeEventListener('change',cb);},[config.tema]); return null; }
export const themeInitScript = `try{var t=localStorage.getItem('meubolso-tema')||'auto';document.documentElement.classList.toggle('dark',t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){}`;
