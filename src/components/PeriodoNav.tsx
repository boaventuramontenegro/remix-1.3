import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmt, rangeOf, shift, type Periodo } from "@/lib/format";

/** Seletor de período em card: setas circulares de 40px e bloco central em duas linhas. */
export function PeriodoNav({ periodo, anchor, onAnchor, config }: {
  periodo: Periodo;
  anchor: Date;
  onAnchor: (d: Date) => void;
  config: { semana_inicia: number; dia_inicio_mes: number };
}) {
  const r = rangeOf(periodo, anchor, config);
  const agora = new Date();
  const atual = (() => {
    const ra = rangeOf(periodo, agora, config);
    return r.start.getTime() === ra.start.getTime();
  })();

  let linha1: string, linha2: string;
  if (periodo === "semana") {
    linha1 = `${fmt(r.start, "d")} – ${fmt(r.end, "d MMM")}`;
    linha2 = fmt(r.end, "yyyy");
  } else if (periodo === "mes") {
    const m = fmt(r.end, "MMMM");
    linha1 = m.charAt(0).toUpperCase() + m.slice(1);
    linha2 = fmt(r.end, "yyyy");
  } else {
    linha1 = fmt(r.start, "yyyy");
    linha2 = "";
  }

  const seta = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition active:scale-95";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card p-2 shadow-soft">
      <button type="button" aria-label="Período anterior" className={seta} onClick={() => onAnchor(shift(periodo, anchor, -1))}><ChevronLeft size={20} /></button>
      <button
        type="button"
        onClick={() => onAnchor(new Date())}
        title="Voltar ao período atual"
        className="flex-1 rounded-xl px-2 py-1 text-center transition-colors duration-150"
        key={`${periodo}-${r.start.getTime()}`}
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-base font-bold">{linha1}</span>
          {periodo === "semana" && atual && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">Esta semana</span>}
        </span>
        {linha2 && <span className="block text-xs text-muted-foreground">{linha2}</span>}
      </button>
      <button type="button" aria-label="Próximo período" className={seta} onClick={() => onAnchor(shift(periodo, anchor, 1))}><ChevronRight size={20} /></button>
    </div>
  );
}
