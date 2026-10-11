import { describe, expect, it } from 'vitest';
import { calcMediaPorDia, hojeSaoPaulo, marcasEixo } from '../lib/media';
describe('Média por dia: datas inclusivas', () => {
  it.each([
    [1620, '2026-10-01', '2026-10-31', '2026-10-11', 11, 147.27],
    [2500, '2026-10-01', '2026-10-31', '2026-10-25', 25, 100],
    [2400, '2026-09-18', '2026-10-17', '2026-10-11', 24, 100],
    [700, '2026-10-05', '2026-10-11', '2026-10-11', 7, 100],
    [3000, '2026-09-01', '2026-09-30', '2026-10-11', 30, 100],
    [2840, '2026-01-01', '2026-12-31', '2026-10-11', 284, 10],
    [100, '2026-10-12', '2026-10-18', '2026-10-11', 0, null],
    [80, '2026-10-11', '2026-10-31', '2026-10-11', 1, 80],
  ])('%s entre %s e %s em %s', (total, inicio, fim, hoje, dias, media) => {
    expect(calcMediaPorDia(Number(total), String(inicio), String(fim), String(hoje))).toMatchObject({ dias, media });
  });
  it('usa a data de São Paulo perto da meia-noite UTC', () => expect(hojeSaoPaulo(new Date('2026-10-12T01:00:00Z'))).toBe('2026-10-11'));
  it('gera cinco marcas exatas', () => expect(marcasEixo(1620)).toEqual([0, 500, 1000, 1500, 2000]));
});