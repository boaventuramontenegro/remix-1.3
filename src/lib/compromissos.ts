import { addMonths, endOfMonth, setDate, startOfMonth } from "date-fns";
import { fromISODate, toISODate } from "./format";

export type ParcelaPlanejada = {
  numero: number;
  total: number;
  data: string;
  valor: number;
};

export function gerarParcelas(
  inicio: string,
  dia: number,
  total: number,
  valor: number,
): ParcelaPlanejada[] {
  if (!Number.isInteger(total) || total < 1) throw new Error("Informe uma quantidade válida de parcelas.");
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) throw new Error("Informe um dia válido.");
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("Informe um valor válido.");
  return Array.from({ length: total }, (_, index) => {
    const month = startOfMonth(addMonths(fromISODate(inicio), index));
    return {
      numero: index + 1,
      total,
      data: toISODate(setDate(month, Math.min(dia, endOfMonth(month).getDate()))),
      valor,
    };
  });
}

export function saldoParcelas(parcelas: Array<ParcelaPlanejada & { paga: boolean }>) {
  return parcelas.filter((parcela) => !parcela.paga).reduce((total, parcela) => total + parcela.valor, 0);
}

export function selecionarParcelasFuturasNaoPagas<T extends { data: string; paga: boolean }>(parcelas: T[], hoje: string) {
  return parcelas.filter((parcela) => parcela.data > hoje && !parcela.paga);
}

/** A quitação é um evento separado; nunca transforma parcelas futuras em pagamentos individuais. */
export function eventoQuitacao(valor: number, hoje: string) {
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("O valor da quitação deve ser maior que zero.");
  return { valor, data: hoje, tipo: "quitacao" as const };
}
