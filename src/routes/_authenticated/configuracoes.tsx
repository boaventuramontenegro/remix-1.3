import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Bell, Database, Download, Lock, Palette, SlidersHorizontal, Smartphone } from "lucide-react";
import { accountQuery, usePreferences, useSavePreferences, type Config } from "@/lib/preferences";
import { createPin, enableBiometric, pinKey, readPin } from "@/lib/device-security";
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

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageMeta("Configurações", "Tema, instalação, preferências, dados, notificações e segurança."),
  component: Configuracoes,
});

const Row = ({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{label}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>{children}</div>
);
const Card = ({ icon: I, title, children }: { icon: typeof Bell; title: string; children: ReactNode }) => (
  <section className="surface divide-y rounded-3xl"><h2 className="flex items-center gap-2 pb-3 font-semibold"><I size={18} className="text-primary" />{title}</h2>{children}</section>
);
function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="flex rounded-xl bg-muted p-1">{options.map(([v, l]) => <button key={String(v)} type="button" onClick={() => onChange(v)} className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>;
}

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
  const [temPin, setTemPin] = useState(false);
  const [bio, setBio] = useState(false);
  const [apagar, setApagar] = useState(false);
  useEffect(() => { setInstalado(isStandalone()); setIos(isIOS()); if ("Notification" in window) setPerm(Notification.permission); }, []);
  useEffect(() => { if (user) { const r = readPin(user.id); setTemPin(!!r); setBio(!!r?.credential); } }, [user?.id]);

  const set = async (patch: Partial<Config>) => {
    try { await save.mutateAsync(patch); toast.success("Configuração salva"); } catch { toast.error("Não foi possível salvar."); }
  };
  const instalar = async () => { if (await install()) { setInstalado(true); toast.success("App instalado"); } };

  const togglePin = async (on: boolean) => {
    if (!user) return;
    if (!on) { localStorage.removeItem(pinKey(user.id)); setTemPin(false); setBio(false); toast.success("PIN desativado"); return; }
    const p = window.prompt("Crie um PIN de 4 dígitos");
    if (!p) return;
    if (window.prompt("Repita o PIN") !== p) { toast.error("Os PINs não conferem."); return; }
    try { await createPin(user.id, p); setTemPin(true); toast.success("PIN ativado"); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar PIN."); }
  };
  const toggleBio = async (on: boolean) => {
    if (!user) return;
    if (!on) { const r = readPin(user.id); if (r) { delete r.credential; localStorage.setItem(pinKey(user.id), JSON.stringify(r)); } setBio(false); return; }
    try { await enableBiometric(user.id); setBio(true); toast.success("Biometria ativada"); } catch { toast.error("Este aparelho não permitiu ativar a biometria."); }
  };
  const toggleNotif = async (on: boolean) => {
    if (on) {
      if (!("Notification" in window)) { toast.error(ios ? "No iPhone, instale o app na Tela de Início para receber notificações." : "Seu navegador não suporta notificações."); return; }
      const p = await Notification.requestPermission(); setPerm(p);
      if (p !== "granted") { toast.error("Permissão negada. Libere nas configurações do navegador."); return; }
      try { if (!(await assinarPush())) toast.message("As notificações funcionam no app publicado/instalado."); } catch { toast.error("Não foi possível ativar as notificações."); return; }
      await set({ notif_ativas: true, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone });
    } else { await cancelarPush().catch(() => {}); await set({ notif_ativas: false }); }
  };
  const teste = async () => {
    try { const r = await enviarTeste(); r.enviados ? toast.success("Notificação enviada") : toast.error("Nenhum aparelho inscrito ainda."); } catch { toast.error("Não foi possível enviar."); }
  };
  const apagarGastos = async () => {
    if (!user) return;
    const { error } = await supabase.from("gastos").delete().eq("user_id", user.id);
    if (error) { toast.error("Não foi possível apagar."); return; }
    setApagar(false); qc.invalidateQueries({ queryKey: ["gastos"] }); toast.success("Todos os gastos foram apagados");
  };

  return (
    <div className="space-y-5">
      <Card icon={Palette} title="Aparência">
        <div className="py-3"><Seg value={config.tema} options={[["light", "Claro"], ["dark", "Escuro"], ["auto", "Automático"]]} onChange={(v) => { applyTheme(v); set({ tema: v }); }} /></div>
      </Card>
      <Card icon={Smartphone} title="Aplicativo">
        <div className="space-y-2 py-3">
          <Button className="w-full rounded-xl" disabled={instalado || (!canInstall && !ios)} onClick={instalar}><Download />{instalado ? "App instalado" : "Instalar app"}</Button>
          {!instalado && ios && <p className="text-xs text-muted-foreground">No iPhone: toque em <strong>Compartilhar</strong> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.</p>}
          {!instalado && !ios && !canInstall && <p className="text-xs text-muted-foreground">Abra o app publicado no Chrome para instalar com um toque.</p>}
        </div>
      </Card>
      <Card icon={SlidersHorizontal} title="Preferências">
        <Row label="Semana começa"><Seg value={config.semana_inicia} options={[[1, "Segunda"], [0, "Domingo"]]} onChange={(v) => set({ semana_inicia: v })} /></Row>
        <Row label="Mês começa no dia" desc="Seu mês financeiro">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" className="rounded-full" onClick={() => config.dia_inicio_mes > 1 && set({ dia_inicio_mes: config.dia_inicio_mes - 1 })}>−</Button>
            <span className="w-6 text-center text-lg font-bold">{config.dia_inicio_mes}</span>
            <Button size="icon" variant="outline" className="rounded-full" onClick={() => config.dia_inicio_mes < 28 && set({ dia_inicio_mes: config.dia_inicio_mes + 1 })}>+</Button>
          </div>
        </Row>
        <div className="py-3"><p className="mb-2 text-sm font-medium">Pagamento padrão</p><div className="flex flex-wrap gap-2">{FORMAS_PAGAMENTO.map((f) => (
          <button key={f.value} type="button" onClick={() => set({ pagamento_padrao: f.value })} className={`rounded-full border px-3 py-1.5 text-sm ${config.pagamento_padrao === f.value ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{f.label}</button>
        ))}</div></div>
      </Card>
      <Card icon={Database} title="Dados">
        <div className="space-y-2 py-3">
          {!apagar ? <Button variant="outline" className="w-full rounded-xl text-destructive" onClick={() => setApagar(true)}>Apagar todos os gastos</Button> : (
            <div className="space-y-2 rounded-xl bg-destructive/10 p-3"><p className="text-sm">Isso apaga <strong>todos os seus gastos</strong> para sempre. Sua conta e categorias continuam.</p>
              <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setApagar(false)}>Cancelar</Button><Button variant="destructive" className="flex-1 rounded-xl" onClick={apagarGastos}>Apagar</Button></div></div>
          )}
        </div>
      </Card>
      <Card icon={Bell} title="Notificações">
        <Row label="Ativar notificações"><Switch checked={config.notif_ativas} onCheckedChange={toggleNotif} /></Row>
        {perm === "denied" && <p className="py-2 text-xs text-destructive">As notificações estão bloqueadas. Toque no cadeado ao lado do endereço (ou nas configurações do app) e permita notificações.</p>}
        {ios && !instalado && <p className="py-2 text-xs text-muted-foreground">No iPhone, as notificações só funcionam com o app instalado na Tela de Início.</p>}
        {config.notif_ativas && <Row label="Lembrete diário" desc="Horário para lembrar de registrar"><Input type="time" className="h-10 w-28 rounded-xl" defaultValue={String(config.notif_horario).slice(0, 5)} onBlur={(e) => e.target.value && set({ notif_horario: e.target.value })} /></Row>}
        {config.notif_ativas && <Row label="Aviso de 80% do orçamento"><Switch checked={config.notif_limite_80} onCheckedChange={(v) => set({ notif_limite_80: v })} /></Row>}
        {config.notif_ativas && <div className="py-3"><Button variant="outline" className="w-full rounded-xl" onClick={teste}>Enviar notificação de teste</Button></div>}
      </Card>
      <Card icon={Lock} title="Segurança neste aparelho">
        <Row label="Bloquear com PIN" desc="Só um código seguro fica no aparelho"><Switch checked={temPin} onCheckedChange={togglePin} /></Row>
        {temPin && <Row label="Desbloquear com biometria"><Switch checked={bio} onCheckedChange={toggleBio} /></Row>}
        {temPin && <div className="py-3"><p className="mb-2 text-sm font-medium">Bloquear após</p><Seg value={config.pin_tempo_bloqueio} options={[[0, "Na hora"], [60, "1 min"], [300, "5 min"]]} onChange={(v) => set({ pin_tempo_bloqueio: v })} /></div>}
        {temPin && <div className="py-3"><Button variant="ghost" className="w-full rounded-xl text-destructive" onClick={async () => { if (user) localStorage.removeItem(pinKey(user.id)); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }}>Esqueci o PIN</Button></div>}
      </Card>
    </div>
  );
}
