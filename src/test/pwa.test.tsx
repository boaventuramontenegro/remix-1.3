import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureInstallPrompt, useInstallPrompt, registerServiceWorker } from '@/lib/pwa';
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function Install() { const { canInstall, install } = useInstallPrompt(); return <button disabled={!canInstall} onClick={() => void install()}>Instalar</button>; }
describe('PWA lifecycle contracts', () => {
  it('retains an install event received before the menu mounts', async () => {
    captureInstallPrompt(); const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    render(<Install />); expect(screen.getByText('Instalar')).not.toBeDisabled();
    await act(async () => fireEvent.click(screen.getByText('Instalar')));
    expect(prompt).toHaveBeenCalledTimes(1); expect(screen.getByText('Instalar')).toBeDisabled();
  });
  it('waits for a valid activated worker and rejects failed installation without a fake active state', async () => {
    vi.stubEnv('PROD', true);
    const worker = Object.assign(new EventTarget(), { state: 'installing', scriptURL: `${location.origin}/sw.js` });
    const reg = Object.assign(new EventTarget(), { active: null, installing: worker, scope: `${location.origin}/` });
    const register = vi.fn().mockResolvedValue(reg);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    const result = registerServiceWorker();
    await vi.waitFor(() => expect(register).toHaveBeenCalled());
    worker.state = 'redundant'; worker.dispatchEvent(new Event('statechange'));
    await expect(result).rejects.toThrow('WorkerInstallFailed');
  });
  it('can retry after installation failure and returns a real activated registration', async () => {
    vi.stubEnv('PROD', true);
    const reg = Object.assign(new EventTarget(), { active: { state: 'activated', scriptURL: `${location.origin}/sw.js` }, scope: `${location.origin}/` });
    const register = vi.fn().mockResolvedValue(reg);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    expect(await registerServiceWorker()).toBe(reg);
  });
});