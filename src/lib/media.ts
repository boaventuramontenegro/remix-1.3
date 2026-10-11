import { differenceInCalendarDays, parseISO } from 'date-fns';
import { agoraNoFuso } from './budget';

export const hojeSaoPaulo = (agora = new Date()) => agoraNoFuso('America/Sao_Paulo', agora).data;
export const dataSaoPaulo = () => parseISO(hojeSaoPaulo());

/** Only calendar dates enter this calculation; no elapsed-hour rounding. */
export function calcMediaPorDia(total: number, inicioPeriodo: string, fimPeriodo: string, hoje = hojeSaoPaulo()) {
  if (inicioPeriodo > fimPeriodo || hoje < inicioPeriodo) return { dias: 0, media: null, emAndamento: false };
  const limite = hoje < fimPeriodo ? hoje : fimPeriodo;
  const dias = differenceInCalendarDays(parseISO(limite), parseISO(inicioPeriodo)) + 1;
  return { dias, media: Math.round((total / dias + Number.EPSILON) * 100) / 100, emAndamento: hoje >= inicioPeriodo && hoje <= fimPeriodo };
}

export function textoMedia(resultado: ReturnType<typeof calcMediaPorDia>, periodo: 'semana' | 'mes' | 'ano') {
  if (!resultado.dias) return 'Período futuro';
  if (resultado.emAndamento) return `Média dos ${resultado.dias} dias até hoje`;
  return `Média dos ${resultado.dias} dias ${periodo === 'mes' ? 'do mês' : periodo === 'ano' ? 'do ano' : 'da semana'}`;
}

export function marcasEixo(maximo: number) {
  const passos = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
  let escala = 1;
  while (maximo > 20000 * escala) escala *= 10;
  const passo = passos.map(p => p * escala).find(p => p * 4 >= maximo) ?? 5000 * escala;
  return [0, passo, passo * 2, passo * 3, passo * 4];
}