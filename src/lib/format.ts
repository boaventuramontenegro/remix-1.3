import {
  addMonths,
  addDays,
  subDays,
  setDate,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let ocultos = false;
export const valoresOcultos = () => ocultos;
export const setValoresOcultos = (v: boolean) => { ocultos = v; };
export const OCULTO = "R$ ••••";
/** Formata em R$ 1.234,56; respeita "ocultar valores" (use { sempre: true } em campos de digitação). */
export const formatBRL = (v: number, opts?: { sempre?: boolean }) => (ocultos && !opts?.sempre ? OCULTO : brl.format(v || 0));
/** Rótulos compactos para eixos: R$ 0, R$ 500, R$ 1 mil, R$ 1,5 mi. */
export const formatBRLCompacto = (v: number) => {
  if (ocultos) return "R$ ••";
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(n)}`;
};

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISODate = (s: string) => parseISO(s);
export const fmt = (d: Date, f: string) => format(d, f, { locale: ptBR });

export type Periodo = "semana" | "mes" | "ano";

export function rangeOf(periodo: Periodo, anchor: Date, preferences: { semana_inicia: number; dia_inicio_mes: number } = {semana_inicia:1,dia_inicio_mes:1}) {
  if (periodo === "semana")
    return { start: startOfWeek(anchor, { weekStartsOn: preferences.semana_inicia === 0 ? 0 : 1 }), end: endOfWeek(anchor, { weekStartsOn: preferences.semana_inicia === 0 ? 0 : 1 }) };
  if (periodo === "mes") { const day=preferences.dia_inicio_mes; const base=anchor.getDate()<day ? addMonths(anchor,-1) : anchor; const start=setDate(startOfMonth(base),day); return {start, end:subDays(addMonths(start,1),1)}; }
  return { start: startOfYear(anchor), end: endOfYear(anchor) };
}

export function shift(periodo: Periodo, anchor: Date, n: number) {
  if (periodo === "semana") return addWeeks(anchor, n);
  if (periodo === "mes") return addMonths(anchor, n);
  return addYears(anchor, n);
}

export function labelPeriodo(periodo: Periodo, anchor: Date) {
  const { start, end } = rangeOf(periodo, anchor);
  if (periodo === "semana") return `${fmt(start, "d MMM")} – ${fmt(end, "d MMM yyyy")}`;
  if (periodo === "mes") {
    const s = fmt(start, "MMMM yyyy");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return fmt(start, "yyyy");
}

export const FORMAS_PAGAMENTO = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
] as const;

export const labelForma = (v: string) => FORMAS_PAGAMENTO.find((f) => f.value === v)?.label ?? v;

export const displayDate = (s: string) => fmt(fromISODate(s), "dd/MM/yyyy");
