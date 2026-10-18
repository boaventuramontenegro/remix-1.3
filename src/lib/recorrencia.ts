import { addMonths, endOfMonth, setDate, startOfMonth } from "date-fns";
import { fromISODate, toISODate } from "./format";

export type RegraDiaInvalido = "ultimo_dia" | "pular_mes";

/**
 * Calcula uma ocorrência mensal sem confundir data prevista com data de criação.
 *
 * Para uma recorrência no dia 31, a regra é persistida na série:
 * - ultimo_dia: usa o último dia real do mês;
 * - pular_mes: não cria ocorrência no mês sem o dia 31.
 */
export function dataRecorrenciaMensal(
  programada: string,
  dia: number,
  regraDiaInvalido: RegraDiaInvalido = "ultimo_dia",
  meses = 1,
): string | null {
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new Error("O dia da recorrência deve estar entre 1 e 31.");
  }
  if (!Number.isInteger(meses) || meses < 1) {
    throw new Error("A quantidade de meses deve ser um inteiro positivo.");
  }

  const month = startOfMonth(addMonths(fromISODate(programada), meses));
  const ultimoDia = endOfMonth(month).getDate();
  if (dia > ultimoDia && regraDiaInvalido === "pular_mes") return null;
  return toISODate(setDate(month, Math.min(dia, ultimoDia)));
}

/** Compatibilidade com os chamadores existentes: meses curtos usam o último dia. */
export function proximaRecorrencia(
  programada: string,
  dia: number,
  regraDiaInvalido: RegraDiaInvalido = "ultimo_dia",
) {
  return dataRecorrenciaMensal(programada, dia, regraDiaInvalido) ?? programada;
}
