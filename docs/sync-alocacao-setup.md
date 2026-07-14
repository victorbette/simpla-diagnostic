# Setup — Sync da Planilha de Alocação

Guia de ativação da integração planilha → Supabase → Etapa 2 (Recomendada).
A lógica está documentada em [`planilha-alocacao-mapeamento.md`](./planilha-alocacao-mapeamento.md).

## Arquitetura

```
Google Sheets (privada)
   │  leitura via service account (somente-leitura)
   ▼
Edge Function sync-allocation  ──valida──► tabelas allocation_* (versionadas)
   ▲                                              │ RLS: authenticated só lê
   │ botão "Sincronizar planilha" (Etapa 2)       ▼
   │ ou agendamento (pg_cron)              app: useAllocationModel
                                                  └► motor alocacaoSimpla.ts
```

## Passo 0 — Aplicar a migration (JA FIZ)

No SQL Editor do painel Supabase, rode `supabase/migrations/002_allocation_model.sql`
(ou `supabase db push` se usar o fluxo de migrations da CLI).

## Passo 1 (opcional, recomendado) — Seed imediato (OPTEI POR NAO FAZER)

Para testar tudo **antes** de configurar o Google, publique o snapshot extraído
do `planilha-alocacao.xlsx`:

```powershell
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"   # em Settings → API
node scripts/seed-allocation.mjs
```

> A service role key dá acesso total ao banco — use só em terminal local/CI,
> nunca no `.env` do front (que usa apenas a publishable key).

Depois disso o painel "Recomendação Simpla" na Etapa 2 já funciona.

## Passo 2 — Service account do Google (≈5 min, grátis) (ok)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) → crie um projeto (ex.: `simpla-sheets`).
2. **APIs & Services → Library** → habilite **Google Sheets API**.
3. **IAM & Admin → Service Accounts → Create service account** (ex.: `sheets-reader`). Sem roles de projeto.
4. Na service account → **Keys → Add key → JSON** → baixa um arquivo com `client_email` e `private_key`.
5. Na planilha do Google Sheets → **Compartilhar** → cole o `client_email` como **Leitor**. A planilha continua privada.

## Passo 3 — Deploy da Edge Function (ok)

```powershell
supabase login                       # 1x, abre o navegador
supabase link --project-ref <ref>    # 1x; <ref> está na URL do painel

# secrets (valores do JSON da service account)
supabase secrets set GOOGLE_SA_EMAIL="sheets-reader@....iam.gserviceaccount.com"
supabase secrets set GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
supabase secrets set ALLOCATION_SHEET_ID="<id entre /d/ e /edit na URL da planilha>"
supabase secrets set CRON_SECRET="<string aleatória longa>"   # p/ agendamento

supabase functions deploy sync-allocation
```

> A `GOOGLE_SA_PRIVATE_KEY` pode ser colada com os `\n` literais do JSON — a
> função converte para quebras de linha reais.

Teste manual: botão **"Sincronizar planilha"** no painel Recomendação Simpla
(Etapa 2), ou via curl:

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/sync-allocation" \
  -H "Authorization: Bearer <anon key>" \
  -H "x-cron-secret: <CRON_SECRET>"
```

Respostas: `published` (nova versão), `unchanged` (planilha idêntica à última
versão), `rejected` + lista de erros (ex.: combinação que não soma 100% — a
versão anterior continua valendo).

## Passo 4 — Agendamento diário (opcional) (AINDA N FIZ)

No SQL Editor (extensões `pg_cron` + `pg_net`, habilite em Database → Extensions):

```sql
select cron.schedule(
  'sync-allocation-diario',
  '0 9 * * 1-5',          -- 9h UTC (6h BRT), dias úteis
  $$
  select net.http_post(
    url     := 'https://<ref>.supabase.co/functions/v1/sync-allocation',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <anon key>',
      'x-cron-secret', '<CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Segurança — resumo do desenho

- A planilha **nunca fica pública**: só a service account (leitora) a acessa.
- Credencial do Google e service role key vivem **só nos secrets da função**;
  o front usa apenas a publishable key.
- Tabelas `allocation_*`: RLS com leitura para `authenticated`, **nenhum grant
  de escrita** — só a service role (função/seed) grava.
- Toda versão passa por **gate de validação** (somas 100%, faixas ordenadas,
  classes/perfis canônicos); planilha quebrada → versão `rejected`, o app segue
  na última versão boa. Histórico completo em `allocation_versions`
  (checksum, stats, erros) para auditoria e rollback.
- O botão de sync exige usuário autenticado; o agendamento usa o `CRON_SECRET`.

## Observações de manutenção

- **Renomear/adicionar abas de faixa** funciona automaticamente (a função
  descobre as abas pelo `_BlocoMap`), mas as abas `Parâmetros`, `Preços e
  Recomendações` e `_BlocoMap` precisam manter esses nomes e layout de colunas.
- A regra 70/30 de fundos é disparada por nome iniciando com `Mutual fund`
  (comportamento herdado da planilha). Os placeholders `Mutual fund 1..4`
  devem ser renomeados na planilha quando os fundos reais forem definidos.
- Novo ticker numa aba de faixa **precisa existir** na aba Preços e
  Recomendações (nome idêntico), senão fica com peso 0 (gera aviso no sync).
