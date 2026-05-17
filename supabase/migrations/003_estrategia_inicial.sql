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
create index if not exists estrategias_client_id_idx
  on public.estrategias_iniciais(client_id);
