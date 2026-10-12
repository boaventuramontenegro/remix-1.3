import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { formatBRL, setValoresOcultos, valoresOcultos } from './format';
import { usePreferences, useSavePreferences } from './preferences';

const KEY = 'meubolso-ocultar';
const listeners = new Set<() => void>();
// Aplicado na carga do módulo (antes de renderizar) para não piscar.
if (typeof localStorage !== 'undefined') { try { setValoresOcultos(localStorage.getItem(KEY) === '1'); } catch { /* ignore */ } }

function definir(v: boolean) {
  setValoresOcultos(v);
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Estado global de "ocultar valores". Componentes que o chamam re-renderizam ao alternar. */
export function useOcultarValores() {
  const ocultos = useSyncExternalStore(subscribe, valoresOcultos, valoresOcultos);
  const save = useSavePreferences();
  const alternar = () => { const v = !valoresOcultos(); definir(v); save.mutate({ ocultar_valores: v }); };
  return { ocultos, alternar };
}

/** Botão de olho inline (22px, área de toque 44px) para o canto dos cards principais. */
export function OlhoInline({ variante = 'neutro' }: { variante?: 'claro' | 'neutro' }) {
  const { ocultos, alternar } = useOcultarValores();
  return (
    <Button variant="ghost" size="icon"
      type="button"
      onClick={(e) => { e.stopPropagation(); alternar(); }}
      aria-label={ocultos ? 'Mostrar valores' : 'Ocultar valores'}
      aria-pressed={ocultos}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${variante === 'claro' ? 'text-brand-white' : 'text-muted-foreground'}`}
    >
      {ocultos ? <EyeOff size={22} /> : <Eye size={22} />}
    </Button>
  );
}

/** Mostra um valor em R$ respeitando "ocultar valores". */
export function Valor({ v, className }: { v: number; className?: string }) {
  useSyncExternalStore(subscribe, valoresOcultos, valoresOcultos);
  return <span className={className}>{formatBRL(v)}</span>;
}

/** Re-renderiza o componente que chamar quando o estado mudar (para textos/gráficos com formatBRL). */
export function useValoresOcultos() { return useSyncExternalStore(subscribe, valoresOcultos, valoresOcultos); }

/** Aplica o valor salvo na conta (outros aparelhos) assim que as configurações carregam. */
export function OcultarSync() {
  const { data } = usePreferences();
  const feito = useRef(false);
  useEffect(() => {
    if (!data || feito.current) return;
    feito.current = true;
    if (!!data.ocultar_valores !== valoresOcultos()) definir(!!data.ocultar_valores);
  }, [data]);
  return null;
}
