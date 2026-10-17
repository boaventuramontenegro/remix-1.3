import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Bell, ChevronDown, ChevronRight, Database, Lock, Palette, SlidersHorizontal } from "lucide-react";
import { accountQuery, usePreferences, useSavePreferences, type Config } from "@/lib/preferences";
import { applyTheme } from "@/lib/theme";
import { FORMAS_PAGAMENTO } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { pushReportMessage } from "@/lib/push-result";
import { assinarPush, cancelarPush, isIOS, isStandalone, statusPush } from "@/lib/push-client";
import { enviarTeste } from "@/lib/push.functions";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { DeviceSecuritySettings } from "@/components/DeviceSecuritySettings";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageMeta("Configurações", "Tema, preferências, segurança do aparelho, notificações e dados."),
  component: Configuracoes,
});

const Row = ({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{label}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>{children}</div>
);

/** Card memoizado: só re-renderiza quando seu conteúdo ou o indicador "Salvo ✓" muda. */
export const Card = memo(function Card({ icon: I, title, salvo, children, collapsible = false }: { icon: typeof Bell; title: string; salvo?: boolean; children: ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible);
  const id = `card-${title.toLowerCase().replaceAll(' ', '-')}`;
  const label = <><I size={18} className="shrink-0 text-primary" />{title}{salvo && <span className="ml-auto text-xs font-medium text-primary">Salvo ✓</span>}</>;
  return <section className="surface rounded-3xl">
    <h2 className="font-semibold">{collapsible ? <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-0 py-0 text-left text-base font-semibold hover:bg-transparent" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{label}<ChevronDown size={18} className={`ml-auto shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} /></Button> : <span className="flex items-center gap-2">{label}</span>}</h2>
    <div id={id} hidden={!open} className="mt-3 divide-y border-t">{children}</div>
  </section>;
});

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="flex rounded-xl bg-muted p-1">{options.map(([v, l]) => <button key={String(v)} type="button" onClick={() => onChange(v)} className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>;
}

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`;


function Configuracoes() {
  const { config } = usePreferences();
  const save = useSavePreferences();
  const { data: user } = useQuery(accountQuery);
  const qc = useQueryClient();
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  const [horarioSheet, setHorarioSheet] = useState<"manha" | "tarde" | "noite" | null>(null);
  const [hora, setHora] = useState("09");
  const [minuto, setMinuto] = useState("00");
  const [sheetDia, setSheetDia] = useState(false);
  const [confirmApagar, setConfirmApagar] = useState(false);
  const [apagando, setApagando] = useState(false);

  // Indicador "Salvo ✓" + salvamento com debounce de 600 ms (UI atualiza na hora).
  const [salvo, setSalvo] = useState(false);
  const pendente = useRef<Partial<Config>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const esconder = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const set = (patch: Partial<Config>) => {
    qc.setQueryData(["configuracoes"], (old: Config | undefined) => (old ? { ...old, ...patch } : old));
    Object.assign(pendente.current, patch);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const p = pendente.current;
      pendente.current = {};
      try {
        await save.mutateAsync(p);
        setSalvo(true);
        clearTimeout(esconder.current);
        esconder.current = setTimeout(() => setSalvo(false), 1500);
      } catch {
        toast.error("Não foi possível salvar.");
        qc.invalidateQueries({ queryKey: ["configuracoes"] });
      }
    }, 600);
  };

  useEffect(() => {
    setInstalado(isStandalone());
    setIos(isIOS());
    if ("Notification" in window) setPerm(Notification.permission);
    const refresh = () => { if (!document.hidden) { if ('Notification' in window) setPerm(Notification.permission); void statusPush().then(setPushStatus).catch(() => setPushStatus({ ok: false, texto: 'Não foi possível consultar a inscrição. Tente novamente.' })); } };
    refresh(); document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);
  const [pushStatus, setPushStatus] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const toggleNotif = async (on: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (on) {
        if (!("Notification" in window)) throw Error(ios ? "No iPhone, instale o app na Tela de Início para receber notificações." : "Seu navegador não suporta notificações.");
        const p = await Notification.requestPermission(); setPerm(p);
        if (p !== 'granted') throw Error('Permissão negada. Libere nas configurações do navegador.');
        await assinarPush();
        await save.mutateAsync({ notif_ativas: true, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } else {
        await cancelarPush(); await save.mutateAsync({ notif_ativas: false });
      }
      setPushStatus(await statusPush());
    } catch (error) {
      const texto = error instanceof Error ? error.message : 'Não foi possível alterar as notificações. Tente novamente.';
      setPushStatus({ ok: false, texto }); toast.error(texto);
    } finally { setPushBusy(false); }
  };
  const teste = async () => {
    if (pushBusy || !pushStatus?.ok) return;
    setPushBusy(true);
    try {
      const r = await enviarTeste();
      if (r.enviados) toast.success(pushReportMessage(r)); else toast.error(pushReportMessage(r));
      setPushStatus(await statusPush());
    } catch { toast.error('Não foi possível enviar a notificação. Tente novamente.'); }
    finally { setPushBusy(false); }
  };
  const apagarGastos = async () => {
    if (!user) return;
    setApagando(true);
    // Apaga SOMENTE gastos; categorias e conta continuam.
    const { error } = await supabase.from("gastos").delete().eq("user_id", user.id);
    setApagando(false);
    if (error) { toast.error("Não foi possível apagar."); return; }
    setConfirmApagar(false); qc.invalidateQueries({ queryKey: ["gastos"] }); toast.success("Todos os gastos foram apagados");
  };

  return (
    <div className="space-y-5">
      <Card icon={Palette} title="Aparência" salvo={salvo}>
        <div className="py-3"><Seg value={config.tema} options={[["light", "Claro"], ["dark", "Escuro"], ["auto", "Automático"]]} onChange={(v) => { applyTheme(v); set({ tema: v }); }} /></div>
      </Card>
      <Card icon={SlidersHorizontal} title="Preferências" salvo={salvo} collapsible>
        <Row label="Início da semana" desc="Define o primeiro dia dos agrupamentos semanais do aplicativo."><Seg value={config.semana_inicia} options={[[1, "Segunda"], [0, "Domingo"]]} onChange={(v) => set({ semana_inicia: v })} /></Row>
        <button type="button" onClick={() => setSheetDia(true)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
          <div><p className="text-sm font-medium">Seu mês financeiro</p><p className="text-xs text-muted-foreground">Dia em que começa seu ciclo de gastos, relatórios e orçamentos</p></div>
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">Dia {config.dia_inicio_mes}<ChevronRight size={16} /></span>
        </button>
        <div className="py-3"><p className="mb-2 text-sm font-medium">Pagamento padrão</p><div className="flex flex-wrap gap-2">{FORMAS_PAGAMENTO.map((f) => (
          <button key={f.value} type="button" onClick={() => set({ pagamento_padrao: f.value })} className={chip(config.pagamento_padrao === f.value)}>{f.label}</button>
        ))}</div></div>
      </Card>
      <Card icon={Lock} title="Segurança do aparelho" salvo={salvo} collapsible>
        {user && <DeviceSecuritySettings userId={user.id} themeId={config.pin_tema} timeout={config.pin_tempo_bloqueio} onTimeout={v => set({ pin_tempo_bloqueio: v })} onTheme={v => set({ pin_tema: v })} />}
      </Card>
      <Card icon={Bell} title="Notificações" salvo={salvo} collapsible>
        <Row label="Ativar notificações"><Switch aria-label="Ativar notificações" disabled={pushBusy} checked={config.notif_ativas && !!pushStatus?.ok} onCheckedChange={toggleNotif} /></Row>
        {pushStatus && <p className={`py-1 text-xs ${pushStatus.ok ? "text-primary" : "text-muted-foreground"}`}>{pushStatus.texto}</p>}
        {perm === "denied" && <p className="py-2 text-xs text-destructive">As notificações estão bloqueadas. Toque no cadeado ao lado do endereço (ou nas configurações do app) e permita notificações.</p>}
        {ios && !instalado && <p className="py-2 text-xs text-muted-foreground">No iPhone, as notificações só funcionam com o app instalado na Tela de Início.</p>}
        {(['manha','tarde','noite'] as const).map(turno=><Row key={turno} label={turno==='manha'?'Manhã':turno==='tarde'?'Tarde':'Noite'}><div className="flex items-center gap-2"><Button variant="ghost" onClick={()=>{const [h,m]=config[`lembrete_${turno}_horario`].split(':');setHora(h ?? '09');setMinuto(m ?? '00');setHorarioSheet(turno);}}>{config[`lembrete_${turno}_horario`].slice(0,5)}<ChevronRight size={16}/></Button><Switch aria-label={`Lembrete ${turno}`} checked={config[`lembrete_${turno}`]} onCheckedChange={v=>set({[`lembrete_${turno}`]:v})}/></div></Row>)}
        {config.notif_ativas && <Row label="Aviso de 80% do orçamento"><Switch checked={config.notif_limite_80} onCheckedChange={(v) => set({ notif_limite_80: v })} /></Row>}
        {config.notif_ativas && <div className="py-3"><Button variant="outline" className="w-full rounded-xl" disabled={pushBusy || !pushStatus?.ok} onClick={teste}>Enviar notificação de teste</Button></div>}
      </Card>
      <Card icon={Database} title="Dados">
        <div className="py-3">
          <Button variant="outline" className="w-full rounded-xl text-destructive" onClick={() => setConfirmApagar(true)}>Apagar todos os gastos</Button>
        </div>
      </Card>


      <BottomSheet open={!!horarioSheet} onOpenChange={o=>!o&&setHorarioSheet(null)} title="Horário do lembrete">
        <div className="grid grid-cols-2 gap-4"><div><p className="mb-2 text-sm font-medium">Hora</p><div className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto">{Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><Button key={h} variant={hora===h?'default':'outline'} onClick={()=>setHora(h)}>{h}</Button>)}</div></div><div><p className="mb-2 text-sm font-medium">Minuto</p><div className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto">{Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(m=><Button key={m} variant={minuto===m?'default':'outline'} onClick={()=>setMinuto(m)}>{m}</Button>)}</div></div></div>
        <Button className="mt-4 h-12 w-full" onClick={()=>{if(horarioSheet)set({[`lembrete_${horarioSheet}_horario`]:`${hora}:${minuto}`, fuso_horario:Intl.DateTimeFormat().resolvedOptions().timeZone});setHorarioSheet(null);}}>Salvar horário</Button>
      </BottomSheet>
      <BottomSheet open={sheetDia} onOpenChange={setSheetDia} title="Seu mês financeiro" description="Escolha o dia do mês em que começa seu ciclo de gastos, relatórios e orçamentos. Não precisa ser o dia do salário nem o dia em que começou a usar o app.">
        <p className="mb-4 text-sm text-muted-foreground">Exemplo: começando no dia 10, o ciclo vai de 10 de outubro a 9 de novembro. Em 10 de novembro começa o próximo ciclo.</p>
        <div className="grid grid-cols-7 gap-2 pb-2">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { set({ dia_inicio_mes: d }); setSheetDia(false); }}
              className={`flex h-10 items-center justify-center rounded-xl text-sm font-medium transition active:scale-95 ${config.dia_inicio_mes === d ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >{d}</button>
          ))}
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={confirmApagar}
        onOpenChange={setConfirmApagar}
        title="Apagar todos os gastos?"
        description="Isso apaga todos os seus gastos para sempre. Suas categorias e sua conta continuam."
        confirmLabel="Excluir"
        busy={apagando}
        onConfirm={apagarGastos}
      />
    </div>
  );
}
