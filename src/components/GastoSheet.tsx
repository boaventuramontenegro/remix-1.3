import { useQuery } from '@tanstack/react-query';
import { ConfirmSheet } from './ConfirmSheet';
import { sugerirCategoria } from '@/lib/sugerir-categoria';
import { dataSaoPaulo } from '@/lib/media';
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CategoriaIcone } from "@/lib/icons";
import { FORMAS_PAGAMENTO, formatBRL, toISODate, displayDate } from "@/lib/format";
import { proximaRecorrencia } from '@/lib/recorrencia';
import { usePreferences } from "@/lib/preferences";
import { gastosTodosQuery, recorrenciasQuery, useCancelarRecorrencia, useCategorias, useExcluirGasto, useSalvarGasto, type Gasto } from "@/lib/queries";

type Ctx = { abrir: (g?: Gasto) => void };
const GastoCtx = createContext<Ctx>({ abrir: () => {} });
export const useGastoSheet = () => useContext(GastoCtx);

export function GastoSheetProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Gasto | undefined>();
  const abrir = (g?: Gasto) => {
    setEditando(g);
    setAberto(true);
  };
  return (
    <GastoCtx.Provider value={{ abrir }}>
      {children}
      <Drawer open={aberto} onOpenChange={setAberto}>
        <DrawerContent className="max-h-[94vh] rounded-t-3xl">
          <DrawerHeader>
            <DrawerTitle className="font-display text-xl">{editando ? "Editar gasto" : "Novo gasto"}</DrawerTitle>
          </DrawerHeader>
          {aberto && <GastoFormLoader gasto={editando} onDone={() => setAberto(false)} />}
        </DrawerContent>
      </Drawer>
    </GastoCtx.Provider>
  );
}

function GastoFormLoader({ gasto, onDone }: { gasto?: Gasto; onDone: () => void }) {
  const q = useQuery(recorrenciasQuery);
  if (gasto?.serie_id && q.isPending) return <p className="p-4 text-center">Carregando repetição…</p>;
  if (gasto?.serie_id && q.isError) return <div className="p-4"><p>Não foi possível consultar a repetição.</p><Button onClick={() => void q.refetch()}>Tentar novamente</Button></div>;
  return <GastoForm key={gasto?.id ?? 'novo'} gasto={gasto} serie={q.data?.find(s => s.id === gasto?.serie_id)} onDone={onDone} />;
}

function GastoForm({ gasto, serie, onDone }: { gasto?: Gasto | undefined; serie?: import('@/lib/queries').Recorrencia; onDone: () => void }) {
  const { data: categorias = [] } = useCategorias();
  const salvar = useSalvarGasto();
  const excluir = useExcluirGasto();
  const {config} = usePreferences();
  const [centavos, setCentavos] = useState(gasto ? String(Math.round(Number(gasto.valor) * 100)) : "");
  const [categoriaId, setCategoriaId] = useState<string | null>(gasto?.categoria_id ?? null);
  const [data, setData] = useState(gasto?.data ?? toISODate(dataSaoPaulo()));
  const [descricao, setDescricao] = useState(gasto?.descricao ?? "");
  const [forma, setForma] = useState(gasto?.forma_pagamento ?? config.pagamento_padrao);
  const [recorrente, setRecorrente] = useState(serie?.ativa ?? gasto?.recorrente ?? false);
  const [escopo, setEscopo] = useState<'este' | 'proximos'>('este');
  const [termino, setTermino] = useState(serie?.termino ?? '');
  const [comTermino, setComTermino] = useState(!!serie?.termino);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const cancelar = useCancelarRecorrencia();
  const proxima = proximaRecorrencia(gasto?.data_programada ?? data, serie?.dia ?? Number(data.slice(8, 10)));
  const [obs, setObs] = useState(gasto?.observacao ?? "");

  const { data: historico = [] } = useQuery(gastosTodosQuery);
  const [manual, setManual] = useState(!!gasto);
  const [confirmar, setConfirmar] = useState(false);
  const sugerida = manual ? null : sugerirCategoria(descricao, historico, categorias);
  useEffect(() => {
    if (!manual) setCategoriaId(sugerida ?? categorias[0]?.id ?? null);
  }, [sugerida, categorias, manual]);
  const remover = async () => {
    if (!gasto) return;
    try { await excluir.mutateAsync(gasto.id); toast.success('Gasto excluído'); onDone(); }
    catch { toast.error('Não foi possível excluir.'); }
  };

  const valor = Number(centavos || "0") / 100;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valor <= 0) { toast.error("Informe um valor maior que zero."); return; }
    if (!categoriaId) { toast.error("Escolha uma categoria."); return; }
    if (recorrente && comTermino && (!termino || termino < data)) { toast.error('Escolha uma data de término igual ou posterior ao gasto.'); return; }
    try {
      await salvar.mutateAsync({
        ...(gasto ? { id: gasto.id } : {}),
        valor,
        categoria_id: categoriaId,
        data,
        descricao: descricao.trim(),
        forma_pagamento: forma,
        recorrente,
        escopo,
        termino: comTermino ? termino : null,
        observacao: obs.trim() || null,
      });
      toast.success(gasto ? "Gasto atualizado" : "Gasto adicionado");
      onDone();
    } catch {
      toast.error("Não foi possível salvar o gasto.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 overflow-y-auto px-4 pb-8">
      <div className="rounded-2xl bg-muted p-4 text-center">
        <Label htmlFor="valor" className="text-xs uppercase tracking-wide text-muted-foreground">Valor</Label>
        <input
          id="valor"
          inputMode="numeric"
          autoFocus={!gasto}
          value={formatBRL(valor, { sempre: true })}
          onChange={(e) => setCentavos(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11))}
          className="mt-1 w-full bg-transparent text-center font-display text-4xl font-bold text-foreground outline-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <Button variant="outline"
              type="button"
              key={c.id}
              onClick={() => { setManual(true); setCategoriaId(c.id); }}
              className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition ${categoriaId === c.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}
            >
              <CategoriaIcone icone={c.icone} cor={c.cor} size={14} className="rounded-full" />
              {c.nome}{sugerida === c.id && <span className="text-xs text-primary">Sugerida</span>}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-11 rounded-xl" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="forma">Pagamento</Label>
          <select id="forma" value={forma} onChange={(e) => setForma(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Descrição</Label>
        <Input id="desc" placeholder="Ex.: Conta de luz" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-11 rounded-xl" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="obs">Observação</Label>
        <Textarea id="obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} className="rounded-xl" />
      </div>

      {serie && <div className="space-y-2"><Label>Aplicar alterações</Label><div className="flex flex-wrap gap-2"><Button type="button" variant={escopo === 'este' ? 'default' : 'outline'} onClick={() => setEscopo('este')}>Somente este lançamento</Button><Button type="button" variant={escopo === 'proximos' ? 'default' : 'outline'} onClick={() => setEscopo('proximos')}>Este e os próximos</Button></div><p className="text-xs text-muted-foreground">{escopo === 'este' ? 'As próximas repetições não serão alteradas.' : 'Os lançamentos anteriores permanecem como estão.'}</p></div>}
      <label className="flex items-center justify-between rounded-2xl border p-4">
        <div>
          <div className="font-medium">Repetir todo mês</div>
          <div className="text-xs text-muted-foreground">Repetição mensal na data programada</div>
        </div>
        <Switch aria-label="Repetir todo mês" checked={recorrente} disabled={!!serie && escopo === 'este'} onCheckedChange={setRecorrente} />
      </label>
      {recorrente && <div className="space-y-3"><p className="text-sm text-muted-foreground">{comTermino && termino && proxima > termino ? 'Não há próximo lançamento dentro do prazo.' : `Próximo lançamento previsto: ${displayDate(proxima)}.`} Nos meses mais curtos, será usado o último dia; depois, o dia original será retomado.</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={!!serie && escopo === 'este'} variant={!comTermino ? 'default' : 'outline'} onClick={() => setComTermino(false)}>Até eu cancelar</Button><Button type="button" disabled={!!serie && escopo === 'este'} variant={comTermino ? 'default' : 'outline'} onClick={() => setComTermino(true)}>Definir término</Button></div>{comTermino && <div className="space-y-2"><Label htmlFor="termino">Data de término</Label><Input id="termino" type="date" min={data} value={termino} disabled={!!serie && escopo === 'este'} onChange={e => setTermino(e.target.value)} required /></div>}</div>}
      {serie?.ativa && <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => setConfirmarCancelamento(true)}>Cancelar repetição</Button>}
      {serie && !serie.ativa && <p className="text-sm text-muted-foreground">Repetição encerrada. Os gastos já registrados permanecem no histórico.</p>}
      <ConfirmSheet open={confirmarCancelamento} onOpenChange={setConfirmarCancelamento} title="Cancelar repetição mensal?" description="Impede novos lançamentos, sem apagar os gastos já registrados." busy={cancelar.isPending} onConfirm={async () => { if (!serie) return; try { await cancelar.mutateAsync(serie.id); toast.success('Repetição cancelada'); onDone(); } catch { toast.error('Não foi possível cancelar a repetição.'); } }} />

      <Button type="submit" disabled={salvar.isPending} className="h-12 w-full rounded-xl text-base">
        {salvar.isPending ? "Salvando..." : "Salvar"}
      </Button>
      {gasto && <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => setConfirmar(true)}>Excluir gasto</Button>}
      <ConfirmSheet open={confirmar} onOpenChange={setConfirmar} title="Excluir este gasto?" description="Esta ação não pode ser desfeita." busy={excluir.isPending} onConfirm={remover} />
    </form>
  );
}
