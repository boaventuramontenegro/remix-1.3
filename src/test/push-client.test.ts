import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assinarPush, statusPush } from '@/lib/push-client';
const mocks = vi.hoisted(() => ({ query: vi.fn(), auth: vi.fn(), key: vi.fn(), sub: vi.fn(), subscribe: vi.fn() }));
vi.mock('@/lib/pwa', () => ({ isRefusedContext: () => false, registerServiceWorker: () => navigator.serviceWorker.ready }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => mocks.query(), auth: { getUser: () => mocks.auth() } } }));
vi.mock('@/lib/push.functions', () => ({ obterChavePublica: () => mocks.key() }));
function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const q = { upsert: vi.fn(() => Promise.resolve(result)), select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(() => Promise.resolve(result)) };
  return q;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
  mocks.key.mockResolvedValue({ chave: btoa(String.fromCharCode(4, ...Array(64).fill(1))).replace(/=/g, '') });
  const subscription = { endpoint: 'https://push.test/device', toJSON: () => ({ keys: { p256dh: 'key', auth: 'auth' } }), options: {} };
  mocks.sub.mockResolvedValue(subscription); mocks.subscribe.mockResolvedValue(subscription);
  const reg = { active: { scriptURL: `${location.origin}/sw.js` }, scope: `${location.origin}/`, pushManager: { getSubscription: mocks.sub, subscribe: mocks.subscribe } };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), getRegistration: async () => reg } });
  vi.stubGlobal('PushManager', class {}); vi.stubGlobal('Notification', { permission: 'granted' });
});
describe('Push registration contracts (controlled API tests)', () => {
  it('reuses existing registration and confirms an owner-scoped read-back', async () => {
    const q = query({ id: 'persisted' }); mocks.query.mockReturnValue(q);
    expect(await assinarPush()).toBe(true); expect(mocks.subscribe).not.toHaveBeenCalled();
    expect(q.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user' }), { onConflict: 'endpoint' });
    expect(q.eq).toHaveBeenCalledWith('user_id', 'user'); expect((await statusPush()).ok).toBe(true);
  });
  it('subscribes a new device before persisting it', async () => {
    mocks.sub.mockResolvedValue(null); mocks.query.mockReturnValue(query({ id: 'persisted' }));
    expect(await assinarPush()).toBe(true); expect(mocks.subscribe).toHaveBeenCalledTimes(1);
  });
  it('does not claim registration if persistence fails', async () => {
    mocks.query.mockReturnValue(query(null, { code: '42501' }));
    await expect(assinarPush()).rejects.toThrow('não foi salva');
    expect((await statusPush()).ok).toBe(false);
  });
  it('rejects denied permissions without registering', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    await expect(assinarPush()).rejects.toThrow('Autorize'); expect((await statusPush()).texto).toContain('bloqueadas');
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('reports the browser subscription error without claiming registration', async () => {
    mocks.sub.mockResolvedValue(null); mocks.subscribe.mockRejectedValue(new DOMException('private details', 'AbortError'));
    await expect(assinarPush()).rejects.toThrow('AbortError');
    expect(mocks.query).not.toHaveBeenCalled();
  });
});