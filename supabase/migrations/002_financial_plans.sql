create table if not exists public.financial_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  suitability jsonb,
  ativos_atuais jsonb not null default '{}',
  alocacao_personalizada jsonb,
  planejamento_if jsonb not null default '{}',
  protecao jsonb not null default '{}',
  fiscal jsonb not null default '{}',
  sucessorio jsonb not null default '{}',
  notas_assessor text not null default '',
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

create index if not exists plans_client_id_idx on public.financial_plans(client_id);
create index if not exists plans_updated_at_idx on public.financial_plans(updated_at desc);
