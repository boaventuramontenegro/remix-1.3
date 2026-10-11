import { Button } from './ui/button';
import { useGastoSheet } from './GastoSheet';
import { CategoriaIcone } from '@/lib/icons';
import { displayDate,labelForma } from '@/lib/format';
import { Valor } from '@/lib/ocultar';
import type { Categoria,Gasto } from '@/lib/queries';
export function ExpenseList({gastos,categorias}:{gastos:Gasto[];categorias:Categoria[]}){const {abrir}=useGastoSheet();return <div className="divide-y">{gastos.map(g=>{const c=categorias.find(c=>c.id===g.categoria_id);return <Button key={g.id} variant="ghost" onClick={()=>abrir(g)} className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none px-0 py-3 text-left"><CategoriaIcone icone={c?.icone} cor={c?.cor}/><span className="min-w-0 flex-1"><span className="block truncate font-medium">{g.descricao||c?.nome||'Gasto'}</span><span className="block text-xs text-muted-foreground">{displayDate(g.data)} · {labelForma(g.forma_pagamento)}</span></span><Valor v={Number(g.valor)} className="shrink-0 font-semibold tabular-nums" /></Button>;})}</div>;}
