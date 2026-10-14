import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { deveLembrar, agoraNoFuso } from "@/lib/budget";

const TURNOS = ["manha", "tarde", "noite"] as const;

export const Route = createFileRoute("/api/public/push-lembrete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enviarParaUsuario } = await import("@/lib/push.server");
        const { data: cfgs } = await supabaseAdmin.from("configuracoes").select("*").eq("notif_ativas", true);
        let enviados = 0;
        for (const c of cfgs ?? []) {
          const fuso = c.fuso_horario || c.timezone || "America/Sao_Paulo";
          for (const t of TURNOS) {
            if (!c[`lembrete_${t}`]) continue;
            const ultimo = c[`lembrete_${t}_proximo`] ? agoraNoFuso(fuso, new Date(c[`lembrete_${t}_proximo`] as string)).data : null;
            let r: ReturnType<typeof deveLembrar>;
            try { r = deveLembrar(String(c[`lembrete_${t}_horario`]).slice(0, 5), fuso, ultimo); } catch { continue; }
            if (!r.enviar) continue;
            await supabaseAdmin.from("configuracoes").update({ [`lembrete_${t}_proximo`]: new Date().toISOString() } as never).eq("user_id", c.user_id);
            enviados += await enviarParaUsuario(supabaseAdmin, c.user_id, { title: "Meu Bolso", body: "Já registrou seus gastos de hoje?", url: "/inicio", tag: `lembrete-${t}` });
          }
        }
        return Response.json({ ok: true, enviados });
      },
    },
  },
});
