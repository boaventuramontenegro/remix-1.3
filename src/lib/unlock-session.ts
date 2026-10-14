import { readPin } from './device-security';

export const UNLOCK_SESSION_MS = 3 * 60 * 1000;
export const unlockSessionKey = (userId: string) => `meubolso-desbloqueio-${userId}`;
const protection = (userId: string) => {
  const r = readPin(userId);
  return r ? JSON.stringify([r.hash, r.credential, r.biometricEnabled]) : '';
};
/** Device privacy gate only; never replaces the authenticated backend session. */
export function hasUnlockSession(userId: string, now = Date.now()) {
  try {
    const raw = localStorage.getItem(unlockSessionKey(userId));
    if (!raw) return false;
    const session = JSON.parse(raw);
    return Number.isSafeInteger(session.validatedAt) && session.validatedAt > 0 &&
      now >= session.validatedAt && now - session.validatedAt < UNLOCK_SESSION_MS &&
      session.protection === protection(userId);
  } catch { return false; }
}
/** Call only after a successful PIN or WebAuthn assertion. */
export function validateUnlockSession(userId: string, now = Date.now()) {
  try { localStorage.setItem(unlockSessionKey(userId), JSON.stringify({ validatedAt: now, protection: protection(userId) })); } catch { /* Reload remains locked if storage is unavailable. */ }
}
export function clearUnlockSession(userId: string) {
  try { localStorage.removeItem(unlockSessionKey(userId)); } catch { /* fail closed on the next read */ }
}