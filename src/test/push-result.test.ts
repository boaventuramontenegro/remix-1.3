import { describe, expect, it } from 'vitest';
import { subscriptionExpired, pushReportMessage } from '@/lib/push-result';
import { deveLembrar } from '@/lib/budget';
import { applyLockBars, restoreAppBars, pinThemes, BRAND_BAR_COLOR } from '@/lib/pinThemes';
describe('Push delivery and reminders', () => {
  it('only removes 404/410, preserving 401/403 and valid subscriptions', () => {
    expect(subscriptionExpired(404)).toBe(true); expect(subscriptionExpired(410)).toBe(true);
    for (const n of [201, 401, 403, 500]) expect(subscriptionExpired(n)).toBe(false);
  });
  it('reports missing subscriptions separately from rejected delivery', () => {
    expect(pushReportMessage({ inscritos: 0, enviados: 0, expirados: 0, falhas: 0, status: [] })).toContain('Nenhum aparelho');
    expect(pushReportMessage({ inscritos: 1, enviados: 0, expirados: 0, falhas: 1, status: [403] })).toContain('HTTP 403');
  });
  it('uses the user timezone and never repeats a daily reminder', () => {
    const now = new Date('2026-10-14T12:15:00Z');
    expect(deveLembrar('09:00', 'America/Sao_Paulo', null, now).enviar).toBe(true);
    expect(deveLembrar('09:00', 'America/Sao_Paulo', '2026-10-14', now).enviar).toBe(false);
    expect(deveLembrar('14:00', 'America/Sao_Paulo', null, now).enviar).toBe(false);
  });
});
describe('Lock bar colors', () => {
  it.each(pinThemes.map(t => t.id))('applies %s and restores only on unlock', id => {
    document.head.innerHTML = '<meta name="theme-color" content="old">';
    const theme = pinThemes.find(t => t.id === id); applyLockBars(id);
    expect(document.querySelector('meta')?.content).toBe(theme?.statusBarColor);
    expect(document.documentElement.style.getPropertyValue('--system-bar-bottom')).toBe(theme?.navBarColor);
    restoreAppBars(); expect(document.querySelector('meta')?.content).toBe(BRAND_BAR_COLOR);
    expect(document.documentElement.hasAttribute('data-lock-bars')).toBe(false);
  });
});