import { useValoresOcultos } from '@/lib/ocultar';
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Receipt, Search } from "lucide-react";
import { categoriasQuery, gastosTodosQuery } from "@/lib/queries";
import { usePreferences } from "@/lib/preferences";
import { formatBRL, labelPeriodo, rangeOf, shift, toISODate } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpenseList } from "@/components/ExpenseList";
import { useGastoSheet } from "@/components/GastoSheet";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => pageMeta("Gastos", "Veja, busque e edite todos os seus gastos do mês."),
  component: GastosPage,
});

function GastosPage() {useValoresOcultos();
  const [anchor, setAnchor] = useState(new Date());
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<string>("todas");
  const { config } = usePreferences();
  const { abrir } = useGastoSheet();
  const { data: all = [], isPending, error } = useQuery(gastosTodosQuery);
  const { data: cats = [] } = useQuery(categoriasQuery);
  const range = rangeOf("mes", anchor, config);

  const lista = useMemo(() => {
    const s = toISODate(range.start), e = toISODate(range.end), q = busca.trim().toLowerCase();
    return all.filter((g) =>
      g.data >= s && g.data <= e &&
      (cat === "todas" || (cat === "sem" ? !g.categoria_id : g.categoria_id === cat)) &&
      (!q || g.descricao.toLowerCase().includes(q) || (g.observacao ?? "").toLowerCase().includes(q)),
    );
  }, [all, range.start.getTime(), busca, cat]);
  const total = lista.reduce((s, g) => s + Number(g.valor), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setAnchor(shift("mes", anchor, -1))}><ChevronLeft /></Button>
        <h2 className="text-sm font-semibold">{labelPeriodo("mes", anchor)}</h2>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setAnchor(shift("mes", anchor, 1))}><ChevronRight /></Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input placeholder="Buscar gasto" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 rounded-xl pl-10" />
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "todas", nome: "Todas" }, ...cats, { id: "sem", nome: "Sem categoria" }].map((c) => (
          <Button key={c.id} size="sm" variant={cat === c.id ? "default" : "outline"} className="shrink-0 rounded-full" onClick={() => setCat(c.id)}>{c.nome}</Button>
        ))}
      </div>
      <div className="surface flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{lista.length} gasto(s)</span>
        <strong className="text-lg tabular-nums">{formatBRL(total)}</strong>
      </div>
      {error ? <p role="alert" className="text-destructive">Não foi possível carregar seus gastos.</p>
        : isPending ? <p className="text-center text-muted-foreground">Carregando…</p>
        : !lista.length ? (
          <div className="py-10 text-center">
            <Receipt className="mx-auto mb-3 text-primary" size={36} />
            <h2 className="text-lg font-semibold">Nenhum gasto encontrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Registre um gasto para vê-lo aqui.</p>
            <Button className="mt-4 rounded-xl" onClick={() => abrir()}>Adicionar gasto</Button>
          </div>
        ) : <ExpenseList gastos={lista} categorias={cats} />}
    </div>
  );
}
