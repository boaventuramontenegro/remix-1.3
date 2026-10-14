export type PushReport = { inscritos: number; enviados: number; expirados: number; falhas: number; status: number[] };
export const subscriptionExpired = (status: number) => status === 404 || status === 410;
export function pushReportMessage(r: PushReport) {
  if (!r.inscritos) return 'Nenhum aparelho inscrito ainda. Ative as notificações neste aparelho.';
  if (r.enviados) return `Serviço de notificações aceitou o envio para ${r.enviados} aparelho(s).`;
  if (r.expirados === r.inscritos) return 'A inscrição expirou. Ative as notificações novamente neste aparelho.';
  return r.status.length ? `O serviço de notificações recusou o envio (HTTP ${r.status.join(', ')}). Tente novamente.` : 'Não foi possível enviar a notificação. Tente novamente.';
}