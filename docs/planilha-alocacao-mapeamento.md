# Mapeamento — Planilha de Alocação (`planilha-alocacao.xlsx`)

> Engenharia reversa completa da planilha de alocação ideal, para replicar a lógica na
> Etapa 2 (Recomendada) da Gestão de Carteira. Os dados extraídos estão em
> [`planilha-alocacao-data.json`](./planilha-alocacao-data.json).

## 1. Visão geral das abas

| Aba | Papel |
|---|---|
| `Parâmetros` | **Matriz oficial de alocação**: Faixa de Patrimônio × Perfil → % por 11 classes de ativo. Também define os limites de cada faixa (patrimônio mínimo). |
| `Painel` | Entrada de dados do cliente (nome, patrimônio total, custo de vida mensal, meses de reserva, perfil) e cálculo da divisão ideal em % e R$. |
| `Resultado Final` | Saída consolidada: para cada classe, o % da carteira e a lista de produtos com % dentro da classe e R$ alocado. É a "carteira recomendada" final. |
| `Preços e Recomendações` | Tabela de Ações/FIIs com Preço Teto e Preço de Hoje (`GOOGLEFINANCE`). Gera recomendação **Comprar/Aguardar**. |
| `100-149`, `150-349`, `350-999`, `1M-4,9M`, `5M-9,9M` | Detalhamento de produtos por faixa: blocos de produtos por Perfil × Classe. |
| `_BlocoMap` | Índice técnico: chave `Faixa\|Perfil\|Classe` → (aba, linha inicial, linha final) do bloco de produtos. Usado pelo Resultado Final via `INDIRECT`. |

## 2. Dimensões do modelo

**11 classes de ativo** (ordem canônica das colunas C–M da matriz):

1. Renda Fixa pós curta
2. Renda fixa pós longa
3. IPCA Curto
4. IPCA Longo
5. Infra IPCA
6. Infra CDI
7. Prefixado
8. Ações
9. FIIs
10. Exterior
11. Bitcoin

**Agrupamento macro** (usado no Painel): Renda fixa = classes 1–7 · Renda Variável BR = Ações + FIIs · Exterior · Bitcoin.

**6 faixas de patrimônio** (a faixa é determinada pelo *patrimônio total*, via lookup no mínimo):

| Faixa | Mínimo (R$) |
|---|---|
| 100 mil a 149,9 mil | 100.000 |
| 150 mil a 349,9 mil | 150.000 |
| 350 mil a 999,9 mil | 350.000 |
| 1 milhão a 4,9 milhões | 1.000.000 |
| 5 milhões a 9,9 milhões | 5.000.000 |
| Mais de 10 milhões | 10.000.000 |

Abaixo de R$ 100.000 → "Abaixo do mínimo atendido (R$ 100.000)" (sem recomendação).

**4 perfis de risco**: Conservador, Conservador Moderado, Moderado, Arrojado.
⚠️ As faixas **100–149,9 mil** e **150–349,9 mil** *não têm* o perfil "Conservador Moderado" (combinação inválida — a planilha exige escolher outro perfil). Total de combinações válidas na matriz: **22**, todas somando exatamente 100%.

Os perfis coincidem 1:1 com os do suitability do sistema (`conservador`, `conservador_moderado`, `moderado`, `arrojado` — `calcularPerfil` em `src/types/financialPlanning.ts`).

## 3. Fluxo de cálculo (Painel → Resultado Final)

```
Entradas: nome, patrimonioTotal, custoVidaMensal, mesesReserva, perfil

1. faixa            = lookup(patrimonioTotal, mínimos das faixas)        # Painel!C10
2. reservaEmergencia = custoVidaMensal × mesesReserva                    # Painel!C15
3. patrimonioInvestido = patrimonioTotal − reservaEmergencia             # Painel!C16
4. validar combinação (faixa|perfil) existe na matriz                    # Painel!C13
5. para cada classe i (1..11):
     pctClasse[i] = Matriz[faixa|perfil][i]                              # Painel!C21:C31
     valorClasse[i] = pctClasse[i] × patrimonioInvestido                 # Painel!D21:D31
6. para cada classe i:
     bloco = _BlocoMap[faixa|perfil|classe]  → produtos da aba da faixa
     para cada produto p do bloco:
        pctNaClasse[p] = regra de pesos (ver §4)
        valorProduto[p] = pctNaClasse[p] × valorClasse[i]
```

A **reserva de emergência é subtraída antes** da alocação — os % incidem só sobre o patrimônio investido. A faixa, porém, é determinada pelo patrimônio **total**.

## 4. Regras de peso dos produtos dentro da classe

Cada bloco (faixa|perfil|classe) lista até 8 produtos (16 na aba `5M-9,9M`). O % de cada produto na classe é calculado assim:

### 4a. Classes de renda fixa / Exterior / Bitcoin (sem recomendação de preço)

- **Caso padrão:** peso igual entre os produtos não vazios do bloco → `1 / N`.
- **Regra "Mutual fund":** se o bloco contém produtos cujo nome começa com `Mutual fund`:
  - os "Mutual fund\*" dividem **70%** igualmente entre si (`0,70 / nMF`);
  - os demais dividem **30%** igualmente (`0,30 / nOutros`);
  - se o bloco só tem "Mutual fund\*", eles dividem 100%; se só tem "outros", idem.
  - ⚠️ Na planilha atual existem produtos literalmente chamados `Mutual fund 1..4` (placeholders a renomear). A regra é disparada pelo *prefixo do nome* — frágil; no sistema deve virar um campo booleano `is_fundo` (ou tipo do produto).

### 4b. Ações e FIIs (com recomendação de preço)

- Cada produto (ticker) é procurado na aba `Preços e Recomendações`:
  - `recomendacao = Preço Teto > Preço de Hoje ? "Comprar" : "Aguardar"`
  - `Preço de Hoje` vem de `GOOGLEFINANCE(prefixo & ticker)` (ex.: `BVMF:BBAS3`); ticker não cadastrado → "não cadastrado".
- **Só produtos com "Comprar" recebem peso**, dividido igualmente: `1 / nComprar`.
- Se nenhum produto do bloco está em "Comprar", todos ficam com 0% (a classe fica sem alocação em produtos — o % da classe na carteira permanece o da matriz).

## 5. Estrutura dos dados extraídos (`planilha-alocacao-data.json`)

```jsonc
{
  "categorias": [/* 11 classes, ordem canônica */],
  "faixas": [{ "nome", "min", "max_ref" }],                     // 6
  "matriz_alocacao": [{ "faixa", "perfil", "alocacao": {classe: pct}, "soma" }], // 22
  "precos_recomendacoes": [{ "ativo", "classe", "preco_teto", "preco_hoje",
                             "recomendacao", "prefixo" }],       // 27 tickers
  "blocos_produtos": [{ "faixa", "perfil", "categoria", "aba", "linhas",
                        "produtos": [{ "nome", "pct_na_categoria", "recomendacao" }] }] // 198
}
```

Números de validação da extração (2026-07-13):

- 22 combinações na matriz, todas somando 100,000%.
- 198 blocos = 18 combinações faixa|perfil × 11 classes.
  ⚠️ A faixa **"Mais de 10 milhões" tem matriz de % mas não tem blocos de produtos** (sem aba de detalhamento) — o Resultado Final mostraria só os % por classe.
- 68 blocos vazios (classes com 0% ou sem produto cadastrado para a combinação).
- 57 produtos distintos; 27 tickers na tabela de preços.
- `pct_na_categoria`/`recomendacao` no JSON são os valores *calculados no momento do snapshot* (dependem do preço do dia) — no sistema devem ser recalculados, não lidos.

## 6. Correspondência com o sistema (Etapa 2 — Recomendada)

| Planilha | Sistema hoje |
|---|---|
| Perfil (4 valores) | `suitabilityPerfil` em `financial_plans` (mesmos 4 valores) ✔ |
| Patrimônio total | `plan.ativosAtuais.total` → `patrimonyInicial` (em `SecaoAssetAllocation.tsx`) ✔ |
| Custo de vida mensal / meses de reserva | **não capturado hoje na ferramenta de carteira** — precisa entrar como input (ou vir do planejamento financeiro) |
| 11 classes | 6 `CardId`s (`resgate_longo`, `resgate_rapido`, `acoes`, `fiis`, `exterior`, `cripto`) — ver mapeamento abaixo |
| `ALOCACAO_PADRAO` hardcoded (`src/lib/carteira/types.ts:54`) | será substituído/alimentado pela matriz (que também varia por **faixa**, não só por perfil) |
| Produtos recomendados | hoje digitados à mão; passarão a ser pré-preenchidos pelos blocos |

Sugestão de mapeamento 11 classes → 6 cards (a confirmar com o time):

- `resgate_rapido` ← Renda Fixa pós curta
- `resgate_longo` ← RF pós longa + IPCA Curto + IPCA Longo + Infra IPCA + Infra CDI + Prefixado
- `acoes` ← Ações · `fiis` ← FIIs · `exterior` ← Exterior · `cripto` ← Bitcoin

Nota: há dois presets divergentes no código (`ALOCACAO_PADRAO` em `lib/carteira/types.ts` e `ALOCACAO_ALVO` em `types/financialPlanning.ts`) — a adoção da matriz é a oportunidade de unificar.

## 7. Modelo de dados proposto (Supabase)

```sql
-- versionamento: cada sync gera uma versão; o app lê a última publicada
create table allocation_versions (
  id uuid primary key default gen_random_uuid(),
  source text not null,            -- id/URL da planilha
  checksum text not null,          -- hash do conteúdo p/ detectar mudança
  status text not null default 'published',  -- staging | published | rejected
  created_at timestamptz not null default now()
);

create table allocation_bands (    -- faixas
  version_id uuid references allocation_versions,
  nome text, min_patrimonio numeric, ordem int
);

create table allocation_matrix (   -- 22 linhas por versão
  version_id uuid references allocation_versions,
  faixa text, perfil text, classe text, pct numeric,
  constraint pct_range check (pct >= 0 and pct <= 1)
);

create table allocation_products ( -- blocos de produtos
  version_id uuid references allocation_versions,
  faixa text, perfil text, classe text,
  nome text, is_fundo boolean default false, ordem int
);

create table asset_prices (        -- tabela de preços/recomendações
  version_id uuid references allocation_versions,
  ticker text, classe text, preco_teto numeric,
  preco_hoje numeric, preco_hoje_atualizado_em timestamptz
);
```

RLS: leitura para `authenticated`; **escrita apenas via service role** (Edge Function de sync). `recomendacao` (Comprar/Aguardar) e pesos por produto são **calculados no app**, nunca persistidos como verdade.

## 8. Integração dinâmica — opções avaliadas

### Opção A — Recomendada: sync Planilha → Supabase (Edge Function + service account)

1. Compartilhar a planilha Google **somente-leitura com o e-mail de uma service account** do Google Cloud (não tornar pública).
2. Edge Function `sync-allocation` (Supabase) lê a planilha via Google Sheets API (`spreadsheets.values.batchGet` das abas `Parâmetros`, `Preços e Recomendações`, abas de faixa e `_BlocoMap`), valida e faz upsert versionado.
3. Agendamento: `pg_cron`/Scheduled Function (ex.: diário) + botão manual "Sincronizar" para admin (que só *invoca* a function; a credencial fica no servidor).
4. O app calcula a recomendação em TypeScript puro (regras dos §3–4) a partir dos dados do banco.

**Por quê:** a credencial nunca chega ao front; a planilha continua privada; o app não depende do Google em runtime (latência/quota/fragilidade de layout); dá para validar antes de publicar e reverter versão.

### Opção B — Ler a planilha em runtime (link CSV público)

Exige publicar a planilha ("qualquer pessoa com o link"), expõe a estratégia da casa, quebra se alguém renomear uma aba/coluna, sem validação nem histórico, sujeito a quota/latência do Google a cada uso. **Não recomendada** para dado sensível de negócio.

### Validações obrigatórias no sync (gate de publicação)

- Cada combinação faixa|perfil soma 100% (tolerância 0,01 p.p.).
- Classes/faixas/perfis pertencem aos conjuntos canônicos.
- Todo ticker de Ações/FIIs dos blocos existe em `Preços e Recomendações` (a própria planilha instrui isso).
- Nenhuma faixa/perfil válido desapareceu vs. versão anterior (mudança estrutural → staging + aviso, não publica sozinho).
- Log de sync com diff e checksum; versão anterior preservada para rollback.

### Pontos em aberto (decidir com o time)

1. **Preço de hoje**: manter o snapshot do sync (recomendações mudam 1×/dia) ou buscar cotação via API (ex.: brapi.dev) no cálculo? O snapshot é mais simples e fiel ao fluxo atual da planilha.
2. Mapeamento 11 classes → 6 cards (ou evoluir a Etapa 2 para exibir as 11 classes).
3. De onde vem custo de vida mensal × meses de reserva (novo input na ferramenta vs. dado do planejamento).
4. Faixa "Mais de 10 milhões" sem produtos: exibir só % por classe?
5. Renomear os placeholders `Mutual fund 1..4` na planilha e/ou marcar fundos com uma coluna própria.
