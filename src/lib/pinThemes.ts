export type PinTheme = {
  id: string; nome: string; tipo: 'padrao' | 'neutro' | 'wallpaper';
  token: string; fundo?: string; miniatura?: string; escurecimento: number;
  /** Cores das barras do sistema (Android) enquanto a tela de bloqueio está visível. */
  statusBarColor: string; navBarColor: string;
};
export const BRAND_BAR_COLOR = '#0F5A3A';
const lockBackgrounds: Record<string, string> = { classico: 'var(--hero-gradient)', galaxia: 'linear-gradient(var(--pin-system-shade), var(--pin-system-shade)), url("/pin/galaxia.webp")', 'por-do-sol': 'var(--pin-sunset-gradient)' };
/** Visual values live in global semantic tokens; each registry entry selects a complete token set. */
export const pinThemes: PinTheme[] = [
  { id: 'classico', nome: 'Clássico', tipo: 'padrao', token: 'classico', escurecimento: 0, statusBarColor: BRAND_BAR_COLOR, navBarColor: BRAND_BAR_COLOR },
  { id: 'galaxia', nome: 'Galáxia', tipo: 'wallpaper', token: 'galaxia', fundo: '/pin/galaxia.webp', miniatura: '/pin/galaxia-thumb.webp', escurecimento: 0.3, statusBarColor: '#230d30', navBarColor: '#0d0b1d' },
  { id: 'por-do-sol', nome: 'Pôr do Sol', tipo: 'neutro', token: 'por-do-sol', escurecimento: 0, statusBarColor: '#FB923C', navBarColor: '#7C3AED' },
];
export const getPinTheme = (id?: string | null): PinTheme => pinThemes.find(t => t.id === id) ?? { id: 'classico', nome: 'Clássico', tipo: 'padrao', token: 'classico', escurecimento: 0, statusBarColor: BRAND_BAR_COLOR, navBarColor: BRAND_BAR_COLOR };
export const themeKey = (userId: string) => `meubolso-pin-tema-${userId}`;
/** Chaves globais não sensíveis lidas pelo script inline antes do React (só estilo e se o bloqueio está ativo). */
export const LOCK_GLOBAL_THEME = 'meubolso-lock-estilo';
export const LOCK_GLOBAL_ACTIVE = 'meubolso-lock-ativo';
export function readPinTheme(userId: string, fallback = 'classico') { return getPinTheme(localStorage.getItem(themeKey(userId)) ?? fallback)?.id ?? 'classico'; }
export function savePinTheme(userId: string, id: string) { const v = getPinTheme(id)?.id ?? 'classico'; localStorage.setItem(themeKey(userId), v); localStorage.setItem(LOCK_GLOBAL_THEME, v); window.dispatchEvent(new Event('meubolso-pin-tema')); }
export function setLockGlobals(active: boolean, themeId: string) { try { localStorage.setItem(LOCK_GLOBAL_ACTIVE, active ? '1' : '0'); localStorage.setItem(LOCK_GLOBAL_THEME, themeId); } catch { /* ignore */ } if (!active && typeof document !== 'undefined') restoreAppBars(); }
export function setThemeColor(color: string) {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (!metas.length) { const m = document.createElement('meta'); m.name = 'theme-color'; m.content = color; document.head.appendChild(m); }
  else metas.forEach(m => { m.content = color; });
}
export function restoreAppBars() {
  delete document.documentElement.dataset['lockBars'];
  document.documentElement.style.removeProperty('--system-bar-bottom');
  document.documentElement.style.removeProperty('--system-lock-background');
  setThemeColor(BRAND_BAR_COLOR);
}
export function applyLockBars(themeId: string) {
  const theme = getPinTheme(themeId);
  document.documentElement.dataset['lockBars'] = theme.token;
  document.documentElement.style.setProperty('--system-bar-bottom', theme.navBarColor);
  // Paint the real document canvas into any area Chrome exposes edge-to-edge.
  // Native Android bars outside that canvas can only receive an opaque theme color.
  document.documentElement.style.setProperty('--system-lock-background', lockBackgrounds[theme.id] ?? 'var(--hero-gradient)');
  setThemeColor(theme.statusBarColor);
}
const barMap = Object.fromEntries(pinThemes.map(t => [t.id, t.statusBarColor]));
/** Roda antes do React: pinta a barra com a cor do estilo quando o bloqueio está ativo. */
export const lockThemeColorInitScript = `try{if(localStorage.getItem('${LOCK_GLOBAL_ACTIVE}')==='1'&&location.pathname!=='/auth'){var id=localStorage.getItem('${LOCK_GLOBAL_THEME}')||'classico';var c=${JSON.stringify(barMap)}[id];if(c){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=c});document.documentElement.dataset.lockBars=id;document.documentElement.style.setProperty('--system-bar-bottom',${JSON.stringify(Object.fromEntries(pinThemes.map(t => [t.id, t.navBarColor])))}[id]);document.documentElement.style.setProperty('--system-lock-background',${JSON.stringify(lockBackgrounds)}[id]);}}}catch(e){}`;
