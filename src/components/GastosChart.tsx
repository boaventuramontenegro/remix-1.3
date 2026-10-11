import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { formatBRL, formatBRLCompacto } from '@/lib/format';
import { marcasEixo } from '@/lib/media';
import { useValoresOcultos } from '@/lib/ocultar';

type Ponto = { name: string; valor: number; label?: string };
type Fatia = { name: string; value: number; cor: string };
type TooltipProps = { active?: boolean; payload?: readonly { payload?: { name?: string; label?: string; cor?: string; valor?: number; value?: number }; value?: number }[] };
export function TooltipGasto({ active, payload }: TooltipProps) {
  useValoresOcultos();
  const dado = payload?.[0]?.payload;
  if (!active || !dado) return null;
  const cor = dado.cor ?? 'var(--primary)';
  return <div className="chart-tooltip max-w-56" style={{ borderColor: cor }}><p className="flex items-center gap-2 text-sm"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor }} />{dado.label ?? dado.name}</p><p className="mt-1 font-semibold tabular-nums" style={{ color: cor }}>{formatBRL(dado.valor ?? dado.value ?? 0)}</p></div>;
}
export function GastosBarras({ data }: { data: Ponto[] }) {
  useValoresOcultos();
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const ticks = marcasEixo(Math.max(0, ...data.map(d => d.valor)));
  return <div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer={false} data={data} maxBarSize={26} barCategoryGap="30%">
    <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={0.5} />
    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
    <YAxis width={64} ticks={ticks} domain={[0, ticks[4] ?? 200]} tickFormatter={v => formatBRLCompacto(Number(v))} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
    <Tooltip cursor={false} content={<TooltipGasto />} allowEscapeViewBox={{ x: false, y: false }} />
    <Bar dataKey="valor" radius={[8, 8, 0, 0]} stroke="none" activeBar={false} onClick={(_, i) => setSelecionada(i)}>{data.map((d, i) => <Cell key={d.name} fill={selecionada === i ? 'var(--chart-selected)' : 'var(--primary)'} />)}</Bar>
  </BarChart></ResponsiveContainer></div>;
}
export function GastosRosca({ data }: { data: Fatia[] }) {
  useValoresOcultos();
  return <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer={false}>
    <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="none">{data.map(d => <Cell key={d.name} fill={d.cor} stroke="none" />)}</Pie>
    <Tooltip content={<TooltipGasto />} allowEscapeViewBox={{ x: false, y: false }} />
  </PieChart></ResponsiveContainer></div>;
}