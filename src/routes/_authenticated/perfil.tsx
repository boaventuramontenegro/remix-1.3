import { useValoresOcultos } from '@/lib/ocultar';
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { accountQuery, profileQuery, useSaveProfile } from "@/lib/preferences";
import { gastosTodosQuery } from "@/lib/queries";

import { fmt } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => pageMeta("Meu perfil", "Seu nome, senha e conta no Meu Bolso."),
  component: Perfil,
});

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`;

function Perfil() {useValoresOcultos();
  const { data: perfil } = useQuery(profileQuery);
  const { data: user } = useQuery(accountQuery);
  const { data: gastos = [] } = useQuery(gastosTodosQuery);
  const save = useSaveProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [confirma, setConfirma] = useState("");
  useEffect(() => { if (perfil) setNome(perfil.nome); }, [perfil?.nome]);

  const salvarNome = async () => {
    try { await save.mutateAsync(nome); toast.success("Nome atualizado"); } catch { toast.error("Não foi possível salvar."); }
  };
  const trocarSenha = async () => {
    if (senha.length < 8) { toast.error("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (senha !== senha2) { toast.error("As senhas não conferem."); return; }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { toast.error("Não foi possível alterar a senha."); return; }
    setSenha(""); setSenha2(""); toast.success("Senha alterada");
  };
  const sair = async () => { qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };
  const excluirConta = async () => {
    if (confirma !== "EXCLUIR") { toast.error('Digite EXCLUIR para confirmar.'); return; }
    const { error } = await supabase.rpc("excluir_minha_conta");
    if (error) { toast.error("Não foi possível excluir a conta."); return; }
    qc.clear(); await supabase.auth.signOut();
    toast.success("Conta excluída");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" asChild className="-ml-2 rounded-xl"><Link to="/inicio"><ArrowLeft />Voltar</Link></Button>
      <section className="surface space-y-3">
        <div className="space-y-2"><Label htmlFor="pnome">Nome</Label><Input id="pnome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-xl" /></div>
        <Button className="w-full rounded-xl" disabled={save.isPending} onClick={salvarNome}>Salvar</Button>
        <div className="space-y-2"><Label htmlFor="pemail">E-mail</Label><Input id="pemail" value={user?.email ?? ""} readOnly disabled className="h-11 rounded-xl" /></div>
      </section>
      <section className="surface space-y-1 text-sm">
        <h2 className="mb-2 font-semibold">Resumo da conta</h2>
        <p>Conta criada em {user?.created_at ? fmt(new Date(user.created_at), "dd/MM/yyyy") : "—"}</p>
        <p>{gastos.length} gastos registrados</p>
      </section>
      <section className="surface space-y-3">
        <h2 className="font-semibold">Alterar senha</h2>
        <Input type="password" placeholder="Nova senha" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="h-11 rounded-xl" />
        <Input type="password" placeholder="Confirmar senha" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} className="h-11 rounded-xl" />
        <Button variant="outline" className="w-full rounded-xl" onClick={trocarSenha}><KeyRound />Alterar senha</Button>
      </section>
      <Button variant="outline" className="h-11 w-full rounded-xl" onClick={sair}><LogOut />Sair da conta</Button>
      <section className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="font-semibold text-destructive">Excluir conta</h2>
        <p className="text-sm text-muted-foreground">Apaga sua conta e todos os seus dados para sempre. Digite <strong>EXCLUIR</strong> para confirmar.</p>
        <Input value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="EXCLUIR" className="h-11 rounded-xl" />
        <Button variant="destructive" className="w-full rounded-xl" disabled={confirma !== "EXCLUIR"} onClick={excluirConta}><Trash2 />Excluir minha conta</Button>
      </section>
    </div>
  );
}
