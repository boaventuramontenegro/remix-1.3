import { useState } from 'react';
import { addMonths, endOfMonth, startOfMonth, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet } from './BottomSheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { exportarGastos, type Formato } from '@/lib/exportar';
import { formatBRL, rangeOf, toISODate } from '@/lib/format';
import { dataSaoPaulo, hojeSaoPaulo } from '@/lib/media';
import { useValoresOcultos } from '@/lib/ocultar';
import type { Categoria, Gasto } from '@/lib/queries';
const FORMATOS: [Formato, string][] = [['pdf', 'PDF'], ['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV'], ['txt', 'TXT'], ['json', 'JSON']];
const PERIODOS = ['Mês atual', 'Ano atual', 'Tudo', 'Semana atual', 'Mês passado', 'Últimos 3 meses', 'Últimos 6 meses', 'Personalizado'];
export function ExportSheet({ gastos, cats, config }: { gastos: Gasto[]; cats: Categoria[]; config: { dia_inicio_mes: number; semana_inicia: number } }) {
  useValoresOcultos();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [formato, setFormato] = useState<Formato>('pdf'), [periodo, setPeriodo] = useState('Mês atual');
  const [de, setDe] = useState(hojeSaoPaulo()), [ate, setAte] = useState(hojeSaoPaulo());
  const [categorias, setCategorias] = useState<string[]>([]);
  const hoje = dataSaoPaulo();
  let inicio = '', fim = '9999-12-31';
  if (periodo === 'Personalizado') { inicio = de; fim = ate; }
  else if (periodo !== 'Tudo') {
    const r = periodo === 'Ano atual' ? rangeOf('ano', hoje, config) : periodo === 'Semana atual' ? rangeOf('semana', hoje, config) : rangeOf('mes', periodo === 'Mês passado' ? addMonths(hoje, -1) : hoje, config);
    inicio = toISODate(r.start); fim = toISODate(r.end);
    if (periodo === 'Últimos 3 meses' || periodo === 'Últimos 6 meses') inicio = toISODate(addMonths(r.start, periodo === 'Últimos 3 meses' ? -2 : -5));
  }
  const invalido = !inicio && periodo !== 'Tudo' || !fim || inicio > fim;
  const lista = invalido ? [] : gastos.filter(g => g.data >= inicio && g.data <= fim && (!categorias.length || categorias.includes(g.categoria_id ?? 'sem')));
  const total = lista.reduce((t, g) => t + Number(g.valor), 0);
  const chips = (opcoes: string[], valor: string, escolher: (v: string) => void) => <div className="flex flex-wrap gap-2">{opcoes.map(v => <Button key={v} size="sm" variant={valor === v ? 'default' : 'outline'} className="rounded-full" onClick={() => escolher(v)}>{v}</Button>)}</div>;
  const baixar = async () => {
    setBusy(true);
    try { await exportarGastos(formato, lista, cats, `meu-bolso-gastos-${hojeSaoPaulo().slice(0, 7)}`); toast.success('Arquivo baixado'); }
    catch { toast.error('Não foi possível gerar o arquivo.'); }
    finally { setBusy(false); }
  };
  return <><Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setOpen(true)}><Download />Exportar</Button>
    <BottomSheet open={open} onOpenChange={setOpen} title="Exportar dados"><div className="space-y-4">
      <div className="space-y-2"><Label>Formato</Label>{chips(FORMATOS.map(([, l]) => l), FORMATOS.find(([f]) => f === formato)?.[1] ?? '', v => setFormato(FORMATOS.find(([, l]) => l === v)?.[0] ?? 'pdf'))}</div>
      <div className="space-y-2"><Label>Período</Label>{chips(PERIODOS, periodo, setPeriodo)}</div>
      {periodo === 'Personalizado' && <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="export-de">De</Label><Input id="export-de" type="date" value={de} onChange={e => setDe(e.target.value)} /></div><div><Label htmlFor="export-ate">Até</Label><Input id="export-ate" type="date" value={ate} onChange={e => setAte(e.target.value)} /></div></div>}
      <div className="space-y-2"><Label>Categorias</Label><div className="flex flex-wrap gap-2"><Button size="sm" className="rounded-full" variant={!categorias.length ? 'default' : 'outline'} onClick={() => setCategorias([])}>Todas</Button>{[...cats, { id: 'sem', nome: 'Sem categoria' }].map(c => <Button size="sm" className="rounded-full" key={c.id} variant={categorias.includes(c.id) ? 'default' : 'outline'} onClick={() => setCategorias(old => old.includes(c.id) ? old.filter(id => id !== c.id) : [...old, c.id])}>{c.nome}</Button>)}</div></div>
      <p className="text-sm tabular-nums">{lista.length} gastos · {formatBRL(total)}</p>
      {!lista.length && <p role="status" className="text-sm text-muted-foreground">{invalido ? 'Escolha um intervalo de datas válido.' : 'Nenhum gasto no período escolhido.'}</p>}
      <Button className="h-12 w-full rounded-xl" disabled={!lista.length || busy} onClick={baixar}><Download />{busy ? 'Gerando arquivo…' : 'Baixar arquivo'}</Button>
    </div></BottomSheet></>;
}