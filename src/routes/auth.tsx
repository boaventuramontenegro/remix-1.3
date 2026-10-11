import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarcaHero } from "@/components/Logo";
import { pageMeta } from "@/lib/page-meta";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => pageMeta("Entrar", "Entre ou crie sua conta no Meu Bolso."),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [aguardando, setAguardando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/inicio", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin, data: { nome: nome.trim() } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/inicio", replace: true });
        else setAguardando(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("Invalid login") ? "E-mail ou senha incorretos." :
        msg.includes("already registered") ? "Este e-mail já está cadastrado." :
        msg.includes("Email not confirmed") ? "Confirme seu e-mail antes de entrar." :
        msg.includes("Password") ? "A senha precisa ter pelo menos 6 caracteres." :
        "Não foi possível continuar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-hero px-6 pb-16 pt-16 text-brand-white">
        <div className="mx-auto max-w-md">
          <h1><MarcaHero /></h1>
          <p className="mt-2 text-brand-white/85 leading-relaxed">Seus gastos de casa, organizados e sem susto no fim do mês.</p>
        </div>
      </div>
      <div className="-mt-8 flex-1 px-4">
        <div className="mx-auto max-w-md rounded-3xl bg-card p-6 shadow-soft">
          {aguardando ? (
            <div className="py-6 text-center">
              <h2 className="text-xl font-semibold">Confirme seu e-mail</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um link para <strong>{email}</strong>. Clique nele para ativar sua conta e depois entre aqui.
              </p>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={() => { setAguardando(false); setModo("entrar"); }}>
                Voltar para entrar
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
                {(["entrar", "cadastrar"] as const).map((m) => (
                  <Button type="button" variant="ghost"
                    key={m}
                    onClick={() => setModo(m)}
                    className={`rounded-xl py-2 text-sm font-semibold transition ${modo === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
                  >
                    {m === "entrar" ? "Entrar" : "Criar conta"}
                  </Button>
                ))}
              </div>
              <form onSubmit={submit} className="space-y-4">
                {modo === "cadastrar" && <div className="space-y-2"><Label htmlFor="nome">Nome (opcional)</Label><Input id="nome" value={nome} onChange={e=>setNome(e.target.value)} autoComplete="given-name" className="h-12 rounded-xl" /></div>}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" type="password" minLength={6} autoComplete={modo === "entrar" ? "current-password" : "new-password"} required value={senha} onChange={(e) => setSenha(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base">
                  {loading ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
