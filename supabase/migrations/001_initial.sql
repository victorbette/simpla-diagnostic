-- Tabela de clientes
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  data_criacao timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "users_own_clients" on public.clients
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabela de simulações de seguro
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
  );

-- Tabela de diagnósticos financeiros
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
  );

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists simulations_client_id_idx on public.simulations(client_id);
create index if not exists diagnostics_client_id_idx on public.diagnostics(client_id);
create index if not exists diagnostics_created_at_idx on public.diagnostics(created_at desc);
