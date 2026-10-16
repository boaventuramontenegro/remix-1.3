CREATE TABLE public.recorrencias_gastos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), inicio date NOT NULL, dia integer NOT NULL, termino date, ativa boolean NOT NULL DEFAULT true,
 valor numeric NOT NULL, categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL, descricao text NOT NULL DEFAULT '', forma_pagamento text NOT NULL DEFAULT 'pix', observacao text,
 CHECK (dia BETWEEN 1 AND 31), CHECK (valor > 0)
);
GRANT SELECT ON public.recorrencias_gastos TO authenticated;
GRANT ALL ON public.recorrencias_gastos TO service_role;
ALTER TABLE public.recorrencias_gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON public.recorrencias_gastos FOR SELECT TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.gastos ADD COLUMN serie_id uuid REFERENCES public.recorrencias_gastos(id) ON DELETE SET NULL;
ALTER TABLE public.gastos ADD COLUMN data_programada date;
INSERT INTO public.recorrencias_gastos(id,user_id,inicio,dia,valor,categoria_id,descricao,forma_pagamento,observacao)
 SELECT id,user_id,data,extract(day FROM data)::int,valor,categoria_id,descricao,forma_pagamento,observacao FROM public.gastos WHERE recorrente AND recorrente_origem_id IS NULL;
UPDATE public.gastos SET serie_id=id,data_programada=data WHERE id IN (SELECT id FROM public.recorrencias_gastos);
UPDATE public.gastos g SET serie_id=r.id,data_programada=g.data FROM public.recorrencias_gastos r WHERE g.recorrente_origem_id=r.id;
CREATE UNIQUE INDEX gastos_serie_mes_unique ON public.gastos(serie_id,(date_trunc('month',data_programada::timestamp))) WHERE serie_id IS NOT NULL;
COMMENT ON COLUMN public.gastos.recorrente IS 'Legacy compatibility; series state lives in recorrencias_gastos.';
CREATE OR REPLACE FUNCTION public.gerar_recorrencias(_hoje date, _usuario uuid DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; m date; alvo date; n integer:=0; linhas integer;
BEGIN
 FOR r IN SELECT * FROM public.recorrencias_gastos WHERE ativa AND (_usuario IS NULL OR user_id=_usuario) FOR UPDATE LOOP
  m := (date_trunc('month',r.inicio)+interval '1 month')::date;
  WHILE m <= least(_hoje,coalesce(r.termino,_hoje)) LOOP
   alvo := least(m+(r.dia-1),(m+interval '1 month'-interval '1 day')::date);
   IF alvo <= _hoje AND (r.termino IS NULL OR alvo<=r.termino) THEN
    INSERT INTO public.gastos(user_id,serie_id,data_programada,data,valor,categoria_id,descricao,forma_pagamento,observacao,recorrente)
     VALUES(r.user_id,r.id,alvo,alvo,r.valor,r.categoria_id,r.descricao,r.forma_pagamento,r.observacao,false) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS linhas=ROW_COUNT; n:=n+linhas;
   END IF;
   m := (m+interval '1 month')::date;
  END LOOP;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.gerar_recorrencias(date,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_recorrencias(date,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.lancar_recorrentes() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN 0; END IF;
 RETURN public.gerar_recorrencias((now() AT TIME ZONE coalesce((SELECT coalesce(fuso_horario,timezone) FROM public.configuracoes WHERE user_id=auth.uid()),'America/Sao_Paulo'))::date,auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.processar_recorrencias_agendadas() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u record; n integer:=0;
BEGIN
 FOR u IN SELECT DISTINCT r.user_id,coalesce(c.fuso_horario,c.timezone,'America/Sao_Paulo') tz FROM public.recorrencias_gastos r LEFT JOIN public.configuracoes c ON c.user_id=r.user_id WHERE r.ativa LOOP
  n:=n+public.gerar_recorrencias((now() AT TIME ZONE u.tz)::date,u.user_id);
 END LOOP; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.processar_recorrencias_agendadas() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.processar_recorrencias_agendadas() TO service_role;
CREATE OR REPLACE FUNCTION public.salvar_gasto_recorrencia(_dados jsonb,_id uuid DEFAULT NULL,_escopo text DEFAULT 'este',_repetir boolean DEFAULT false,_termino date DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.gastos; s public.recorrencias_gastos; uid uuid:=auth.uid(); gid uuid; sid uuid; d date:=(_dados->>'data')::date; v numeric:=(_dados->>'valor')::numeric; cat uuid:=(_dados->>'categoria_id')::uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 IF d IS NULL OR v IS NULL OR v<=0 OR _escopo NOT IN ('este','proximos') THEN RAISE EXCEPTION 'invalid expense'; END IF;
 IF cat IS NOT NULL AND NOT EXISTS(SELECT 1 FROM categorias WHERE id=cat AND user_id=uid) THEN RAISE EXCEPTION 'invalid category'; END IF;
 IF _id IS NOT NULL THEN
  SELECT * INTO g FROM gastos WHERE id=_id AND user_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'expense not found'; END IF;
  sid:=g.serie_id;
 END IF;
 IF sid IS NOT NULL THEN
  SELECT * INTO s FROM recorrencias_gastos WHERE id=sid AND user_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'series not found'; END IF;
  IF _escopo='proximos' THEN
   IF _repetir AND _termino IS NOT NULL AND _termino<coalesce(g.data_programada,g.data) THEN RAISE EXCEPTION 'invalid end date'; END IF;
   UPDATE recorrencias_gastos SET ativa=_repetir,termino=_termino,valor=v,categoria_id=cat,descricao=coalesce(_dados->>'descricao',''),forma_pagamento=coalesce(_dados->>'forma_pagamento','pix'),observacao=_dados->>'observacao' WHERE id=sid;
   UPDATE gastos SET valor=v,categoria_id=cat,descricao=coalesce(_dados->>'descricao',''),forma_pagamento=coalesce(_dados->>'forma_pagamento','pix'),observacao=_dados->>'observacao' WHERE serie_id=sid AND data_programada>g.data_programada;
  END IF;
 ELSIF _repetir THEN
  IF _termino IS NOT NULL AND _termino<d THEN RAISE EXCEPTION 'invalid end date'; END IF;
  INSERT INTO recorrencias_gastos(user_id,inicio,dia,termino,valor,categoria_id,descricao,forma_pagamento,observacao) VALUES(uid,d,extract(day FROM d)::int,_termino,v,cat,coalesce(_dados->>'descricao',''),coalesce(_dados->>'forma_pagamento','pix'),_dados->>'observacao') RETURNING id INTO sid;
 END IF;
 IF _id IS NULL THEN
  INSERT INTO gastos(user_id,serie_id,data_programada,data,valor,categoria_id,descricao,forma_pagamento,observacao,recorrente) VALUES(uid,sid,CASE WHEN sid IS NOT NULL THEN d END,d,v,cat,coalesce(_dados->>'descricao',''),coalesce(_dados->>'forma_pagamento','pix'),_dados->>'observacao',false) RETURNING id INTO gid;
 ELSE
  UPDATE gastos SET serie_id=sid,data_programada=coalesce(data_programada,CASE WHEN sid IS NOT NULL THEN d END),data=d,valor=v,categoria_id=cat,descricao=coalesce(_dados->>'descricao',''),forma_pagamento=coalesce(_dados->>'forma_pagamento','pix'),observacao=_dados->>'observacao' WHERE id=_id RETURNING id INTO gid;
 END IF;
 RETURN gid;
END $$;
REVOKE ALL ON FUNCTION public.salvar_gasto_recorrencia(jsonb,uuid,text,boolean,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_gasto_recorrencia(jsonb,uuid,text,boolean,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.cancelar_recorrencia(_serie uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 UPDATE recorrencias_gastos SET ativa=false WHERE id=_serie AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'series not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.cancelar_recorrencia(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancelar_recorrencia(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.recorrencia_apos_exclusao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.serie_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM gastos WHERE serie_id=OLD.serie_id) THEN UPDATE recorrencias_gastos SET ativa=false WHERE id=OLD.serie_id; END IF; RETURN OLD;
END $$;
CREATE TRIGGER recorrencia_apos_exclusao AFTER DELETE ON public.gastos FOR EACH ROW EXECUTE FUNCTION public.recorrencia_apos_exclusao();