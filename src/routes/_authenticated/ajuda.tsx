import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/page-meta";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => pageMeta("Ajuda e sugestão", "Perguntas frequentes e envio de sugestões ou erros."),
  component: Ajuda,
});

const FAQ: [string, string][] = [
  ["Como registro um gasto?", "Toque no botão + verde no centro da barra inferior."],
  ["Como escondo os valores?", "Toque no ícone de olho ao lado do seu perfil, no topo da tela."],
  ["Gastos recorrentes duplicam?", "Não. Eles são lançados uma única vez por mês, automaticamente."],
  ["Como bloqueio o app?", "Defina um PIN em Configurações > Segurança e use \"Bloquear app\" no menu do perfil."],
  ["Como exporto meus dados?", "Em Relatórios ou Meu perfil, toque em Exportar e escolha o formato."],
];

function Ajuda() {
  const [tipo, setTipo] = useState<"sugestao" | "erro">("sugestao");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (msg.trim().length < 5) { toast.error("Escreva um pouco mais."); return; }
    setEnviando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("sugestoes").insert({ tipo, mensagem: msg.trim(), user_id: user!.id });
    setEnviando(false);
    if (error) { toast.error("Não foi possível enviar."); return; }
    setMsg(""); toast.success("Obrigado! Mensagem enviada.");
  };
  return (
    <div className="space-y-5">
      <section className="surface">
        <h2 className="mb-2 font-semibold">Perguntas frequentes</h2>
        <Accordion type="single" collapsible>
          {FAQ.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </section>
      <section className="surface space-y-3">
        <h2 className="font-semibold">Enviar sugestão ou erro</h2>
        <div className="flex gap-2">{([["sugestao", "Sugestão"], ["erro", "Erro"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTipo(v)} className={`rounded-full border px-3 py-1.5 text-sm ${tipo === v ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{l}</button>
        ))}</div>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Conte pra gente…" className="min-h-28 rounded-xl" />
        <Button className="h-11 w-full rounded-xl" disabled={enviando} onClick={enviar}>Enviar</Button>
      </section>
    </div>
  );
}
