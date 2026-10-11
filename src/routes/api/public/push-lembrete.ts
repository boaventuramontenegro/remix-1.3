import { createFileRoute } from "@tanstack/react-router";
import { deveLembrar } from "@/lib/budget";

export const Route = createFileRoute("/api/public/push-lembrete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_CRON_SECRET"];
        if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
