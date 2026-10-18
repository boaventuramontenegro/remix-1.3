-- Fundação financeira da fase 1.
-- Esta migração é exclusivamente aditiva: não remove colunas, registros ou funções existentes.

alter table public.gastos
  add column if not exists status_pagamento text,
  add column if not exists data_pagamento date,
  add column if not exists gerado_automaticamente boolean not null default false;

-- O histórico já existente não deve ser reinterpretado como pendente.
update public.gastos
set status_pagamento = 'pago'
where status_pagamento is null;

alter table public.gastos
  alter column status_pagamento set default 'pendente',
  alter column status_pagamento set not null;

alter table public.gastos
  drop constraint if exists gastos_status_pagamento_check;

alter table public.gastos
  add constraint gastos_status_pagamento_check
  check (status_pagamento in ('futuro', 'a_vencer', 'vence_hoje', 'pendente', 'atrasado', 'pago', 'cancelado'));

alter table public.recorrencias_gastos
  add column if not exists regra_dia_invalido text not null default 'ultimo_dia';

alter table public.recorrencias_gastos
  drop constraint if exists recorrencias_gastos_regra_dia_invalido_check;

alter table public.recorrencias_gastos
  add constraint recorrencias_gastos_regra_dia_invalido_check
  check (regra_dia_invalido in ('ultimo_dia', 'pular_mes'));

alter table public.gastos
  add column if not exists tipo_compromisso text not null default 'avulso',
  add column if not exists compromisso_id uuid,
  add column if not exists numero_parcela integer,
  add column if not exists total_parcelas integer;

alter table public.gastos
  drop constraint if exists gastos_tipo_compromisso_check;
alter table public.gastos
  add constraint gastos_tipo_compromisso_check
  check (tipo_compromisso in ('avulso', 'recorrente', 'parcelado', 'variavel', 'quitacao'));

alter table public.gastos
  drop constraint if exists gastos_parcelas_check;
alter table public.gastos
  add constraint gastos_parcelas_check
  check ((numero_parcela is null and total_parcelas is null)
      or (numero_parcela between 1 and total_parcelas and total_parcelas > 0));

create table if not exists public.compromissos_financeiros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('parcelado', 'variavel')),
  descricao text not null default '',
  categoria_id uuid references public.categorias(id) on delete set null,
  valor_parcela numeric,
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  inicio date not null,
  termino date,
  total_parcelas integer check (total_parcelas is null or total_parcelas > 0),
  encerrado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.eventos_quitacao (
  id uuid primary key default gen_random_uuid(),
  compromisso_id uuid not null references public.compromissos_financeiros(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  gasto_id uuid references public.gastos(id) on delete set null,
  valor numeric not null check (valor > 0),
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

alter table public.compromissos_financeiros enable row level security;
alter table public.eventos_quitacao enable row level security;

drop policy if exists "Usuário gerencia seus compromissos" on public.compromissos_financeiros;
create policy "Usuário gerencia seus compromissos" on public.compromissos_financeiros
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Usuário gerencia suas quitações" on public.eventos_quitacao;
create policy "Usuário gerencia suas quitações" on public.eventos_quitacao
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists gastos_compromisso_idx on public.gastos (compromisso_id, data);
create index if not exists compromissos_financeiros_user_idx on public.compromissos_financeiros (user_id, tipo, encerrado_em);

comment on column public.gastos.tipo_compromisso is
  'Distingue despesa avulsa, recorrente, parcelada, variável e evento de quitação.';
comment on column public.gastos.compromisso_id is
  'Vínculo opcional com um compromisso financeiro; não substitui a série de recorrência.';

-- Registro de chaves de ocorrência para que a futura geração seja idempotente
-- mesmo quando houver duas execuções simultâneas ou repetidas.
create table if not exists public.recorrencias_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references public.recorrencias_gastos(id) on delete cascade,
  gasto_id uuid references public.gastos(id) on delete set null,
  data_programada date not null,
  criado_em timestamptz not null default now(),
  unique (serie_id, data_programada)
);

alter table public.recorrencias_ocorrencias enable row level security;

drop policy if exists "Usuário vê suas ocorrências de recorrência" on public.recorrencias_ocorrencias;
create policy "Usuário vê suas ocorrências de recorrência"
  on public.recorrencias_ocorrencias for select
  using (exists (
    select 1 from public.recorrencias_gastos r
    where r.id = serie_id and r.user_id = auth.uid()
  ));

drop policy if exists "Usuário insere suas ocorrências de recorrência" on public.recorrencias_ocorrencias;
create policy "Usuário insere suas ocorrências de recorrência"
  on public.recorrencias_ocorrencias for insert
  with check (exists (
    select 1 from public.recorrencias_gastos r
    where r.id = serie_id and r.user_id = auth.uid()
  ));

drop policy if exists "Usuário atualiza suas ocorrências de recorrência" on public.recorrencias_ocorrencias;
create policy "Usuário atualiza suas ocorrências de recorrência"
  on public.recorrencias_ocorrencias for update
  using (exists (
    select 1 from public.recorrencias_gastos r
    where r.id = serie_id and r.user_id = auth.uid()
  ));

create index if not exists recorrencias_ocorrencias_gasto_id_idx
  on public.recorrencias_ocorrencias (gasto_id);

create index if not exists gastos_status_pagamento_data_idx
  on public.gastos (user_id, status_pagamento, data);

comment on column public.gastos.status_pagamento is
  'Estado explícito do pagamento; ausência de confirmação não deve ser tratada como pago.';
comment on column public.gastos.data_pagamento is
  'Data em que o usuário confirmou o pagamento, distinta da data prevista.';
comment on column public.gastos.gerado_automaticamente is
  'Indica ocorrência gerada por uma recorrência, sem apagar histórico confirmado.';
comment on column public.recorrencias_gastos.regra_dia_invalido is
  'Tratamento do dia 31 em meses sem esse dia: ultimo_dia ou pular_mes.';
