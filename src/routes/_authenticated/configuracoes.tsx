import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Bell, ChevronRight, Database, Download, Lock, Palette, SlidersHorizontal, Smartphone } from "lucide-react";
import { accountQuery, usePreferences, useSavePreferences, type Config } from "@/lib/preferences";
import { applyTheme } from "@/lib/theme";
import { FORMAS_PAGAMENTO } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { useInstallPrompt } from "@/lib/pwa";
import { assinarPush, cancelarPush, isIOS, isStandalone } from "@/lib/push-client";
import { enviarTeste } from "@/lib/push.functions";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { DeviceSecuritySettings } from "@/components/DeviceSecuritySettings";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageMeta("Configurações", "Tema, instalação, preferências, dados, notificações e segurança."),
  component: Configuracoes,
});

const Row = ({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{label}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>{children}</div>
);

/** Card memoizado: só re-renderiza quando seu conteúdo ou o indicador "Salvo ✓" muda. */
const Card = memo(function Card({ icon: I, title, salvo, children }: { icon: typeof Bell; title: string; salvo?: boolean; children: ReactNode }) {
  return (
    <section className="surface divide-y rounded-3xl">
      <h2 className="flex items-center gap-2 pb-3 font-semibold">
        <I size={18} className="text-primary" />{title}
        {salvo && <span className="ml-auto text-xs font-medium text-primary">Salvo ✓</span>}
      </h2>
      {children}
    </section>
  );
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
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();
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
  }, []);
  const instalar = async () => { if (await install()) { setInstalado(true); toast.success("App instalado"); } };

  const toggleNotif = async (on: boolean) => {
    if (on) {
      if (!("Notification" in window)) { toast.error(ios ? "No iPhone, instale o app na Tela de Início para receber notificações." : "Seu navegador não suporta notificações."); return; }
      const p = await Notification.requestPermission(); setPerm(p);
      if (p !== "granted") { toast.error("Permissão negada. Libere nas configurações do navegador."); return; }
      try { if (!(await assinarPush())) toast.message("As notificações funcionam no app publicado/instalado."); } catch { toast.error("Não foi possível ativar as notificações."); return; }
      set({ notif_ativas: true, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone });
    } else { await cancelarPush().catch(() => {}); set({ notif_ativas: false }); }
  };
  const teste = async () => {
    try { const r = await enviarTeste(); r.enviados ? toast.success("Notificação enviada") : toast.error("Nenhum aparelho inscrito ainda."); } catch { toast.error("Não foi possível enviar."); }
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
      <Card icon={Smartphone} title="Aplicativo">
        <div className="space-y-2 py-3">
          <Button className="w-full rounded-xl" disabled={instalado || (!canInstall && !ios)} onClick={instalar}><Download />{instalado ? "App instalado" : "Instalar app"}</Button>
          {!instalado && ios && <p className="text-xs text-muted-foreground">No iPhone: toque em <strong>Compartilhar</strong> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.</p>}
          {!instalado && !ios && !canInstall && <p className="text-xs text-muted-foreground">Abra o app publicado no Chrome para instalar com um toque.</p>}
        </div>
      </Card>
      <Card icon={SlidersHorizontal} title="Preferências" salvo={salvo}>
        <Row label="Semana começa"><Seg value={config.semana_inicia} options={[[1, "Segunda"], [0, "Domingo"]]} onChange={(v) => set({ semana_inicia: v })} /></Row>
        <button type="button" onClick={() => setSheetDia(true)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
          <div><p className="text-sm font-medium">Mês começa no dia</p><p className="text-xs text-muted-foreground">Seu mês financeiro</p></div>
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">Dia {config.dia_inicio_mes}<ChevronRight size={16} /></span>
        </button>
        <div className="py-3"><p className="mb-2 text-sm font-medium">Pagamento padrão</p><div className="flex flex-wrap gap-2">{FORMAS_PAGAMENTO.map((f) => (
          <button key={f.value} type="button" onClick={() => set({ pagamento_padrao: f.value })} className={chip(config.pagamento_padrao === f.value)}>{f.label}</button>
        ))}</div></div>
      </Card>
      <Card icon={Database} title="Dados">
        <div className="py-3">
          <Button variant="outline" className="w-full rounded-xl text-destructive" onClick={() => setConfirmApagar(true)}>Apagar todos os gastos</Button>
        </div>
      </Card>
      <Card icon={Bell} title="Notificações" salvo={salvo}>
        <Row label="Ativar notificações"><Switch checked={config.notif_ativas} onCheckedChange={toggleNotif} /></Row>
        {perm === "denied" && <p className="py-2 text-xs text-destructive">As notificações estão bloqueadas. Toque no cadeado ao lado do endereço (ou nas configurações do app) e permita notificações.</p>}
        {ios && !instalado && <p className="py-2 text-xs text-muted-foreground">No iPhone, as notificações só funcionam com o app instalado na Tela de Início.</p>}
        {(['manha','tarde','noite'] as const).map(turno=><Row key={turno} label={turno==='manha'?'Manhã':turno==='tarde'?'Tarde':'Noite'}><div className="flex items-center gap-2"><Button variant="ghost" onClick={()=>{const [h,m]=config[`lembrete_${turno}_horario`].split(':');setHora(h ?? '09');setMinuto(m ?? '00');setHorarioSheet(turno);}}>{config[`lembrete_${turno}_horario`].slice(0,5)}<ChevronRight size={16}/></Button><Switch aria-label={`Lembrete ${turno}`} checked={config[`lembrete_${turno}`]} onCheckedChange={v=>set({[`lembrete_${turno}`]:v})}/></div></Row>)}
        {config.notif_ativas && <Row label="Aviso de 80% do orçamento"><Switch checked={config.notif_limite_80} onCheckedChange={(v) => set({ notif_limite_80: v })} /></Row>}
        {config.notif_ativas && <div className="py-3"><Button variant="outline" className="w-full rounded-xl" onClick={teste}>Enviar notificação de teste</Button></div>}
      </Card>
      <Card icon={Lock} title="Segurança neste aparelho" salvo={salvo}>
        {user && <DeviceSecuritySettings userId={user.id} themeId={config.pin_tema} timeout={config.pin_tempo_bloqueio} onTimeout={v => set({ pin_tempo_bloqueio: v })} onTheme={v => set({ pin_tema: v })} />}
      </Card>

      <BottomSheet open={!!horarioSheet} onOpenChange={o=>!o&&setHorarioSheet(null)} title="Horário do lembrete">
        <div className="grid grid-cols-2 gap-4"><div><p className="mb-2 text-sm font-medium">Hora</p><div className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto">{Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><Button key={h} variant={hora===h?'default':'outline'} onClick={()=>setHora(h)}>{h}</Button>)}</div></div><div><p className="mb-2 text-sm font-medium">Minuto</p><div className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto">{["00","15","30","45"].map(m=><Button key={m} variant={minuto===m?'default':'outline'} onClick={()=>setMinuto(m)}>{m}</Button>)}</div></div></div>
        <Button className="mt-4 h-12 w-full" onClick={()=>{if(horarioSheet)set({[`lembrete_${horarioSheet}_horario`]:`${hora}:${minuto}`, fuso_horario:Intl.DateTimeFormat().resolvedOptions().timeZone});setHorarioSheet(null);}}>Salvar horário</Button>
      </BottomSheet>
      <BottomSheet open={sheetDia} onOpenChange={setSheetDia} title="Mês começa no dia" description="Escolha o dia em que seu mês financeiro começa.">
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
