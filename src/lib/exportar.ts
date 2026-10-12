import type { Categoria, Gasto } from "./queries";
import { displayDate, labelForma, formatBRL, valoresOcultos, OCULTO } from "./format";
import { downloadCSV } from "./csv";

export type Formato = "pdf" | "txt" | "csv" | "xlsx" | "json";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const HEAD = ["Data", "Categoria", "Descrição", "Valor", "Forma de pagamento", "Observação"];

function linhas(gastos: Gasto[], cats: Categoria[]) {
  return gastos.map((g) => [
    displayDate(g.data),
    cats.find((c) => c.id === g.categoria_id)?.nome ?? "Sem categoria",
    g.descricao,
    formatBRL(Number(g.valor)),
    labelForma(g.forma_pagamento),
    g.observacao ?? "",
  ]);
}

function baixar(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarGastos(formato: Formato, gastos: Gasto[], cats: Categoria[], base: string) {
  const rows = linhas(gastos, cats);
  if (formato === "csv") {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    downloadCSV(`${base}.csv`, [HEAD, ...rows].map((r) => r.map(esc).join(";")).join("\r\n"));
  } else if (formato === "txt") {
    const txt = rows.map((r) => r.filter(Boolean).join(" | ")).join("\n");
    baixar(`${base}.txt`, new Blob([`Meu Bolso — ${HEAD.join(" | ")}\n\n${txt}\n`], { type: "text/plain;charset=utf-8" }));
  } else if (formato === "json") {
    const data = gastos.map((g, i) => ({ data: g.data, categoria: rows[i]?.[1], descricao: g.descricao, valor: valoresOcultos() ? OCULTO : Number(g.valor), forma_pagamento: rows[i]?.[4], observacao: g.observacao ?? "" }));
    baixar(`${base}.json`, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  } else if (formato === "xlsx") {
    const XLSX = await import("xlsx");
    const data = gastos.map((g, i) => ({ Data: rows[i]?.[0], Categoria: rows[i]?.[1], "Descrição": rows[i]?.[2], "Valor (R$)": valoresOcultos() ? OCULTO : Number(g.valor), "Forma de pagamento": rows[i]?.[4], "Observação": rows[i]?.[5] }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Gastos");
    XLSX.writeFile(wb, `${base}.xlsx`);
  } else {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text("Meu Bolso — Gastos", 14, 16);
    autoTable(doc, {head:[HEAD],body:rows,startY:24,styles:{fontSize:9,overflow:'linebreak'},foot:[['','','Total',formatBRL(gastos.reduce((t,g)=>t+Number(g.valor),0)),'','']]});
    doc.save(`${base}.pdf`);
  }
}
