import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BarChart3, Eye, EyeOff, Home, List, Plus, Tags } from "lucide-react";
import { OcultarSync, useOcultarValores } from "@/lib/ocultar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GastoSheetProvider, useGastoSheet } from "@/components/GastoSheet";
import { ThemeSync } from "@/lib/theme";
import { Logo } from "@/components/Logo";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Button } from "@/components/ui/button";
import { SecurityGate } from "@/components/SecurityGate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const NAV = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/gastos", label: "Gastos", icon: List },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

function Layout() {
  const qc = useQueryClient();
  useEffect(() => {
    supabase.rpc("lancar_recorrentes").then(({ data }) => {
      if (data && data > 0) {
        toast.success(`${data} gasto(s) recorrente(s) lançado(s) automaticamente`);
        qc.invalidateQueries({ queryKey: ["gastos"] });
      }
    });
  }, [qc]);

  return (
    <SecurityGate><ThemeSync /><OcultarSync /><GastoSheetProvider>
      <div className="mx-auto min-h-screen max-w-lg" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
        <Header />
        <main className="px-4">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </GastoSheetProvider></SecurityGate>
  );
}

function NavLink({ to, label, icon: Icon }: (typeof NAV)[number]) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "text-primary" }}>
      <Icon size={22} />{label}
    </Link>
  );
}

function BottomNav() {
  const { abrir } = useGastoSheet();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-lg grid-cols-5 items-start">
        <NavLink {...NAV[0]} />
        <NavLink {...NAV[1]} />
        <div className="flex justify-center">
          <button type="button" onClick={() => abrir()} aria-label="Novo gasto"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab ring-4 ring-background transition active:scale-95">
            <Plus size={28} />
          </button>
        </div>
        <NavLink {...NAV[2]} />
        <NavLink {...NAV[3]} />
      </div>
    </nav>
  );
}

function OlhoButton() {
  const { ocultos, alternar } = useOcultarValores();
  return (
    <Button variant="outline" size="icon" onClick={alternar} aria-label={ocultos ? "Mostrar valores" : "Ocultar valores"} aria-pressed={ocultos} className="h-10 w-10 rounded-full">
      {ocultos ? <EyeOff /> : <Eye />}
    </Button>
  );
}

function Header() {
  const path=useLocation().pathname;
  const titles: Record<string,string> = {'/gastos':'Gastos','/categorias':'Categorias','/relatorios':'Relatórios','/perfil':'Meu perfil','/configuracoes':'Configurações','/ajuda':'Ajuda e sugestão'};
  return <header className="flex items-center justify-between px-4 pb-5 pt-5">{path==='/inicio' ? <Logo tamanho="sm" /> : <h1 className="text-2xl font-bold">{titles[path] || 'Meu Bolso'}</h1>}<div className="flex items-center gap-2"><OlhoButton /><ProfileMenu /></div></header>;
}

