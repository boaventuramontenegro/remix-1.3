import type { Gasto } from "./queries";

export const STATUS_PAGAMENTO = [
  "futuro",
  "a_vencer",
  "vence_hoje",
  "pendente",
  "atrasado",
  "pago",
  "cancelado",
] as const;

export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export type StatusPendente = "atrasado" | "vence_hoje" | "a_vencer";

const ordem: Record<StatusPendente, number> = {
  atrasado: 0,
  vence_hoje: 1,
  a_vencer: 2,
};

function statusExplicito(gasto: Gasto): StatusPagamento | null {
  const status = gasto.status_pagamento;
  return STATUS_PAGAMENTO.includes(status as StatusPagamento) ? (status as StatusPagamento) : null;
}

/** Deriva o estado visível da data sem transformar ausência de resposta em pagamento. */
export function statusVisivel(gasto: Gasto, hoje: string): StatusPagamento | null {
  const explicito = statusExplicito(gasto);
  if (explicito === "pago" || explicito === "cancelado") return explicito;
  if (!explicito) return null;
  if (gasto.data < hoje) return "atrasado";
  if (gasto.data === hoje) return "vence_hoje";
  return "a_vencer";
}

/**
 * Ordena somente compromissos ainda não pagos/cancelados:
 * atrasados, vencendo hoje e próximos vencimentos.
 */
export function ordenarPagamentosPendentes(gastos: Gasto[], hoje: string) {
  return gastos
    .map((gasto) => ({ gasto, status: statusVisivel(gasto, hoje) }))
    .filter((item): item is { gasto: Gasto; status: StatusPendente } =>
      item.status === "atrasado" || item.status === "vence_hoje" || item.status === "a_vencer",
    )
    .sort((a, b) => ordem[a.status] - ordem[b.status] || a.gasto.data.localeCompare(b.gasto.data) || a.gasto.created_at.localeCompare(b.gasto.created_at))
    .map(({ gasto }) => gasto);
}
