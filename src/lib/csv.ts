import type { Categoria, Gasto } from "./queries";
import { displayDate, labelForma } from "./format";

const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function gastosToCSV(gastos: Gasto[], categorias: Categoria[]) {
  const header = ["Data", "Descrição", "Categoria", "Valor (R$)", "Pagamento", "Recorrente", "Observação"];
  const rows = gastos.map((g) => [
    displayDate(g.data),
    g.descricao,
    categorias.find((c) => c.id === g.categoria_id)?.nome ?? "Sem categoria",
    Number(g.valor).toFixed(2).replace(".", ","),
    labelForma(g.forma_pagamento),
    g.recorrente || g.recorrente_origem_id ? "Sim" : "Não",
    g.observacao ?? "",
  ]);
  return [header, ...rows].map((r) => r.map((c) => esc(String(c))).join(";")).join("\r\n");
}

export function downloadCSV(nome: string, conteudo: string) {
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
