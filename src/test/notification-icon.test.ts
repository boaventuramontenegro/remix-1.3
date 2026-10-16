import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('Notification badge only, preserving delivery and navigation', () => {
  it('uses the dedicated transparent badge without changing the main app icon', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const worker = readFileSync(new URL('../../public/push-sw.js', import.meta.url), 'utf8');
    vm.runInNewContext(worker, { self: { addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; }, registration: { showNotification } } });
    let delivery: Promise<unknown> | undefined;
    handlers['push']?.({ data: { json: () => ({ title: 'Meu Bolso', body: 'Teste', tag: 'teste', url: '/inicio' }) }, waitUntil: (promise: Promise<unknown>) => { delivery = promise; } });
    await delivery;
    expect(showNotification).toHaveBeenCalledWith('Meu Bolso', {
      body: 'Teste', icon: '/icons/icon-192.png', badge: '/icons/notification-wallet-v1.png', tag: 'teste', data: { url: '/inicio' },
    });
    expect(handlers['notificationclick']).toBeTypeOf('function');
    const badge = readFileSync(new URL('../../public/icons/notification-wallet-v1.png', import.meta.url));
    expect(badge.subarray(1, 4).toString()).toBe('PNG');
    expect(badge.readUInt32BE(16)).toBe(96);
    expect(badge.readUInt32BE(20)).toBe(96);
    expect(badge[25]).toBe(6); // PNG RGBA, not an opaque RGB image.
  });
});