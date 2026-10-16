import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STARTUP_MIN_MS, startupScript } from '@/lib/startup';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0));
  document.body.innerHTML = '<div id="meubolso-startup"><div id="meubolso-startup-error" hidden></div></div>';
  delete document.documentElement.dataset['appBooted'];
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = ''; });
const ready = async () => { const content = document.createElement('div'); content.dataset['appReady'] = ''; document.body.appendChild(content); await Promise.resolve(); };
const run = () => new Function(startupScript)();

describe('Startup minimum without delaying app initialization', () => {
  it('keeps the shell until two seconds even when immediately ready', async () => {
    expect(STARTUP_MIN_MS).toBe(2000); await ready(); run();
    vi.advanceTimersByTime(1999); expect(document.getElementById('meubolso-startup')).not.toBeNull();
    vi.advanceTimersByTime(2); expect(document.getElementById('meubolso-startup')).toBeNull();
  });
  it('waits beyond the minimum for the real interface', async () => {
    run(); vi.advanceTimersByTime(5000); expect(document.getElementById('meubolso-startup')).not.toBeNull();
    await ready(); vi.advanceTimersByTime(1); expect(document.getElementById('meubolso-startup')).toBeNull();
  });
  it('does not reveal an interface that became unready during the minimum', async () => {
    await ready(); run(); document.querySelector('[data-app-ready]')?.remove();
    vi.advanceTimersByTime(2001); expect(document.getElementById('meubolso-startup')).not.toBeNull();
    await ready(); vi.advanceTimersByTime(1); expect(document.getElementById('meubolso-startup')).toBeNull();
  });
  it('offers retry after stalled initialization and can still finish afterwards', async () => {
    run(); vi.advanceTimersByTime(20000);
    expect(document.getElementById('meubolso-startup-error')?.hidden).toBe(false);
    await ready(); vi.advanceTimersByTime(1); expect(document.getElementById('meubolso-startup')).toBeNull();
  });
});