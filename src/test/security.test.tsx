import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasUnlockSession, validateUnlockSession, UNLOCK_SESSION_MS } from '@/lib/unlock-session';
import { SecurityGate } from '@/components/SecurityGate';

const state = vi.hoisted(() => ({ record: { salt: 'salt', hash: 'hash', length: 4, credential: 'credential', biometricEnabled: true, retryAt: 0, recoveryAllowed: false }, bio: vi.fn(), available: vi.fn(), check: vi.fn(), signout: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { id: 'test-user' }, isPending: false }), useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/lib/preferences', () => ({ accountQuery: {}, usePreferences: () => ({ config: { pin_tema: 'classico', pin_tempo_bloqueio: 0 } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: () => state.signout() } } }));
vi.mock('@/lib/device-security', () => ({ readPin: () => state.record, checkPin: (pinUser: string, pin: string) => state.check(pin), biometricUnlock: () => state.bio(), canAttemptBiometric: () => state.available(), prepareBiometric: vi.fn().mockResolvedValue({}), limparSeguranca: vi.fn(), registerFailure: vi.fn(), resetFailures: vi.fn() }));
vi.mock('@/components/LockScreen', () => ({ LockScreen: (p: { showPin: boolean; busy: boolean; message: string; onComplete: (v: string) => void; onBio: () => void; children: React.ReactNode }) => <div><p>{p.message}</p>{p.showPin && <button disabled={p.busy} onClick={() => p.onComplete('1234')}>PIN</button>}<button disabled={p.busy} onClick={p.onBio}>Digital</button>{p.children}</div> }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); state.available.mockReturnValue(true); state.bio.mockRejectedValue(Error('cancelled')); state.check.mockResolvedValue(true); state.record.retryAt = 0; state.record.recoveryAllowed = false; Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const gate = () => render(<SecurityGate><p>Financeiro privado</p></SecurityGate>);
describe('Fifteen-minute device session', () => {
  it('uses exactly fifteen minutes and rejects future/malformed timestamps', () => {
    expect(UNLOCK_SESSION_MS).toBe(900000);
    validateUnlockSession('test-user', 1000);
    expect(hasUnlockSession('test-user', 1000 + UNLOCK_SESSION_MS - 1)).toBe(true);
    expect(hasUnlockSession('test-user', 1000 + UNLOCK_SESSION_MS)).toBe(false);
    expect(hasUnlockSession('test-user', 1000 + UNLOCK_SESSION_MS + 1)).toBe(false);
    expect(hasUnlockSession('test-user', 999)).toBe(false);
  });
  it('preserves a valid session on remount without renewing it', () => {
    validateUnlockSession('test-user'); const before = localStorage.getItem('meubolso-desbloqueio-test-user');
    const view = gate(); expect(screen.getByText('Financeiro privado')).toBeInTheDocument(); view.unmount(); gate();
    expect(localStorage.getItem('meubolso-desbloqueio-test-user')).toBe(before); expect(state.bio).not.toHaveBeenCalled();
  });
  it('checks real elapsed time on focus and hides financial content after expiry', async () => {
    validateUnlockSession('test-user', Date.now() - UNLOCK_SESSION_MS + 10000); gate();
    fireEvent(window, new Event('focus')); expect(screen.getByText('Financeiro privado')).toBeInTheDocument();
    validateUnlockSession('test-user', Date.now() - UNLOCK_SESSION_MS);
    fireEvent(window, new Event('focus'));
    await screen.findByText('PIN'); expect(screen.queryByText('Financeiro privado')).not.toBeInTheDocument();
  });
  it('hides the private snapshot in background and restores before fifteen minutes without renewal', () => {
    validateUnlockSession('test-user'); const before = localStorage.getItem('meubolso-desbloqueio-test-user');
    gate(); Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByText('Financeiro privado')).not.toBeVisible();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange')); fireEvent(window, new Event('focus'));
    expect(screen.getByText('Financeiro privado')).toBeVisible();
    expect(localStorage.getItem('meubolso-desbloqueio-test-user')).toBe(before); expect(state.bio).not.toHaveBeenCalled();
  });
  it('expires during visible use at the exact deadline without focus events', () => {
    vi.useFakeTimers(); validateUnlockSession('test-user'); gate();
    act(() => vi.advanceTimersByTime(UNLOCK_SESSION_MS - 1));
    expect(screen.getByText('Financeiro privado')).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Financeiro privado')).not.toBeInTheDocument();
  });
  it('rejects an expired session on reload instead of briefly rendering private data', () => {
    validateUnlockSession('test-user', Date.now() - UNLOCK_SESSION_MS);
    gate(); expect(screen.queryByText('Financeiro privado')).not.toBeInTheDocument();
  });
  it.each([899999, 900000, 900001])('checks background return after %i ms without extending the original timestamp', elapsed => {
    vi.useFakeTimers(); validateUnlockSession('test-user');
    const original = localStorage.getItem('meubolso-desbloqueio-test-user');
    gate(); Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(elapsed));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    if (elapsed < 900000) {
      expect(screen.getByText('Financeiro privado')).toBeVisible();
      expect(localStorage.getItem('meubolso-desbloqueio-test-user')).toBe(original);
    } else expect(screen.queryByText('Financeiro privado')).not.toBeInTheDocument();
  });
});
describe('Biometric fallback', () => {
  it.each(['cancelled', 'failed', 'unavailable'])('makes PIN immediately usable after %s', async kind => {
    if (kind === 'unavailable') state.available.mockReturnValue(false);
    gate(); const pin = await screen.findByText('PIN'); await waitFor(() => expect(pin).not.toBeDisabled());
    fireEvent.click(pin); await screen.findByText('Financeiro privado'); expect(hasUnlockSession('test-user')).toBe(true);
  });
  it('only unlocks after biometric success and avoids duplicate focus prompts', async () => {
    let resolve: (() => void) | undefined;
    state.bio.mockImplementation(() => new Promise<void>(r => { resolve = r; })); gate();
    await waitFor(() => expect(state.bio).toHaveBeenCalledTimes(1));
    fireEvent(window, new Event('focus')); fireEvent(document, new Event('visibilitychange'));
    expect(state.bio).toHaveBeenCalledTimes(1); expect(screen.queryByText('Financeiro privado')).not.toBeInTheDocument();
    await act(async () => resolve?.()); await screen.findByText('Financeiro privado');
  });
  it('starts biometric authentication immediately after the lock is ready, without a delay timer', () => {
    state.bio.mockImplementation(() => new Promise(() => {}));
    gate(); expect(state.bio).toHaveBeenCalledTimes(1);
    fireEvent(window, new Event('focus')); expect(state.bio).toHaveBeenCalledTimes(1);
  });
  it('starts once when a hidden initial tab first becomes visible', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    gate(); expect(state.bio).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByText('PIN'); expect(state.bio).toHaveBeenCalledTimes(1);
    fireEvent(document, new Event('visibilitychange')); expect(state.bio).toHaveBeenCalledTimes(1);
  });
  it('keeps PIN available after an incorrect entry', async () => {
    state.check.mockResolvedValue(false); gate(); fireEvent.click(await screen.findByText('PIN'));
    await screen.findByText('PIN incorreto.'); expect(screen.queryByText('Financeiro privado')).not.toBeInTheDocument();
  });
  it('exposes recovery only after the existing cooldown finishes', async () => {
    state.record.recoveryAllowed = true; state.record.retryAt = Date.now() + 100;
    gate(); expect(screen.queryByText('Entrar com e-mail e senha')).not.toBeInTheDocument();
    await screen.findByText('Entrar com e-mail e senha');
  });
});