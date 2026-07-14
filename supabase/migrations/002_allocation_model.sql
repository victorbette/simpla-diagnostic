-- ============================================================================
-- Modelo de alocação Simpla (espelho da planilha de alocação)
-- ----------------------------------------------------------------------------
-- Tabelas versionadas: cada sync da planilha gera uma allocation_version com
-- suas linhas filhas. O app sempre lê a última versão com status 'published';
-- versões anteriores ficam preservadas para auditoria/rollback.
--
-- Escrita: EXCLUSIVA da service role (Edge Function sync-allocation ou script
-- de seed). `authenticated` só lê — nenhum grant de insert/update/delete.
-- Ver docs/planilha-alocacao-mapeamento.md para a semântica dos dados.
-- ============================================================================

-- ─── allocation_versions ─────────────────────────────────────────────────────
create table if not exists public.allocation_versions (
  id uuid primary key default gen_random_uuid(),
  source text not null,                       -- id da planilha ou 'seed:<arquivo>'
  checksum text not null,                     -- sha-256 do conteúdo normalizado
  status text not null default 'staging',     -- staging | published | rejected
  stats jsonb not null default '{}',          -- contagens p/ conferência rápida
  errors jsonb not null default '[]',         -- erros/avisos de validação do sync
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- ─── allocation_bands (faixas de patrimônio) ─────────────────────────────────
create table if not exists public.allocation_bands (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.allocation_versions(id) on delete cascade,
  nome text not null,
  min_patrimonio numeric not null,
  ordem int not null
);

-- ─── allocation_matrix (% por faixa × perfil × classe) ───────────────────────
create table if not exists public.allocation_matrix (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.allocation_versions(id) on delete cascade,
  faixa text not null,
  perfil text not null,
  classe text not null,
  pct numeric not null,
  constraint allocation_matrix_pct_range check (pct >= 0 and pct <= 1)
);

-- ─── allocation_products (blocos de produtos por faixa × perfil × classe) ────
create table if not exists public.allocation_products (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.allocation_versions(id) on delete cascade,
  faixa text not null,
  perfil text not null,
  classe text not null,
  nome text not null,
  is_fundo boolean not null default false,    -- dispara a regra 70/30 dentro da classe
  ordem int not null
);

-- ─── asset_prices (tabela "Preços e Recomendações") ──────────────────────────
-- preco_hoje é o snapshot do GOOGLEFINANCE no momento do sync; a recomendação
-- Comprar/Aguardar NÃO é persistida — o app calcula preco_teto > preco_hoje.
create table if not exists public.asset_prices (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.allocation_versions(id) on delete cascade,
  ticker text not null,
  classe text not null,
  preco_teto numeric,
  preco_hoje numeric,
  preco_hoje_atualizado_em timestamptz
);

-- ─── RLS: leitura para authenticated, escrita só via service role ────────────
alter table public.allocation_versions enable row level security;
alter table public.allocation_bands    enable row level security;
alter table public.allocation_matrix   enable row level security;
alter table public.allocation_products enable row level security;
alter table public.asset_prices        enable row level security;

create policy "read_allocation_versions" on public.allocation_versions
  for select to authenticated using (true);
create policy "read_allocation_bands" on public.allocation_bands
  for select to authenticated using (true);
create policy "read_allocation_matrix" on public.allocation_matrix
  for select to authenticated using (true);
create policy "read_allocation_products" on public.allocation_products
  for select to authenticated using (true);
create policy "read_asset_prices" on public.asset_prices
  for select to authenticated using (true);

grant select on public.allocation_versions to authenticated;
grant select on public.allocation_bands    to authenticated;
grant select on public.allocation_matrix   to authenticated;
grant select on public.allocation_products to authenticated;
grant select on public.asset_prices        to authenticated;
-- a Edge Function/seed escrevem via service role (bypassa RLS, mas precisa
-- dos privilégios de tabela)
grant all on public.allocation_versions, public.allocation_bands,
             public.allocation_matrix, public.allocation_products,
             public.asset_prices to service_role;
revoke all on public.allocation_versions, public.allocation_bands,
           public.allocation_matrix, public.allocation_products,
           public.asset_prices from anon;

-- ─── índices ─────────────────────────────────────────────────────────────────
create index if not exists allocation_versions_published_idx
  on public.allocation_versions(published_at desc) where status = 'published';
create index if not exists allocation_bands_version_idx    on public.allocation_bands(version_id);
create index if not exists allocation_matrix_version_idx   on public.allocation_matrix(version_id);
create index if not exists allocation_products_version_idx on public.allocation_products(version_id);
create index if not exists asset_prices_version_idx        on public.asset_prices(version_id);
