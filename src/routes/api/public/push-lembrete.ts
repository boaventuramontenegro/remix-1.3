import { createFileRoute } from "@tanstack/react-router";
import { deveLembrar } from "@/lib/budget";

export const Route = createFileRoute("/api/public/push-lembrete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // O agendador lê o segredo de uma tabela só do servidor; comparamos com o mesmo valor.
        const provided = request.headers.get("x-cron-secret") ?? "";
        const { data: row } = await supabaseAdmin.from("app_internal").select("valor").eq("chave", "push_cron_secret").maybeSingle();
        const secret = row?.valor ?? "";
        let diff = secret.length === provided.length && secret.length > 0 ? 0 : 1;
        for (let i = 0; i < Math.min(secret.length, provided.length); i++) diff |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
        if (diff !== 0) return new Response("Unauthorized", { status: 401 });
        const { enviarParaUsuario } = await import("@/lib/push.server");
        const { data: cfgs } = await supabaseAdmin
          .from("configuracoes")
          .select("user_id, notif_horario, fuso_horario, timezone, ultimo_lembrete")
          .eq("notif_ativas", true);
        let enviados = 0;
        for (const c of cfgs ?? []) {
          const fuso = c.fuso_horario || c.timezone || "America/Sao_Paulo";
          let r: ReturnType<typeof deveLembrar>;
          try { r = deveLembrar(String(c.notif_horario).slice(0, 5), fuso, c.ultimo_lembrete); } catch { continue; }
          if (!r.enviar) continue;
          await supabaseAdmin.from("configuracoes").update({ ultimo_lembrete: r.data }).eq("user_id", c.user_id);
          enviados += await enviarParaUsuario(supabaseAdmin, c.user_id, {
            title: "Meu Bolso",
            body: "Já anotou seus gastos de hoje? Leva só um minuto. 💚",
            url: "/inicio",
            tag: "lembrete",
          });
        }
        return Response.json({ ok: true, enviados });
      },
    },
  },
});
