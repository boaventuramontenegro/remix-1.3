CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.perfis (user_id uuid PRIMARY KEY DEFAULT auth.uid(), nome text NOT NULL DEFAULT '');
CREATE TABLE public.configuracoes (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  dia_inicio_mes int NOT NULL DEFAULT 1,
  fuso_horario text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  notif_ativas boolean NOT NULL DEFAULT false,
  notif_horario time NOT NULL DEFAULT '20:00',
  notif_limite_80 boolean NOT NULL DEFAULT true,
  ocultar_valores boolean NOT NULL DEFAULT false,
  pagamento_padrao text NOT NULL DEFAULT 'pix',
  pin_tempo_bloqueio int NOT NULL DEFAULT 0,
  renda_mensal numeric,
  semana_inicia int NOT NULL DEFAULT 0,
  tema text NOT NULL DEFAULT 'system',
  ultimo_lembrete date
);
CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  icone text NOT NULL DEFAULT 'tag',
  cor text NOT NULL DEFAULT '#64748b',
  orcamento_mensal numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categorias_user_nome_key ON public.categorias (user_id, nome);
CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT current_date,
  descricao text NOT NULL DEFAULT '',
  forma_pagamento text NOT NULL DEFAULT 'pix',
  observacao text,
  recorrente boolean NOT NULL DEFAULT false,
  recorrente_origem_id uuid REFERENCES public.gastos(id) ON DELETE SET NULL,
  valor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gastos_user_data_idx ON public.gastos (user_id, data);
CREATE TABLE public.alertas_orcamento (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  categoria_id uuid NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  mes date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, categoria_id, mes)
);
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  endpoint text NOT NULL UNIQUE,
  keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sugestoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tipo text NOT NULL,
  mensagem text NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 2000),
  criado_em timestamptz NOT NULL DEFAULT now()
);
-- Segredo interno do lembrete agendado (somente servidor)
CREATE TABLE public.app_internal (chave text PRIMARY KEY, valor text NOT NULL);
INSERT INTO public.app_internal VALUES ('push_cron_secret', encode(extensions.gen_random_bytes(32), 'hex'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis, public.configuracoes, public.categorias, public.gastos, public.alertas_orcamento, public.push_subscriptions TO authenticated;
GRANT INSERT ON public.sugestoes TO authenticated;
GRANT ALL ON public.perfis, public.configuracoes, public.categorias, public.gastos, public.alertas_orcamento, public.push_subscriptions, public.sugestoes, public.app_internal TO service_role;

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_internal ENABLE ROW LEVEL SECURITY;

CREATE POLICY own ON public.perfis FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.configuracoes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.categorias FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.gastos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.alertas_orcamento FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own_insert ON public.sugestoes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.meubolso_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (user_id, nome) VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', '')) ON CONFLICT DO NOTHING;
  INSERT INTO public.configuracoes (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.categorias (user_id, nome, icone, cor) VALUES
    (NEW.id, 'Contas', 'receipt', '#0ea5e9'), (NEW.id, 'Mercado', 'shopping-cart', '#22c55e'),
    (NEW.id, 'Veículo', 'car', '#f97316'), (NEW.id, 'Moradia', 'home', '#a16207'),
    (NEW.id, 'Saúde', 'heart-pulse', '#ef4444'), (NEW.id, 'Educação', 'graduation-cap', '#6366f1'),
    (NEW.id, 'Lazer', 'party-popper', '#ec4899'), (NEW.id, 'Transporte', 'bus', '#14b8a6'),
    (NEW.id, 'Outros', 'tag', '#64748b')
  ON CONFLICT (user_id, nome) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER meubolso_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.meubolso_signup();

CREATE OR REPLACE FUNCTION public.meubolso_cleanup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.alertas_orcamento WHERE user_id = OLD.id;
  DELETE FROM public.push_subscriptions WHERE user_id = OLD.id;
  DELETE FROM public.gastos WHERE user_id = OLD.id;
  DELETE FROM public.categorias WHERE user_id = OLD.id;
  DELETE FROM public.configuracoes WHERE user_id = OLD.id;
  DELETE FROM public.perfis WHERE user_id = OLD.id;
  DELETE FROM public.sugestoes WHERE user_id = OLD.id;
  RETURN OLD;
END $$;
CREATE TRIGGER meubolso_on_delete BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.meubolso_cleanup();

CREATE OR REPLACE FUNCTION public.excluir_minha_conta() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.lancar_recorrentes() RETURNS int LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE g record; m date; alvo date; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  FOR g IN SELECT * FROM gastos WHERE user_id = auth.uid() AND recorrente AND recorrente_origem_id IS NULL LOOP
    m := (date_trunc('month', g.data) + interval '1 month')::date;
    WHILE m <= current_date LOOP
      alvo := least(m + (extract(day from g.data)::int - 1), (m + interval '1 month' - interval '1 day')::date);
      IF alvo <= current_date AND NOT EXISTS (SELECT 1 FROM gastos WHERE recorrente_origem_id = g.id AND date_trunc('month', data) = m) THEN
        INSERT INTO gastos (user_id, categoria_id, data, descricao, forma_pagamento, observacao, recorrente, recorrente_origem_id, valor)
        VALUES (g.user_id, g.categoria_id, alvo, g.descricao, g.forma_pagamento, g.observacao, false, g.id, g.valor);
        n := n + 1;
      END IF;
      m := (m + interval '1 month')::date;
    END LOOP;
  END LOOP;
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION public.excluir_minha_conta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_minha_conta(), public.lancar_recorrentes() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.meubolso_signup(), public.meubolso_cleanup() FROM PUBLIC, anon, authenticated;