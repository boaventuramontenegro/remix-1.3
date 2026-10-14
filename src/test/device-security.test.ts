import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPin, checkPin, readPin, pinKey, limparSeguranca } from '@/lib/device-security';
beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
describe('Real salted PIN hashing and failure protection', () => {
  it('stores a salt/hash and chosen length, not the PIN', async () => {
    await createPin('pin-test', '123456');
    expect(readPin('pin-test')?.length).toBe(6);
    expect(localStorage.getItem(pinKey('pin-test'))).not.toContain('123456');
    expect(await checkPin('pin-test', '123456')).toBe(true);
    expect(await checkPin('pin-test', '1234')).toBe(false);
  });
  it('blocks after five failures, waits 30 seconds and resets after success', async () => {
    await createPin('pin-test', '8642');
    for (let i = 0; i < 5; i++) expect(await checkPin('pin-test', '1111')).toBe(false);
    const r = readPin('pin-test');
    expect(r?.recoveryAllowed).toBe(true); expect((r?.retryAt ?? 0) - Date.now()).toBeGreaterThan(29000);
    await expect(checkPin('pin-test', '8642')).rejects.toThrow('Aguarde');
    vi.spyOn(Date, 'now').mockReturnValue((r?.retryAt ?? 0) + 1);
    expect(await checkPin('pin-test', '8642')).toBe(true); expect(readPin('pin-test')?.recoveryAllowed).toBe(false);
    vi.restoreAllMocks(); limparSeguranca('pin-test'); expect(readPin('pin-test')).toBeNull();
  });
});