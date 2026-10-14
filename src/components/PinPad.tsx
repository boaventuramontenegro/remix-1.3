import { useEffect, useState } from "react";
import { Delete, Fingerprint } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./ui/button";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function TecladoPin({ valor, onChange, disabled, onDigits, dark, tamanho = 4, themed, bioKey }: {
  valor: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onDigits?: (v: string) => void;
  dark?: boolean;
  tamanho?: number;
  themed?: boolean;
  /** Quando definido, a posição vazia à esquerda do 0 vira a tecla da digital. */
  bioKey?: () => void;
}) {
  const keyClass = `h-16 rounded-2xl text-2xl ${themed ? "pin-key" : ""} ${dark ? "border border-brand-white/20 text-brand-white hover:bg-brand-white/20 hover:text-brand-white" : "border border-border"}`;
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {TECLAS.map((n, i) => n === "" ? (bioKey
        ? <Button key={i} type="button" variant="ghost" disabled={disabled} aria-label="Usar impressão digital" className={keyClass} onClick={bioKey}><Fingerprint className="size-7" /></Button>
        : <span key={i} />) : (
        <Button
          key={n}
          type="button"
          disabled={disabled}
          variant="ghost"
          aria-label={n === "del" ? "Apagar dígito" : `Dígito ${n}`}
          className={`h-16 rounded-2xl text-2xl ${themed ? "pin-key" : ""} ${dark ? "border border-brand-white/20 text-brand-white hover:bg-brand-white/20 hover:text-brand-white" : "border border-border"}`}
          onClick={() => {
            const next = n === "del" ? valor.slice(0, -1) : valor.length < tamanho ? valor + n : valor;
            onChange(next);
            if (n !== "del" && next.length === tamanho) onDigits?.(next);
          }}
        >
          {n === "del" ? <Delete /> : n}
        </Button>
      ))}
    </div>
  );
}

export function BolinhasPin({ quantas, dark, tremor, tamanho = 4, themed }: { quantas: number; dark?: boolean; tremor?: boolean; tamanho?: number; themed?: boolean }) {
  return (
    <div className={`flex gap-4 ${tremor ? "animate-[tremor_0.3s]" : ""}`} aria-label={`${quantas} dígitos digitados`}>
      {Array.from({ length: tamanho }, (_, i) => i).map((i) => (
        <span key={i} className={`h-3 w-3 rounded-full border ${themed ? "pin-dot" : ""} ${quantas > i ? "pin-dot-filled" : ""} ${dark ? "border-brand-white" : "border-foreground"} ${quantas > i ? (dark ? "bg-brand-white" : "bg-foreground") : ""}`} />
      ))}
    </div>
  );
}

/** Bottom sheet que pede o PIN atual (4 bolinhas + teclado) e confirma com onOk. */
export function PedirPinSheet({ open, onOpenChange, titulo = "Confirmar PIN", tamanho = 4, onVerificar }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo?: string;
  tamanho?: number;
  onVerificar: (pin: string) => Promise<boolean>;
}) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [tremor, setTremor] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPin(""); setErro(""); }, [open, tamanho]);

  const fechar = (v: boolean) => { if (!v) { setPin(""); setErro(""); } onOpenChange(v); };

  const completou = async (v: string) => {
    setBusy(true);
    try {
      if (await onVerificar(v)) { fechar(false); return; }
      setErro("PIN incorreto");
      setTremor(true);
      setTimeout(() => { setTremor(false); setPin(""); }, 350);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível verificar.");
      setPin("");
    } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onOpenChange={fechar} title={titulo} description={`Digite seu PIN atual de ${tamanho} dígitos.`}>
      <div className="flex flex-col items-center gap-6 py-2">
        <BolinhasPin quantas={pin.length} tremor={tremor} tamanho={tamanho} />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <TecladoPin valor={pin} onChange={setPin} disabled={busy} onDigits={completou} tamanho={tamanho} />
      </div>
    </BottomSheet>
  );
}

/** Bottom sheet "Criar PIN" com 4 bolinhas e teclado próprio; confirma e avisa se não coincidir. */
export function CriarPinSheet({ open, onOpenChange, onCriar, tamanho = 4 }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCriar: (pin: string) => Promise<void>;
  tamanho?: number;
}) {
  const [etapa, setEtapa] = useState<"criar" | "confirmar">("criar");
  const [pin, setPin] = useState("");
  const [primeiro, setPrimeiro] = useState("");
  const [erro, setErro] = useState("");
  const [tremor, setTremor] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setEtapa("criar"); setPin(""); setPrimeiro(""); setErro(""); }, [open, tamanho]);

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
    try { await onCriar(v); fechar(false); } catch { setErro("Não foi possível salvar o PIN."); setPin(""); } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onOpenChange={fechar} title={etapa === "criar" ? "Criar PIN" : "Confirmar PIN"} description={`Escolha ${tamanho} dígitos. Só um hash seguro fica no aparelho.`}>
      <div className="flex flex-col items-center gap-6 py-2">
        <BolinhasPin quantas={pin.length} tremor={tremor} tamanho={tamanho} />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <TecladoPin valor={pin} onChange={setPin} disabled={busy} onDigits={completou} tamanho={tamanho} />
      </div>
    </BottomSheet>
  );
}
