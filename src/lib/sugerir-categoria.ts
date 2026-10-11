import type { Categoria, Gasto } from './queries';
const normalizar = (v: string) => v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const PALAVRAS: Record<string, string[]> = {
  Contas: ['luz', 'agua', 'internet', 'telefone'], Mercado: ['mercado', 'padaria', 'feira', 'acougue'],
  'Veículo': ['gasolina', 'combustivel', 'ipva', 'oficina', 'pneu'], Moradia: ['aluguel', 'condominio', 'iptu', 'reforma'],
  'Saúde': ['farmacia', 'medico', 'consulta'], 'Educação': ['escola', 'curso', 'livro'],
  Lazer: ['churrasco', 'restaurante', 'cinema', 'viagem'], Transporte: ['uber', 'onibus', 'passagem'],
};
export function sugerirCategoria(descricao: string, historico: Gasto[], categorias: Categoria[]) {
  const texto = normalizar(descricao);
  if (texto.length < 3) return null;
  const similares = (a: string) => {
    const b = normalizar(a);
    if (b === texto) return 3;
    const tokens = texto.split(/\W+/).filter(t => t.length > 2);
    const comuns = tokens.filter(t => b.split(/\W+/).includes(t)).length;
    return comuns / Math.max(tokens.length, b.split(/\W+/).filter(t => t.length > 2).length, 1) >= 0.6 ? 1 : 0;
  };
  const votos = new Map<string, number>();
  for (const g of historico) if (g.categoria_id && categorias.some(c => c.id === g.categoria_id)) {
    votos.set(g.categoria_id, (votos.get(g.categoria_id) ?? 0) + similares(g.descricao));
  }
  const melhor = [...votos].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
  if (melhor) return melhor[0];
  const nome = Object.entries(PALAVRAS).find(([, palavras]) => palavras.some(p => texto.split(/\W+/).includes(p)))?.[0];
  return categorias.find(c => c.nome === nome)?.id ?? null;
}