export type PinRecord = { salt: string; hash: string; length?: number; credential?: string; biometricEnabled?: boolean; attempts?: number; retryAt?: number; recoveryAllowed?: boolean };
export const pinKey = (userId: string) => `meubolso-pin-${userId}`;
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), v => v.toString(16).padStart(2, '0')).join('');
const empty = (): PinRecord => ({ salt: '', hash: '', length: 4 });
export function saveSecurity(userId: string, r: PinRecord) { localStorage.setItem(pinKey(userId), JSON.stringify(r)); window.dispatchEvent(new Event('meubolso-seguranca')); }
export async function pinHash(pin: string, salt: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']); return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256)); }
export async function createPin(userId: string, pin: string) { if (!/^\d{4,8}$/.test(pin)) throw Error('Informe de 4 a 8 dígitos.'); const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer); const hash = await pinHash(pin, salt); saveSecurity(userId, { ...readPin(userId), salt, hash, length: pin.length, attempts: 0, retryAt: 0, recoveryAllowed: false }); }
export function readPin(userId: string): PinRecord | null { try { const s = localStorage.getItem(pinKey(userId)); if (!s) return null; const r = JSON.parse(s) as PinRecord; return { ...r, length: [4,5,6,7,8].includes(r.length ?? 4) ? (r.length ?? 4) : 4, biometricEnabled: r.biometricEnabled ?? !!r.credential }; } catch { return null; } }
export function registerFailure(userId: string) { const r = readPin(userId) ?? empty(); if ((r.retryAt ?? 0) > Date.now()) return r; r.attempts = (r.attempts ?? 0) + 1; if (r.attempts >= 5) { r.retryAt = Date.now() + 30000; r.attempts = 0; r.recoveryAllowed = true; } saveSecurity(userId, r); return r; }
export function resetFailures(userId: string) { const r = readPin(userId); if (r) saveSecurity(userId, { ...r, attempts: 0, retryAt: 0, recoveryAllowed: false }); }
export async function checkPin(userId: string, pin: string) { const r = readPin(userId); if (!r?.hash) return false; if ((r.retryAt ?? 0) > Date.now()) throw Error('Aguarde 30 segundos antes de tentar novamente.'); const ok = pin.length === r.length && await pinHash(pin, r.salt) === r.hash; if (ok) resetFailures(userId); else registerFailure(userId); return ok; }
const randomChallenge = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
export async function enableBiometric(userId: string) { const current = readPin(userId); if (current?.credential) { setBiometricEnabled(userId, true); return; } const { startRegistration } = await import('@simplewebauthn/browser'); const id = btoa(String.fromCharCode(...new TextEncoder().encode(userId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); const response = await startRegistration({ optionsJSON: { challenge: randomChallenge(), rp: { name: 'Meu Bolso', id: location.hostname }, user: { id, name: userId, displayName: 'Meu Bolso' }, pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, attestation: 'none' } }); saveSecurity(userId, { ...(readPin(userId) ?? empty()), credential: response.id, biometricEnabled: true }); }
export function setBiometricEnabled(userId: string, on: boolean) { const r = readPin(userId); if (r?.credential) saveSecurity(userId, { ...r, biometricEnabled: on }); }
export function removePin(userId: string) { const r = readPin(userId); if (r) saveSecurity(userId, { ...r, salt: '', hash: '', attempts: 0, retryAt: 0, recoveryAllowed: false }); }
export function removeBiometric(userId: string) { const r = readPin(userId); if (!r) return; delete r.credential; r.biometricEnabled = false; saveSecurity(userId, r); }
export function limparSeguranca(userId: string) { localStorage.removeItem(pinKey(userId)); window.dispatchEvent(new Event('meubolso-seguranca')); }
export function emIframe() { try { return window.self !== window.top; } catch { return true; } }
export function bioContextUnavailable() { return emIframe() || location.hostname.startsWith('id-preview--') || location.hostname.startsWith('preview--') || location.hostname.includes('lovableproject') || location.hostname === 'localhost'; }
export async function biometriaDisponivel() { try { if (bioContextUnavailable() || typeof PublicKeyCredential === 'undefined') return false; return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; } }
export async function biometricUnlock(userId: string, signal?: AbortSignal) {
  const r = readPin(userId);
  if (!r?.credential) throw Error('Digital não autorizada.');
  if ((r.retryAt ?? 0) > Date.now()) throw Error('Aguarde 30 segundos.');
  const { startAuthentication, WebAuthnAbortService } = await import('@simplewebauthn/browser');
  if (signal?.aborted) throw Error('Verificação cancelada.');
  const cancel = () => WebAuthnAbortService.cancelCeremony();
  signal?.addEventListener('abort', cancel, { once: true });
  const challenge = randomChallenge();
  try {
    const result = await startAuthentication({ optionsJSON: { challenge, timeout: 20000, rpId: location.hostname, allowCredentials: [{ id: r.credential, type: 'public-key', transports: ['internal'] }], userVerification: 'required' } });
    if (signal?.aborted || result.id !== r.credential) throw Error('Credencial incorreta.');
    const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const client = JSON.parse(new TextDecoder().decode(decode(result.response.clientDataJSON)));
    const authenticator = decode(result.response.authenticatorData);
    const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(location.hostname)));
    if (client.type !== 'webauthn.get' || client.challenge !== challenge || client.origin !== location.origin ||
      authenticator.length < 37 || ((authenticator[32] ?? 0) & 5) !== 5 || !rpHash.every((b, i) => authenticator[i] === b)) throw Error('Verificação biométrica inválida.');
  } finally { signal?.removeEventListener('abort', cancel); }
}
