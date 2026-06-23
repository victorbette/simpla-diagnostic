-- ============================================================================
-- Schema completo do simpla-diagnostic
-- ----------------------------------------------------------------------------
-- Arquivo único e idempotente para provisionar o banco do zero em um novo
-- projeto Supabase. As tabelas são criadas na ordem de dependência das FKs e
-- referenciam os usuários existentes em auth.users (nenhum dado/usuário é
-- migrado — o login reaproveita o Supabase Auth do projeto de destino).
--
-- Todas as colunas refletem src/integrations/supabase/types.ts e os hooks que
-- consomem cada tabela (useClientStore, useFinancialPlanStore, useEstrategiaStore).
-- RLS habilitado em todas as tabelas, com USING + WITH CHECK explícitos para
-- isolar cada assessor aos seus próprios clientes.
-- ============================================================================

-- ─── clients ────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  cpf text,
  data_nascimento text,
  observacoes text,
  data_criacao timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.clients enable row level security;
create policy "users_own_clients" on public.clients
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── simulations ─────────────────────────────────────────────────────────────
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  dados_input jsonb not null,
  resultados_calc jsonb not null,
  data_simulacao timestamptz not null default now()
);
alter table public.simulations enable row level security;
create policy "users_own_simulations" on public.simulations
  using (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  )
  with check (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  );

-- ─── diagnostics ─────────────────────────────────────────────────────────────
create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  linked_simulation_id uuid references public.simulations(id) on delete set null,
  answers jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.diagnostics enable row level security;
create policy "users_own_diagnostics" on public.diagnostics
  using (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  )
  with check (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  );

-- ─── financial_plans ─────────────────────────────────────────────────────────
create table if not exists public.financial_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  suitability jsonb,
  dados_cliente jsonb,
  ativos_atuais jsonb not null default '{}',
  alocacao_personalizada jsonb,
  planejamento_if jsonb not null default '{}',
  protecao jsonb not null default '{}',
  fiscal jsonb not null default '{}',
  sucessorio jsonb not null default '{}',
  notas_assessor text not null default '',
  estrategia_inicial jsonb,
  status text not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.financial_plans enable row level security;
create policy "users_own_plans" on public.financial_plans
  using (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  )
  with check (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  );

-- ─── estrategias_iniciais ────────────────────────────────────────────────────
create table if not exists public.estrategias_iniciais (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  financial_plan_id uuid references public.financial_plans(id) on delete set null,
  logo_base64 text,
  apresentacao text not null default '',
  nome_assessor text not null default '',
  secoes jsonb not null default '{}',
  status text not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.estrategias_iniciais enable row level security;
create policy "users_own_estrategias" on public.estrategias_iniciais
  using (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  )
  with check (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  );

-- ─── índices ─────────────────────────────────────────────────────────────────
create index if not exists clients_user_id_idx        on public.clients(user_id);
create index if not exists simulations_client_id_idx  on public.simulations(client_id);
create index if not exists diagnostics_client_id_idx  on public.diagnostics(client_id);
create index if not exists diagnostics_created_at_idx  on public.diagnostics(created_at desc);
create index if not exists plans_client_id_idx         on public.financial_plans(client_id);
create index if not exists plans_updated_at_idx        on public.financial_plans(updated_at desc);
create index if not exists estrategias_client_id_idx   on public.estrategias_iniciais(client_id);
