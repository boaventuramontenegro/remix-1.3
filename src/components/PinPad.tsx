import { useState } from "react";
import { Delete } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./ui/button";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function TecladoPin({ valor, onChange, disabled, onDigits, dark }: {
  valor: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onDigits?: (v: string) => void;
  dark?: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {TECLAS.map((n, i) => n === "" ? <span key={i} /> : (
        <Button
          key={n}
          type="button"
          disabled={disabled}
          variant="ghost"
          aria-label={n === "del" ? "Apagar dígito" : `Dígito ${n}`}
          className={`h-16 rounded-2xl text-2xl ${dark ? "border border-brand-white/20 text-brand-white hover:bg-brand-white/20 hover:text-brand-white" : "border border-border"}`}
          onClick={() => {
            const next = n === "del" ? valor.slice(0, -1) : valor.length < 4 ? valor + n : valor;
            onChange(next);
            if (n !== "del" && next.length === 4) onDigits?.(next);
          }}
        >
          {n === "del" ? <Delete /> : n}
        </Button>
      ))}
    </div>
  );
}

export function BolinhasPin({ quantas, dark, tremor }: { quantas: number; dark?: boolean; tremor?: boolean }) {
  return (
    <div className={`flex gap-4 ${tremor ? "animate-[tremor_0.3s]" : ""}`} aria-label={`${quantas} dígitos digitados`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-3 w-3 rounded-full border ${dark ? "border-brand-white" : "border-foreground"} ${quantas > i ? (dark ? "bg-brand-white" : "bg-foreground") : ""}`} />
      ))}
    </div>
  );
}

/** Bottom sheet "Criar PIN" com 4 bolinhas e teclado próprio; confirma e avisa se não coincidir. */
export function CriarPinSheet({ open, onOpenChange, onCriar }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCriar: (pin: string) => Promise<void>;
}) {
  const [etapa, setEtapa] = useState<"criar" | "confirmar">("criar");
  const [pin, setPin] = useState("");
  const [primeiro, setPrimeiro] = useState("");
  const [erro, setErro] = useState("");
  const [tremor, setTremor] = useState(false);
  const [busy, setBusy] = useState(false);

  const fechar = (v: boolean) => {
    if (!v) { setEtapa("criar"); setPin(""); setPrimeiro(""); setErro(""); }
    onOpenChange(v);
  };

  const completou = async (v: string) => {
    if (etapa === "criar") { setPrimeiro(v); setEtapa("confirmar"); setPin(""); return; }
    if (v !== primeiro) {
      setErro("Os PINs não coincidem");
      setTremor(true);
      setTimeout(() => { setTremor(false); setPin(""); setEtapa("criar"); setPrimeiro(""); }, 350);
      return;
    }
    setBusy(true);
    try { await onCriar(v); fechar(false); } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onOpenChange={fechar} title={etapa === "criar" ? "Criar PIN" : "Confirmar PIN"} description="Escolha 4 dígitos. Só um código seguro fica no aparelho.">
      <div className="flex flex-col items-center gap-6 py-2">
        <BolinhasPin quantas={pin.length} tremor={tremor} />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <TecladoPin valor={pin} onChange={setPin} disabled={busy} onDigits={completou} />
      </div>
    </BottomSheet>
  );
}
