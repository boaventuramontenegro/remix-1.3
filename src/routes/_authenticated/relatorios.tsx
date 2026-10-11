import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { categoriasQuery, gastosTodosQuery } from "@/lib/queries";
import { usePreferences } from "@/lib/preferences";
import { FORMAS_PAGAMENTO, fmt, formatBRL, labelPeriodo, rangeOf, shift, toISODate, type Periodo } from "@/lib/format";
import { gastosToCSV, downloadCSV } from "@/lib/csv";
import { CategoriaIcone } from "@/lib/icons";
import { pageMeta } from "@/lib/page-meta";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => pageMeta("Relatórios", "Relatórios de gastos por categoria, pagamento e mês, com exportação CSV."),
  component: Relatorios,
});

function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [anchor, setAnchor] = useState(new Date());
  const { config } = usePreferences();
  const { data: all = [] } = useQuery(gastosTodosQuery);
  const { data: cats = [] } = useQuery(categoriasQuery);
  const r = rangeOf(periodo, anchor, config);
  const s = toISODate(r.start), e = toISODate(r.end);
  const lista = all.filter((g) => g.data >= s && g.data <= e);
  const total = lista.reduce((t, g) => t + Number(g.valor), 0);
  const dias = Math.max(1, Math.round((Math.min(Date.now(), r.end.getTime()) - r.start.getTime()) / 86400000) + 1);
  const porCat = cats.map((c) => ({ c, v: lista.filter((g) => g.categoria_id === c.id).reduce((t, g) => t + Number(g.valor), 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const porForma = FORMAS_PAGAMENTO.map((f) => ({ ...f, v: lista.filter((g) => g.forma_pagamento === f.value).reduce((t, g) => t + Number(g.valor), 0) })).filter((x) => x.v > 0);
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - 11 + i, 15);
    const mr = rangeOf("mes", d, config), ms = toISODate(mr.start), me = toISODate(mr.end);
    return { name: fmt(d, "MMM"), valor: all.filter((g) => g.data >= ms && g.data <= me).reduce((t, g) => t + Number(g.valor), 0) };
  });

  const exportar = () => {
    if (!lista.length) { toast.error("Nenhum gasto no período para exportar."); return; }
    downloadCSV(`meu-bolso-${s}-a-${e}.csv`, gastosToCSV(lista, cats));
    toast.success("Relatório exportado");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 rounded-2xl bg-muted p-1">{(["semana", "mes", "ano"] as const).map((p) => (
        <Button key={p} variant="ghost" onClick={() => setPeriodo(p)} className={`rounded-xl ${periodo === p ? "bg-card shadow-soft" : ""}`}>{p === "semana" ? "Semana" : p === "mes" ? "Mês" : "Ano"}</Button>
      ))}</div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Período anterior" onClick={() => setAnchor(shift(periodo, anchor, -1))}><ChevronLeft /></Button>
        <h2 className="text-sm font-semibold">{labelPeriodo(periodo, anchor)}</h2>
        <Button variant="ghost" size="icon" aria-label="Próximo período" onClick={() => setAnchor(shift(periodo, anchor, 1))}><ChevronRight /></Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="surface"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold tabular-nums">{formatBRL(total)}</p></div>
        <div className="surface"><p className="text-xs text-muted-foreground">Média por dia</p><p className="text-lg font-bold tabular-nums">{formatBRL(total / dias)}</p></div>
      </div>
      <Button variant="outline" className="h-11 w-full rounded-xl" onClick={exportar}><Download />Exportar CSV</Button>
      <TabelaAnual all={all} cats={cats} />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Últimos 12 meses</h2>
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={meses}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis width={45} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => formatBRL(Number(v))} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 12 }} />
          <Bar dataKey="valor" name="Gastos" fill="var(--primary)" radius={[5, 5, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Ranking de categorias</h2>
        {!porCat.length ? <p className="text-sm text-muted-foreground">Nenhum gasto no período.</p> : porCat.map(({ c, v }) => (
          <div key={c.id} className="mb-3 flex items-center gap-3">
            <CategoriaIcone icone={c.icone} cor={c.cor} size={14} />
            <div className="flex-1"><div className="flex justify-between text-sm"><span>{c.nome}</span><strong className="tabular-nums">{formatBRL(v)}</strong></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full" style={{ width: `${(v / total) * 100}%`, background: c.cor }} /></div></div>
            <span className="w-10 text-right text-xs text-muted-foreground">{Math.round((v / total) * 100)}%</span>
          </div>
        ))}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Por forma de pagamento</h2>
        {!porForma.length ? <p className="text-sm text-muted-foreground">Nenhum gasto no período.</p> : <div className="surface divide-y">{porForma.map((f) => (
          <div key={f.value} className="flex justify-between py-2 text-sm"><span>{f.label}</span><strong className="tabular-nums">{formatBRL(f.v)}</strong></div>
        ))}</div>}
      </section>
    </div>
  );
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function TabelaAnual({ all, cats }: { all: { data: string; valor: number; categoria_id: string | null }[]; cats: { id: string; nome: string }[] }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const doAno = all.filter((g) => g.data.startsWith(String(ano)));
  const linhas = [...cats.map((c) => ({ id: c.id as string | null, nome: c.nome })), { id: null, nome: "Sem categoria" }]
    .map((c) => ({ ...c, m: MESES.map((_, i) => doAno.filter((g) => g.categoria_id === c.id && Number(g.data.slice(5, 7)) === i + 1).reduce((t, g) => t + Number(g.valor), 0)) }))
    .filter((l) => l.m.some((v) => v > 0));
  const col = MESES.map((_, i) => linhas.reduce((t, l) => t + (l.m[i] ?? 0), 0));
  const total = col.reduce((a, b) => a + b, 0);
  const exportar = () => {
    if (!linhas.length) { toast.error("Nenhum gasto neste ano."); return; }
    const n = (v: number) => v.toFixed(2).replace(".", ",");
    const rows = [["Categoria", ...MESES, "Total"], ...linhas.map((l) => [l.nome, ...l.m.map(n), n(l.m.reduce((a, b) => a + b, 0))]), ["Total", ...col.map(n), n(total)]];
    downloadCSV(`meu-bolso-${ano}.csv`, rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\r\n"));
    toast.success("CSV exportado");
  };
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Ano anterior" onClick={() => setAno(ano - 1)}><ChevronLeft /></Button>
        <h2 className="text-lg font-semibold">Resumo de {ano}</h2>
        <Button variant="ghost" size="icon" aria-label="Próximo ano" onClick={() => setAno(ano + 1)}><ChevronRight /></Button>
      </div>
      {!linhas.length ? <p className="text-sm text-muted-foreground">Nenhum gasto em {ano}.</p> : (
        <div className="surface overflow-x-auto p-0"><table className="w-max min-w-full text-xs tabular-nums">
          <thead><tr className="border-b text-muted-foreground"><th className="sticky left-0 bg-card p-2 text-left">Categoria</th>{MESES.map((m) => <th key={m} className="p-2 text-right">{m}</th>)}<th className="p-2 text-right">Total</th></tr></thead>
          <tbody>{linhas.map((l) => <tr key={l.nome} className="border-b"><td className="sticky left-0 bg-card p-2 font-medium">{l.nome}</td>{l.m.map((v, i) => <td key={i} className="p-2 text-right">{v ? formatBRL(v) : "–"}</td>)}<td className="p-2 text-right font-semibold">{formatBRL(l.m.reduce((a, b) => a + b, 0))}</td></tr>)}</tbody>
          <tfoot><tr className="font-semibold"><td className="sticky left-0 bg-card p-2">Total</td>{col.map((v, i) => <td key={i} className="p-2 text-right">{formatBRL(v)}</td>)}<td className="p-2 text-right">{formatBRL(total)}</td></tr></tfoot>
        </table></div>
      )}
      <Button variant="outline" className="h-11 w-full rounded-xl" onClick={exportar}><Download />Exportar CSV</Button>
    </section>
  );
}
