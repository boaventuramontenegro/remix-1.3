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
import { FORMAS_PAGAMENTO, formatBRL, toISODate } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { gastosTodosQuery, useCategorias, useExcluirGasto, useSalvarGasto, type Gasto } from "@/lib/queries";

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
          {aberto && <GastoForm key={editando?.id ?? "novo"} gasto={editando} onDone={() => setAberto(false)} />}
        </DrawerContent>
      </Drawer>
    </GastoCtx.Provider>
  );
}

function GastoForm({ gasto, onDone }: { gasto?: Gasto | undefined; onDone: () => void }) {
  const { data: categorias = [] } = useCategorias();
  const salvar = useSalvarGasto();
  const excluir = useExcluirGasto();
  const {config} = usePreferences();
  const [centavos, setCentavos] = useState(gasto ? String(Math.round(Number(gasto.valor) * 100)) : "");
  const [categoriaId, setCategoriaId] = useState<string | null>(gasto?.categoria_id ?? null);
  const [data, setData] = useState(gasto?.data ?? toISODate(dataSaoPaulo()));
  const [descricao, setDescricao] = useState(gasto?.descricao ?? "");
  const [forma, setForma] = useState(gasto?.forma_pagamento ?? config.pagamento_padrao);
  const [recorrente, setRecorrente] = useState(gasto?.recorrente ?? false);
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
    try {
      await salvar.mutateAsync({
        ...(gasto ? { id: gasto.id } : {}),
        valor,
        categoria_id: categoriaId,
        data,
        descricao: descricao.trim(),
        forma_pagamento: forma,
        recorrente,
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

      <label className="flex items-center justify-between rounded-2xl border p-4">
        <div>
          <div className="font-medium">Repetir todo mês</div>
          <div className="text-xs text-muted-foreground">Lançado automaticamente nos próximos meses</div>
        </div>
        <Switch checked={recorrente} onCheckedChange={setRecorrente} />
      </label>

      <Button type="submit" disabled={salvar.isPending} className="h-12 w-full rounded-xl text-base">
        {salvar.isPending ? "Salvando..." : "Salvar"}
      </Button>
      {gasto && <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => setConfirmar(true)}>Excluir gasto</Button>}
      <ConfirmSheet open={confirmar} onOpenChange={setConfirmar} title="Excluir este gasto?" description="Esta ação não pode ser desfeita." busy={excluir.isPending} onConfirm={remover} />
    </form>
  );
}
