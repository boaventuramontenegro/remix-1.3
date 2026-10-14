import { supabase } from "@/integrations/supabase/client";
import { obterChavePublica } from "./push.functions";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** Assina o Web Push e salva em push_subscriptions. Retorna false se o service worker não estiver ativo (prévia). */
async function appRegistration() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw Error(isIOS() && !isStandalone() ? "Instale o app na Tela de Início para receber notificações." : "Este navegador não suporta notificações.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>(r => { timer = setTimeout(() => r(null), 8000); })]);
    if (!reg?.active || new URL(reg.scope).origin !== location.origin || new URL(reg.active.scriptURL).pathname !== '/sw.js') throw Error("Não há serviço de notificações ativo neste aparelho. Abra o app publicado e tente novamente.");
    return reg;
  } finally { clearTimeout(timer); }
}
export async function assinarPush(): Promise<boolean> {
  if (!("Notification" in window)) throw Error('Este navegador não suporta notificações.');
  if (Notification.permission !== 'granted') throw Error('Autorize as notificações nas configurações do navegador.');
  const reg = await appRegistration();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw Error('Entre novamente para inscrever este aparelho.');
  const { chave } = await obterChavePublica();
  const key = b64ToBytes(chave);
  if (key.length !== 65 || key[0] !== 4) throw Error('Não foi possível obter uma chave de notificações válida.');
  let sub = await reg.pushManager.getSubscription();
  if (sub?.options.applicationServerKey) {
    const existing = new Uint8Array(sub.options.applicationServerKey);
    if (existing.length !== key.length || !existing.every((v, i) => key[i] === v)) {
      // Only replace this device's incompatible subscription, never other valid rows.
      const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', sub.endpoint);
      if (error) throw Error('Não foi possível atualizar a inscrição deste aparelho.');
      await sub.unsubscribe(); sub = null;
    }
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const j = sub.toJSON();
  if (!j.keys?.['p256dh'] || !j.keys?.['auth']) throw Error('O navegador não entregou uma inscrição válida.');
  const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: sub.endpoint, keys: j.keys }, { onConflict: 'endpoint' });
  if (error) throw Error('A inscrição não foi salva no servidor. Tente ativar novamente.');
  const { data, error: readError } = await supabase.from('push_subscriptions').select('id').eq('user_id', user.id).eq('endpoint', sub.endpoint).maybeSingle();
  if (readError || !data) throw Error('Não foi possível confirmar a inscrição salva. Tente novamente.');
  return true;
}

export async function cancelarPush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    if (error) throw Error('Não foi possível remover a inscrição no servidor. Tente novamente.');
    if (!(await sub.unsubscribe())) throw Error('Não foi possível desativar as notificações neste aparelho.');
  }
}

export async function statusPush(): Promise<{ ok: boolean; texto: string }> {
  if (typeof window === 'undefined') return { ok: false, texto: '' };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { ok: false, texto: isIOS() && !isStandalone() ? "Instale o app na Tela de Início para receber notificações." : "Este navegador não suporta notificações." };
  if (Notification.permission === 'denied') return { ok: false, texto: "Notificações bloqueadas nas configurações do navegador." };
  if (Notification.permission !== 'granted') return { ok: false, texto: 'Autorize as notificações para inscrever este aparelho.' };
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active || new URL(reg.active.scriptURL).pathname !== '/sw.js') return { ok: false, texto: "Disponível só no app publicado (a prévia não recebe notificações)." };
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: false, texto: "Este aparelho ainda não está inscrito. Ative novamente para tentar." };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, texto: 'Entre novamente para verificar a inscrição.' };
  const { data, error } = await supabase.from('push_subscriptions').select('id').eq('user_id', user.id).eq('endpoint', sub.endpoint).maybeSingle();
  if (error) return { ok: false, texto: 'Não foi possível consultar a inscrição no servidor. Tente novamente.' };
  return data ? { ok: true, texto: "Este aparelho: inscrito ✓" } : { ok: false, texto: "Inscrição não foi salva. Ative novamente para tentar." };
}
