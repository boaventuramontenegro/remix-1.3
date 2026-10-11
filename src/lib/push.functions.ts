import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enviarParaUsuario } from "./push.server";
import { inicioMesFinanceiro } from "./budget";

export const obterChavePublica = createServerFn({ method: "GET" }).handler(async () => {
  const { getVapidKeys } = await import("./vapid.server");
  return { chave: (await getVapidKeys()).publicKey };
});

export const enviarTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const n = await enviarParaUsuario(context.supabase, context.userId, {
      title: "Meu Bolso",
      body: "Notificação de teste: está tudo funcionando! 🎉",
      url: "/inicio",
      tag: "teste",
    });
    return { enviados: n };
  });

/** Depois de salvar um gasto: se a categoria cruzou 80% do orçamento do mês, avisa (1x por categoria/mês). */
export const verificarOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ categoria_id: z.string().uuid(), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: cfg } = await db.from("configuracoes").select("notif_ativas, notif_limite_80, dia_inicio_mes").maybeSingle();
    if (!cfg?.notif_limite_80) return { avisado: false };
    const { data: cat } = await db.from("categorias").select("nome, orcamento_mensal").eq("id", data.categoria_id).maybeSingle();
    const orc = Number(cat?.orcamento_mensal) || 0;
    if (!cat || orc <= 0) return { avisado: false };
    const { inicio, fim } = inicioMesFinanceiro(data.data, cfg.dia_inicio_mes);
    const { data: gastos } = await db.from("gastos").select("valor").eq("categoria_id", data.categoria_id).gte("data", inicio).lte("data", fim);
    const total = (gastos ?? []).reduce((s, g) => s + Number(g.valor), 0);
    if (total < orc * 0.8) return { avisado: false };
    const { error } = await db.from("alertas_orcamento").insert({ user_id: context.userId, categoria_id: data.categoria_id, mes: inicio });
    if (error) return { avisado: false }; // já avisado neste mês
    await enviarParaUsuario(db, context.userId, {
      title: "Orçamento quase no limite",
      body: `${cat.nome} chegou a ${Math.floor((total / orc) * 100)}% do orçamento`,
      url: "/categorias",
      tag: `orc-${data.categoria_id}`,
    });
    return { avisado: true };
  });
