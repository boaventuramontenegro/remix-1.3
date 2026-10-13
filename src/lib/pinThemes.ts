export type PinTheme = {
  id: string; nome: string; tipo: 'padrao' | 'neutro' | 'wallpaper';
  token: string; fundo?: string; miniatura?: string; escurecimento: number;
};
/** Visual values live in global semantic tokens; each registry entry selects a complete token set. */
export const pinThemes: PinTheme[] = [
  { id: 'classico', nome: 'Clássico', tipo: 'padrao', token: 'classico', escurecimento: 0 },
  { id: 'galaxia', nome: 'Galáxia', tipo: 'wallpaper', token: 'galaxia', fundo: '/pin/galaxia.webp', miniatura: '/pin/galaxia-thumb.webp', escurecimento: 0.3 },
  { id: 'por-do-sol', nome: 'Pôr do Sol', tipo: 'neutro', token: 'por-do-sol', escurecimento: 0 },
];
export const getPinTheme = (id?: string | null) => pinThemes.find(t => t.id === id) ?? pinThemes[0];
export const themeKey = (userId: string) => `meubolso-pin-tema-${userId}`;
export function readPinTheme(userId: string, fallback = 'classico') { return getPinTheme(localStorage.getItem(themeKey(userId)) ?? fallback)?.id ?? 'classico'; }
export function savePinTheme(userId: string, id: string) { localStorage.setItem(themeKey(userId), getPinTheme(id)?.id ?? 'classico'); window.dispatchEvent(new Event('meubolso-pin-tema')); }