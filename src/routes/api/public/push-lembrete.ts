import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { deveLembrar, agoraNoFuso } from "@/lib/budget";
import type { Database } from '@/integrations/supabase/types';

const TURNOS = ["manha", "tarde", "noite"] as const;

export const Route = createFileRoute("/api/public/push-lembrete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enviarRelatorioPush } = await import("@/lib/push.server");
        const { data: cfgs, error: configError } = await supabaseAdmin.from("configuracoes").select("*").eq("notif_ativas", true);
        if (configError) { console.error('lembretes: consulta falhou'); return Response.json({ ok: false }, { status: 500 }); }
        let enviados = 0;
        let falhas = 0;
        for (const c of cfgs ?? []) {
          const fuso = c.fuso_horario || c.timezone || "America/Sao_Paulo";
          for (const t of TURNOS) {
            if (!c[`lembrete_${t}`]) continue;
            const ultimo = c[`lembrete_${t}_proximo`] ? agoraNoFuso(fuso, new Date(c[`lembrete_${t}_proximo`] as string)).data : null;
            let r: ReturnType<typeof deveLembrar>;
            try { r = deveLembrar(String(c[`lembrete_${t}_horario`]).slice(0, 5), fuso, ultimo); } catch { continue; }
            if (!r.enviar) continue;
            const field = `lembrete_${t}_proximo` as const;
            const patch: Database['public']['Tables']['configuracoes']['Update'] = {};
            patch[field] = new Date().toISOString();
            let claim = supabaseAdmin.from('configuracoes').update(patch).eq('user_id', c.user_id).eq('notif_ativas', true).eq(`lembrete_${t}`, true).eq(`lembrete_${t}_horario`, c[`lembrete_${t}_horario`]);
            const previous = c[field];
            claim = previous ? claim.eq(field, previous) : claim.is(field, null);
            const { data: claimed, error: claimError } = await claim.select('user_id');
            if (claimError) { falhas++; console.error('lembretes: reserva falhou', t); continue; }
            if (!claimed?.length) continue; // another invocation already claimed this window
            try {
              const report = await enviarRelatorioPush(supabaseAdmin, c.user_id, { title: 'Meu Bolso', body: 'Já registrou seus gastos de hoje?', url: '/inicio', tag: `lembrete-${t}-${r.data}` });
              enviados += report.enviados; falhas += report.falhas;
              if (!report.inscritos) console.info('lembretes: nenhum aparelho inscrito', t);
            } catch { falhas++; console.error('lembretes: envio falhou', t); }
          }
        }
        return Response.json({ ok: true, enviados, falhas });
      },
    },
  },
});
