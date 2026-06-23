-- Torna explícito o WITH CHECK nas políticas RLS de simulations e diagnostics.
-- No PostgreSQL, omitir WITH CHECK faz o USING ser aplicado também na escrita,
-- então o isolamento por tenant já existia; esta migration é apenas consistência
-- e legibilidade (espelha o padrão já usado em financial_plans e estrategias_iniciais).

drop policy if exists "users_own_simulations" on public.simulations;
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

drop policy if exists "users_own_diagnostics" on public.diagnostics;
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
