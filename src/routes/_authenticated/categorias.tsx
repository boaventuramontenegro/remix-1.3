import { OlhoInline, useValoresOcultos } from '@/lib/ocultar';
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { restaurarCategoriasPadrao, categoriasQuery, gastosTodosQuery, useExcluirCategoria, useSalvarCategoria, type Categoria } from "@/lib/queries";
import { usePreferences } from "@/lib/preferences";
import { formatBRL, rangeOf, toISODate } from "@/lib/format";
import { CORES, CategoriaIcone, ICONES } from "@/lib/icons";
import { pageMeta } from "@/lib/page-meta";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/MoneyInput";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { dataSaoPaulo } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => pageMeta("Categorias", "Organize suas categorias e defina orçamentos mensais."),
  component: CategoriasPage,
});

function CategoriasPage() {useValoresOcultos();
  const qc = useQueryClient();
  const [restaurando, setRestaurando] = useState(false);
  const restaurar = async () => { setRestaurando(true); try { await restaurarCategoriasPadrao(); await qc.invalidateQueries({queryKey:["categorias"]}); toast.success("Categorias padrão restauradas"); } catch { toast.error("Não foi possível restaurar."); } finally { setRestaurando(false); } };
  const { data: cats = [], isPending } = useQuery(categoriasQuery);
  const { data: all = [] } = useQuery(gastosTodosQuery);
  const { config } = usePreferences();
  const [edit, setEdit] = useState<Partial<Categoria> | null>(null);
  const r = rangeOf("mes", dataSaoPaulo(), config);
  const s = toISODate(r.start), e = toISODate(r.end);
  const gastoMes = (id: string) => all.filter((g) => g.categoria_id === id && g.data >= s && g.data <= e).reduce((t, g) => t + Number(g.valor), 0);

  return (
    <div className="space-y-4">
      <Button className="h-11 w-full rounded-xl" onClick={() => setEdit({ nome: "", icone: "tag", cor: "#0ea5e9", orcamento_mensal: null })}><Plus />Nova categoria</Button>
      {isPending ? <p className="text-center text-muted-foreground">Carregando…</p> : !cats.length ? (
        <div className="py-10 text-center"><Tags className="mx-auto mb-3 text-primary" size={36} /><p className="font-semibold">Nenhuma categoria ainda</p></div>
      ) : (
        <div className="space-y-2">
          {cats.map((c, indice) => {
            const v = gastoMes(c.id), orc = Number(c.orcamento_mensal) || 0, pct = orc ? (v / orc) * 100 : 0;
            return (
              <div key={c.id} className="relative"><Button variant="ghost" onClick={() => setEdit(c)} className={`surface h-auto w-full flex-col items-stretch gap-2 whitespace-normal text-left ${indice===0?"pr-16":""}`}>
                <span className="flex items-center gap-3">
                  <CategoriaIcone icone={c.icone} cor={c.cor} />
                  <span className="flex-1"><span className="block font-medium">{c.nome}</span><span className="block text-xs text-muted-foreground">{orc ? `${formatBRL(v)} de ${formatBRL(orc)}` : `${formatBRL(v)} neste mês · sem orçamento`}</span></span>
                  {orc > 0 && <span className="text-xs font-semibold">{Math.round(pct)}%</span>}
                </span>
                {orc > 0 && <span className="h-2 overflow-hidden rounded-full bg-muted"><span className={`block h-full ${pct > 100 ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></span>}
              </Button>{indice===0&&<div className="absolute right-2 top-2"><OlhoInline /></div>}</div>
            );
          })}
        </div>
      )}
      <Button variant={cats.length ? 'outline' : 'default'} className="h-11 w-full rounded-xl" disabled={restaurando} onClick={restaurar}>Restaurar categorias padrão</Button>
      <BottomSheet open={!!edit} onOpenChange={o => !o && setEdit(null)} title={edit?.id ? 'Editar categoria' : 'Nova categoria'}>
        {edit && <CategoriaForm key={edit.id ?? 'nova'} cat={edit} onDone={() => setEdit(null)} />}
      </BottomSheet>
    </div>
  );
}

function CategoriaForm({ cat, onDone }: { cat: Partial<Categoria>; onDone: () => void }) {
  const [nome, setNome] = useState(cat.nome ?? "");
  const [icone, setIcone] = useState(cat.icone ?? "tag");
  const [cor, setCor] = useState(cat.cor ?? "#0ea5e9");
  const [orc, setOrc] = useState(Number(cat.orcamento_mensal) || 0);
  const salvar = useSalvarCategoria();
  const qc = useQueryClient();
  const {data: cats=[]} = useQuery(categoriasQuery);
  const {data: gastos=[]} = useQuery(gastosTodosQuery);
  const [confirmar,setConfirmar]=useState(false);
  const [modo,setModo]=useState('reatribuir');
  const [destino,setDestino]=useState<string | null>(null);
  const [busy,setBusy]=useState(false);
  const temGastos=gastos.some(g=>g.categoria_id===cat.id);

  const submit = async () => {
    if (!nome.trim()) { toast.error("Informe o nome da categoria."); return; }
    try {
      await salvar.mutateAsync({ ...(cat.id ? { id: cat.id } : {}), nome: nome.trim(), icone, cor, orcamento_mensal: orc || null });
      toast.success(cat.id ? "Categoria atualizada" : "Categoria criada");
      onDone();
    } catch { toast.error("Não foi possível salvar."); }
  };
  const remover = async () => {
    if (!cat.id) return;
    setBusy(true);
    try {
      const {error}=await supabase.rpc('excluir_categoria_com_gastos',{_categoria:cat.id,_destino:destino ?? undefined,_excluir_gastos:temGastos&&modo==='excluir'});
      if(error) throw error;
      await Promise.all([qc.invalidateQueries({queryKey:['categorias']}),qc.invalidateQueries({queryKey:['gastos']})]);
      toast.success('Categoria excluída'); onDone();
    } catch {toast.error('Não foi possível excluir.');} finally {setBusy(false);}
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="cnome">Nome</Label><Input id="cnome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-xl" /></div>
      <div className="space-y-2"><Label>Ícone</Label><div className="flex flex-wrap gap-2">{Object.keys(ICONES).map((k) => (
        <button type="button" key={k} aria-label={k} onClick={() => setIcone(k)} className={`rounded-xl p-0.5 ring-2 ${icone === k ? "ring-primary" : "ring-transparent"}`}><CategoriaIcone icone={k} cor={cor} size={16} /></button>
      ))}</div></div>
      <div className="space-y-2"><Label>Cor</Label><div className="flex flex-wrap gap-2">{CORES.map((c) => (
        <button type="button" key={c} aria-label={`Cor ${c}`} onClick={() => setCor(c)} className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background ${cor === c ? "ring-primary" : "ring-transparent"}`} style={{ background: c }} />
      ))}</div></div>
      <div className="space-y-2"><Label htmlFor="corc">Orçamento mensal (opcional)</Label><MoneyInput id="corc" value={orc} onChange={setOrc} /></div>
      <Button className="h-11 w-full rounded-xl" disabled={salvar.isPending} onClick={submit}>Salvar</Button>
      {cat.id && <Button variant="ghost" className="w-full text-destructive" onClick={()=>setConfirmar(true)}>Excluir categoria</Button>}
      {temGastos ? <BottomSheet open={confirmar} onOpenChange={setConfirmar} title="Excluir categoria?" description="Escolha o que fazer com os gastos desta categoria.">
        <div className="flex flex-wrap gap-2"><Button variant={modo==='reatribuir'?'default':'outline'} onClick={()=>setModo('reatribuir')}>Reatribuir gastos</Button><Button variant={modo==='excluir'?'destructive':'outline'} onClick={()=>setModo('excluir')}>Excluir categoria e gastos</Button></div>
        {modo==='reatribuir'&&<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant={!destino?'default':'outline'} onClick={()=>setDestino(null)}>Sem categoria</Button>{cats.filter(c=>c.id!==cat.id).map(c=><Button key={c.id} size="sm" variant={destino===c.id?'default':'outline'} onClick={()=>setDestino(c.id)}>{c.nome}</Button>)}</div>}
        <div className="mt-5 flex gap-2"><Button variant="outline" className="h-12 flex-1" onClick={()=>setConfirmar(false)}>Cancelar</Button><Button variant="destructive" className="h-12 flex-1" disabled={busy} onClick={remover}>Excluir</Button></div>
      </BottomSheet> : <ConfirmSheet open={confirmar} onOpenChange={setConfirmar} title="Excluir categoria?" description="Esta ação não pode ser desfeita." busy={busy} onConfirm={remover} />}

    </div>
  );
}
