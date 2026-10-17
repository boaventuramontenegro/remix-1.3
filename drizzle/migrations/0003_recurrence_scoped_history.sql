CREATE TABLE public.recorrencias_exclusoes (serie_id uuid NOT NULL REFERENCES public.recorrencias_gastos(id) ON DELETE CASCADE, mes date NOT NULL, PRIMARY KEY(serie_id,mes));
GRANT ALL ON public.recorrencias_exclusoes TO service_role;
ALTER TABLE public.recorrencias_exclusoes ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.recorrencias_exclusoes IS 'Deleted occurrence months are never recreated by catch-up; trusted generator only.';
CREATE OR REPLACE FUNCTION public.gerar_recorrencias(_hoje date, _usuario uuid DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; m date; alvo date; n integer:=0; linhas integer;
BEGIN
 FOR r IN SELECT * FROM public.recorrencias_gastos WHERE ativa AND (_usuario IS NULL OR user_id=_usuario) ORDER BY id FOR UPDATE LOOP
  m := (date_trunc('month',r.inicio)+interval '1 month')::date;
  WHILE m <= least(_hoje,coalesce(r.termino,_hoje)) LOOP
   alvo := least(m+(r.dia-1),(m+interval '1 month'-interval '1 day')::date);
   IF alvo <= _hoje AND (r.termino IS NULL OR alvo<=r.termino) AND NOT EXISTS(SELECT 1 FROM recorrencias_exclusoes WHERE serie_id=r.id AND mes=m) THEN
    INSERT INTO public.gastos(user_id,serie_id,data_programada,data,valor,categoria_id,descricao,forma_pagamento,observacao,recorrente) VALUES(r.user_id,r.id,alvo,alvo,r.valor,r.categoria_id,r.descricao,r.forma_pagamento,r.observacao,false) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS linhas=ROW_COUNT; n:=n+linhas;
   END IF;
   m := (m+interval '1 month')::date;
  END LOOP;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.gerar_recorrencias(date,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_recorrencias(date,uuid) TO service_role;
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
   IF _repetir AND _termino IS NOT NULL AND _termino<d THEN RAISE EXCEPTION 'invalid end date'; END IF;
   UPDATE recorrencias_gastos SET termino=least(coalesce(termino,g.data_programada-1),g.data_programada-1) WHERE id=sid;
   INSERT INTO recorrencias_gastos(user_id,inicio,dia,termino,ativa,valor,categoria_id,descricao,forma_pagamento,observacao)
    VALUES(uid,d,CASE WHEN d=g.data THEN s.dia ELSE extract(day FROM d)::int END,_termino,_repetir,v,cat,coalesce(_dados->>'descricao',''),coalesce(_dados->>'forma_pagamento','pix'),_dados->>'observacao') RETURNING id INTO sid;
   INSERT INTO recorrencias_exclusoes(serie_id,mes) SELECT sid,mes FROM recorrencias_exclusoes WHERE serie_id=s.id AND mes>=date_trunc('month',g.data_programada)::date ON CONFLICT DO NOTHING;
   UPDATE gastos SET serie_id=sid,valor=v,categoria_id=cat,descricao=coalesce(_dados->>'descricao',''),forma_pagamento=coalesce(_dados->>'forma_pagamento','pix'),observacao=_dados->>'observacao' WHERE serie_id=s.id AND data_programada>=g.data_programada AND id<>g.id;
  END IF;
 ELSIF _repetir THEN
  IF _termino IS NOT NULL AND _termino<d THEN RAISE EXCEPTION 'invalid end date'; END IF;
  INSERT INTO recorrencias_gastos(user_id,inicio,dia,termino,valor,categoria_id,descricao,forma_pagamento,observacao) VALUES(uid,d,extract(day FROM d)::int,_termino,v,cat,coalesce(_dados->>'descricao',''),coalesce(_dados->>'forma_pagamento','pix'),_dados->>'observacao') RETURNING id INTO sid;
 END IF;
 IF _id IS NULL THEN
  INSERT INTO gastos(user_id,serie_id,data_programada,data,valor,categoria_id,descricao,forma_pagamento,observacao,recorrente) VALUES(uid,sid,CASE WHEN sid IS NOT NULL THEN d END,d,v,cat,coalesce(_dados->>'descricao',''),coalesce(_dados->>'forma_pagamento','pix'),_dados->>'observacao',false) RETURNING id INTO gid;
 ELSE
  UPDATE gastos SET serie_id=sid,data_programada=CASE WHEN _escopo='proximos' AND sid IS NOT NULL THEN d ELSE coalesce(data_programada,CASE WHEN sid IS NOT NULL THEN d END) END,data=d,valor=v,categoria_id=cat,descricao=coalesce(_dados->>'descricao',''),forma_pagamento=coalesce(_dados->>'forma_pagamento','pix'),observacao=_dados->>'observacao' WHERE id=_id RETURNING id INTO gid;
 END IF;
 RETURN gid;
END $$;
REVOKE ALL ON FUNCTION public.salvar_gasto_recorrencia(jsonb,uuid,text,boolean,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_gasto_recorrencia(jsonb,uuid,text,boolean,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.recorrencia_apos_exclusao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.serie_id IS NOT NULL THEN
  INSERT INTO recorrencias_exclusoes(serie_id,mes) VALUES(OLD.serie_id,date_trunc('month',OLD.data_programada)::date) ON CONFLICT DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM gastos WHERE serie_id=OLD.serie_id) THEN UPDATE recorrencias_gastos SET ativa=false WHERE id=OLD.serie_id; END IF;
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.recorrencia_apos_exclusao() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lancar_recorrentes() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lancar_recorrentes() TO authenticated;
CREATE OR REPLACE FUNCTION public.recorrencia_categoria_excluida() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE recorrencias_gastos r SET categoria_id=(SELECT g.categoria_id FROM gastos g WHERE g.serie_id=r.id ORDER BY g.data_programada DESC LIMIT 1),ativa=CASE WHEN EXISTS(SELECT 1 FROM gastos g WHERE g.serie_id=r.id) THEN r.ativa ELSE false END WHERE r.categoria_id=OLD.id AND r.user_id=OLD.user_id;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.recorrencia_categoria_excluida() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER recorrencia_categoria_excluida BEFORE DELETE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.recorrencia_categoria_excluida();
COMMENT ON COLUMN public.gastos.recorrente IS 'DEPRECATED: compatibility flag; new writes use serie_id and recurrence RPC.';
COMMENT ON COLUMN public.gastos.recorrente_origem_id IS 'DEPRECATED: replaced by serie_id.';