import { supabase } from "@/integrations/supabase/client";
import { obterChavePublica } from "./push.functions";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** Assina o Web Push e salva em push_subscriptions. Retorna false se o service worker não estiver ativo (prévia). */
export async function assinarPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
  if (!reg) return false;
  const { chave } = await obterChavePublica();
  if (!chave) return false;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(chave) }));
  const j = sub.toJSON();
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ endpoint: sub.endpoint, keys: j.keys ?? {} });
  if (error) throw error;
  return true;
}

export async function cancelarPush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
}

/** Situação deste aparelho, em texto para o usuário. */
export async function statusPush(): Promise<{ ok: boolean; texto: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return { ok: false, texto: isIOS() && !isStandalone() ? "Instale o app na Tela de Início para receber notificações." : "Este navegador não suporta notificações." };
  if (Notification.permission === "denied") return { ok: false, texto: "Notificações bloqueadas nas configurações do navegador." };
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { ok: false, texto: "Disponível só no app publicado (a prévia não recebe notificações)." };
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: false, texto: "Este aparelho ainda não está inscrito." };
  const { data } = await supabase.from("push_subscriptions").select("id").eq("endpoint", sub.endpoint).maybeSingle();
  return data ? { ok: true, texto: "Este aparelho: inscrito ✓" } : { ok: false, texto: "Inscrição não foi salva. Desative e ative de novo." };
}
