import { addMonths, endOfMonth, setDate, startOfMonth } from 'date-fns';
import { fromISODate, toISODate } from './format';

/** Next planned month keeps the series' original day, including after February. */
export function proximaRecorrencia(programada: string, dia: number) {
  const month = startOfMonth(addMonths(fromISODate(programada), 1));
  return toISODate(setDate(month, Math.min(dia, endOfMonth(month).getDate())));
}