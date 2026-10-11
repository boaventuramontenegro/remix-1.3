import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadingScreen } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      {property:"og:type",content:"website"},
      {name:"twitter:card",content:"summary_large_image"},
      { title: "Meu Bolso — Seus gastos sob controle" },
      { name: "description", content: "App de planejamento de gastos domésticos com orçamentos, gráficos e relatórios." },
      { property: "og:title", content: "Meu Bolso — Seus gastos sob controle" },
      { property: "og:description", content: "App de planejamento de gastos domésticos com orçamentos, gráficos e relatórios." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/inicio" : "/auth", replace: true });
  },
  component: LoadingScreen,
});
