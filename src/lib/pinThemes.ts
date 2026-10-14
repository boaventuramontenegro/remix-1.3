export type PinTheme = {
  id: string; nome: string; tipo: 'padrao' | 'neutro' | 'wallpaper';
  token: string; fundo?: string; miniatura?: string; escurecimento: number;
  /** Cores das barras do sistema (Android) enquanto a tela de bloqueio está visível. */
  statusBarColor: string; navBarColor: string;
};
export const BRAND_BAR_COLOR = '#0F5A3A';
/** Visual values live in global semantic tokens; each registry entry selects a complete token set. */
export const pinThemes: PinTheme[] = [
  { id: 'classico', nome: 'Clássico', tipo: 'padrao', token: 'classico', escurecimento: 0, statusBarColor: BRAND_BAR_COLOR, navBarColor: BRAND_BAR_COLOR },
  { id: 'galaxia', nome: 'Galáxia', tipo: 'wallpaper', token: 'galaxia', fundo: '/pin/galaxia.webp', miniatura: '/pin/galaxia-thumb.webp', escurecimento: 0.3, statusBarColor: '#230d30', navBarColor: '#0d0b1d' },
  { id: 'por-do-sol', nome: 'Pôr do Sol', tipo: 'neutro', token: 'por-do-sol', escurecimento: 0, statusBarColor: '#FB923C', navBarColor: '#7C3AED' },
];
export const getPinTheme = (id?: string | null) => pinThemes.find(t => t.id === id) ?? pinThemes[0];
export const themeKey = (userId: string) => `meubolso-pin-tema-${userId}`;
/** Chaves globais não sensíveis lidas pelo script inline antes do React (só estilo e se o bloqueio está ativo). */
export const LOCK_GLOBAL_THEME = 'meubolso-lock-estilo';
export const LOCK_GLOBAL_ACTIVE = 'meubolso-lock-ativo';
export function readPinTheme(userId: string, fallback = 'classico') { return getPinTheme(localStorage.getItem(themeKey(userId)) ?? fallback)?.id ?? 'classico'; }
export function savePinTheme(userId: string, id: string) { const v = getPinTheme(id)?.id ?? 'classico'; localStorage.setItem(themeKey(userId), v); localStorage.setItem(LOCK_GLOBAL_THEME, v); window.dispatchEvent(new Event('meubolso-pin-tema')); }
export function setLockGlobals(active: boolean, themeId: string) { try { localStorage.setItem(LOCK_GLOBAL_ACTIVE, active ? '1' : '0'); localStorage.setItem(LOCK_GLOBAL_THEME, themeId); } catch { /* ignore */ } }
export function setThemeColor(color: string) {
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  m.content = color;
}
const barMap = Object.fromEntries(pinThemes.map(t => [t.id, t.statusBarColor]));
/** Roda antes do React: pinta a barra com a cor do estilo quando o bloqueio está ativo. */
export const lockThemeColorInitScript = `try{if(localStorage.getItem('${LOCK_GLOBAL_ACTIVE}')==='1'){var c=${JSON.stringify(barMap)}[localStorage.getItem('${LOCK_GLOBAL_THEME}')||'classico'];if(c){var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=c;}}}catch(e){}`;
