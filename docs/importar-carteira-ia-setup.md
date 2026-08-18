# Setup — Importar carteira de print (IA)

Na seção **Situação Atual → Carteira de Investimentos** do Financial Planning o
consultor anexa prints da carteira do cliente; a IA lê cada ativo e o patrimônio
atual, e devolve um resumo editável antes de qualquer valor entrar no formulário.

## Arquitetura

```
Prints (upload / drag&drop / Ctrl+V)
   │  redimensiona p/ 2000px e comprime em JPEG (browser, canvas)
   ▼
Edge Function extract-portfolio  ──►  OpenAI (visão + structured outputs)
   │  valida JWT do usuário; OPENAI_API_KEY só existe aqui
   ▼
Tela de revisão (ImportarCarteiraIA)  ──consultor valida/ajusta──►  AtivoForm
```

A chave da OpenAI **nunca** vai para o bundle do front: o browser só fala com o
Supabase, autenticado com o JWT da sessão.

### Chaves de API do Supabase

A função **não usa chave secreta** — ela só valida o JWT de quem chamou e nunca
toca no banco, então a *publishable key* basta (menor privilégio; a
`sync-allocation` é que precisa de secret/service_role, porque escreve nas
tabelas furando RLS).

A resolução da chave já cobre os dois padrões:

| Padrão | Variável injetada pelo runtime | Formato |
| --- | --- | --- |
| Novo | `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` | JSON por nome: `{ "default": "sb_publishable_…" }` |
| Legado | `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | string pura (JWT `eyJ…`) |

Nada a configurar: o `chaveDeValidacao()` lê `SUPABASE_PUBLISHABLE_KEYS` e cai
para `SUPABASE_ANON_KEY` enquanto as duas convivem. O prefixo `SUPABASE_` é
reservado — `supabase secrets set SUPABASE_*` é rejeitado; essas variáveis vêm
do runtime, e o `secrets set` é só para segredos de terceiros (a OpenAI, aqui).

## Passo 1 — Chave da OpenAI

1. [platform.openai.com](https://platform.openai.com) → **API keys** → *Create secret key*.
2. Garanta saldo/billing ativo no projeto da chave.

Custo por print: alguns centavos de dólar (uma chamada de visão por imagem).

## Passo 2 — Secrets + deploy

```powershell
supabase login                       # 1x, abre o navegador
supabase link --project-ref <ref>    # 1x; <ref> está na URL do painel

supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set OPENAI_MODEL="gpt-4o"    # opcional; default já é gpt-4o

supabase functions deploy extract-portfolio
```

> O modelo precisa suportar **visão** e **structured outputs** (`json_schema`).
> `gpt-4o` atende. Para trocar de modelo depois, basta refazer o
> `secrets set OPENAI_MODEL` — não precisa novo deploy.

## Passo 3 — Testar

Pela interface: Financial Planning → Situação Atual → **Importar de print (IA)**.

Por linha de comando, com um print qualquer (ex.: o `print.jpeg` da raiz):

```powershell
$env:TEST_EMAIL="voce@simpla.com"     # usuário do app; a função exige JWT
$env:TEST_PASSWORD="..."
node scripts/testar-extracao.mjs print.jpeg
```

(URL e publishable key vêm do `.env` do projeto.)

Saída esperada: uma linha por ativo com ticker, classe, valor e confiança.

## Como a IA classifica

Cada linha extraída recebe uma das 8 classes do `AtivoForm` (ou
`naoIdentificado`, que **não** é aplicado sem o consultor escolher a classe):

| Classe | Exemplos |
| --- | --- |
| `rendaFixa` | CDB, LCI/LCA, Tesouro, debêntures, CRI/CRA, fundos DI, caixa |
| `acoes` | Ações BR (final 3/4/5/6), BOVA11, SMAL11, fundos de ações BR |
| `fiis` | Fundos imobiliários (final 11 com "FII"), Fiagro |
| `rvGlobal` | BDRs (final 31–35, ex.: AAPL34), ações/ETFs internacionais, IVVB11, REITs |
| `rfGlobal` | Bonds, treasuries, RF internacional, caixa em dólar |
| `cripto` | BTC, ETH, stablecoins, HASH11/QBTC11 |
| `alternativos` | COE, estruturados, multimercado, FIDC, PE/VC, ouro |
| `previdencia` | PGBL, VGBL |

Regras de leitura relevantes (todas no prompt da função):

- usa a coluna de **valor total atual** ("Valor Total Atual", "Saldo Bruto",
  "Posição", "Valor de Mercado") — nunca preço unitário, cotação, quantidade,
  % da carteira ou rentabilidade;
- converte número brasileiro (`4.758,60` → `4758.6`);
- ignora linhas de total/subtotal ("Total Geral");
- valor ilegível vira `0` com confiança `baixa` (a linha aparece destacada na revisão);
- moeda estrangeira **não** é convertida — a revisão avisa para o consultor conferir.

## Revisão antes de aplicar

A tela de revisão permite: editar nome/valor, trocar a classe, desmarcar ou
excluir linhas, e adicionar linhas manuais. O botão **Aplicar na carteira**
substitui as 8 classes do formulário — ou **soma** aos valores já preenchidos
(checkbox), que é o caminho ao importar corretoras em prints separados.

## Limites e custos

- 6 imagens por importação; cada imagem é comprimida para ≤ ~1,2 MB no browser.
- Uma chamada de IA por imagem (em paralelo); se uma falhar, as outras seguem e
  a falha aparece como aviso na revisão.
- Timeout de 90s por imagem.
- A função só responde a usuário autenticado — nenhuma chamada anônima gasta crédito.
