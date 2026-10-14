import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getVapidKeys } from "./vapid.server";
import { subscriptionExpired, type PushReport } from './push-result';

export type PushMsg = { title: string; body: string; url?: string; tag?: string };

/** Envia uma notificação para todos os aparelhos do usuário e remove assinaturas expiradas (404/410). */
export async function enviarRelatorioPush(db: SupabaseClient<Database>, userId: string, msg: PushMsg): Promise<PushReport> {
  const { publicKey, privateKey } = await getVapidKeys();
  const vapid = { subject: "mailto:contato@meubolso.app", publicKey, privateKey };
  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", userId);
  if (error) throw Error('Não foi possível consultar os aparelhos inscritos.');
  const report: PushReport = { inscritos: subs?.length ?? 0, enviados: 0, expirados: 0, falhas: 0, status: [] };
  for (const s of subs ?? []) {
    const keys = s.keys as { p256dh: string; auth: string };
    try {
      const payload = await buildPushPayload(
        { data: JSON.stringify(msg), options: { ttl: 60 * 60 * 12, urgency: "normal" } },
        { endpoint: s.endpoint, expirationTime: null, keys },
        vapid,
      );
      const res = await fetch(s.endpoint, payload);
      if (subscriptionExpired(res.status)) {
        report.expirados++;
        const { error: removeError } = await db.from("push_subscriptions").delete().eq("id", s.id);
        if (removeError) console.error('push: remoção de inscrição expirada falhou');
      } else if (res.ok) report.enviados++;
      else { report.falhas++; if (!report.status.includes(res.status)) report.status.push(res.status); console.error('push: envio recusado', res.status); }
      await res.body?.cancel();
    } catch {
      report.falhas++; console.error('push: erro de transporte ou assinatura');
    }
  }
  return report;
}
export async function enviarParaUsuario(db: SupabaseClient<Database>, userId: string, msg: PushMsg) {
  return (await enviarRelatorioPush(db, userId, msg)).enviados;
}
