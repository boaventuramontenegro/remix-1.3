import { useValoresOcultos } from '@/lib/ocultar';
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { categoriasQuery, gastosTodosQuery, useExcluirCategoria, useSalvarCategoria, type Categoria } from "@/lib/queries";
import { usePreferences } from "@/lib/preferences";
import { formatBRL, rangeOf, toISODate } from "@/lib/format";
import { CORES, CategoriaIcone, ICONES } from "@/lib/icons";
import { pageMeta } from "@/lib/page-meta";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/MoneyInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => pageMeta("Categorias", "Organize suas categorias e defina orçamentos mensais."),
  component: CategoriasPage,
});

function CategoriasPage() {useValoresOcultos();
  const { data: cats = [], isPending } = useQuery(categoriasQuery);
  const { data: all = [] } = useQuery(gastosTodosQuery);
  const { config } = usePreferences();
  const [edit, setEdit] = useState<Partial<Categoria> | null>(null);
  const r = rangeOf("mes", new Date(), config);
  const s = toISODate(r.start), e = toISODate(r.end);
  const gastoMes = (id: string) => all.filter((g) => g.categoria_id === id && g.data >= s && g.data <= e).reduce((t, g) => t + Number(g.valor), 0);

  return (
    <div className="space-y-4">
      <Button className="h-11 w-full rounded-xl" onClick={() => setEdit({ nome: "", icone: "tag", cor: "#0ea5e9", orcamento_mensal: null })}><Plus />Nova categoria</Button>
      {isPending ? <p className="text-center text-muted-foreground">Carregando…</p> : !cats.length ? (
        <div className="py-10 text-center"><Tags className="mx-auto mb-3 text-primary" size={36} /><p className="font-semibold">Nenhuma categoria ainda</p></div>
      ) : (
        <div className="space-y-2">
          {cats.map((c) => {
            const v = gastoMes(c.id), orc = Number(c.orcamento_mensal) || 0, pct = orc ? (v / orc) * 100 : 0;
            return (
              <Button key={c.id} variant="ghost" onClick={() => setEdit(c)} className="surface h-auto w-full flex-col items-stretch gap-2 whitespace-normal text-left">
                <span className="flex items-center gap-3">
                  <CategoriaIcone icone={c.icone} cor={c.cor} />
                  <span className="flex-1"><span className="block font-medium">{c.nome}</span><span className="block text-xs text-muted-foreground">{orc ? `${formatBRL(v)} de ${formatBRL(orc)}` : `${formatBRL(v)} neste mês · sem orçamento`}</span></span>
                  {orc > 0 && <span className="text-xs font-semibold">{Math.round(pct)}%</span>}
                </span>
                {orc > 0 && <span className="h-2 overflow-hidden rounded-full bg-muted"><span className={`block h-full ${pct > 100 ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></span>}
              </Button>
            );
          })}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          {edit && <CategoriaForm cat={edit} onDone={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriaForm({ cat, onDone }: { cat: Partial<Categoria>; onDone: () => void }) {
  const [nome, setNome] = useState(cat.nome ?? "");
  const [icone, setIcone] = useState(cat.icone ?? "tag");
  const [cor, setCor] = useState(cat.cor ?? "#0ea5e9");
  const [orc, setOrc] = useState(Number(cat.orcamento_mensal) || 0);
  const salvar = useSalvarCategoria();
  const excluir = useExcluirCategoria();

  const submit = async () => {
    if (!nome.trim()) { toast.error("Informe o nome da categoria."); return; }
    try {
      await salvar.mutateAsync({ ...(cat.id ? { id: cat.id } : {}), nome: nome.trim(), icone, cor, orcamento_mensal: orc || null });
      toast.success(cat.id ? "Categoria atualizada" : "Categoria criada");
      onDone();
    } catch { toast.error("Não foi possível salvar."); }
  };
  const remover = async () => {
    if (!cat.id || !window.confirm("Excluir esta categoria? Os gastos dela ficarão sem categoria.")) return;
    try {
      await supabase.from("gastos").update({ categoria_id: null }).eq("categoria_id", cat.id);
      await excluir.mutateAsync(cat.id);
      toast.success("Categoria excluída");
      onDone();
    } catch { toast.error("Não foi possível excluir."); }
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
      {cat.id && <Button variant="ghost" className="w-full text-destructive" onClick={remover}>Excluir categoria</Button>}
    </div>
  );
}
