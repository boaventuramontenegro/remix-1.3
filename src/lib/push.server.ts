import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PushMsg = { title: string; body: string; url?: string; tag?: string };

/** Envia uma notificação para todos os aparelhos do usuário e remove assinaturas expiradas (404/410). */
export async function enviarParaUsuario(db: SupabaseClient<Database>, userId: string, msg: PushMsg) {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) throw new Error("Chaves de notificação não configuradas.");
  const vapid = { subject: "mailto:contato@meubolso.app", publicKey, privateKey };
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", userId);
  let enviados = 0;
  for (const s of subs ?? []) {
    const keys = s.keys as { p256dh: string; auth: string };
    try {
      const payload = await buildPushPayload(
        { data: JSON.stringify(msg), options: { ttl: 60 * 60 * 12, urgency: "normal" } },
        { endpoint: s.endpoint, expirationTime: null, keys },
        vapid,
      );
      const res = await fetch(s.endpoint, payload);
      if (res.status === 404 || res.status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      else if (res.ok) enviados++;
      else console.error("push falhou", res.status, await res.text().catch(() => ""));
    } catch (e) {
      console.error("push erro", e);
    }
  }
  return enviados;
}
