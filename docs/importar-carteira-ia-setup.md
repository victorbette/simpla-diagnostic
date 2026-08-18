# Setup — Importar carteira de print (IA)

Em **Gestão de Carteira → Etapa 1 (Carteira Atual)** o consultor anexa prints da
carteira do cliente; a IA lê cada posição e devolve uma lista editável — um ativo
por linha, com classe, segmento, vencimento e valor — antes de qualquer coisa ser
lançada nos cards.

## Arquitetura

```
Prints (upload / drag&drop / Ctrl+V)
   │  redimensiona p/ 2000px e comprime em JPEG (browser, canvas)
   ▼
Edge Function extract-portfolio  ──►  OpenAI (visão + structured outputs)
   │  valida JWT do usuário; OPENAI_API_KEY só existe aqui
   ▼
Tela de revisão (ImportarCarteiraIA)  ──consultor valida/ajusta──►  Etapa 1
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

Pela interface: Gestão de Carteira → Etapa 1 (Carteira Atual) → **Importar de
print (IA)**.

Por linha de comando, com um print qualquer (ex.: o `print.jpeg` da raiz):

```powershell
$env:TEST_EMAIL="voce@simpla.com"     # usuário do app; a função exige JWT
$env:TEST_PASSWORD="..."
node scripts/testar-extracao.mjs print.jpeg
```

(URL e publishable key vêm do `.env` do projeto.)

Saída esperada: uma linha por ativo com ticker, classe, valor e confiança.

## Como a IA classifica

Cada linha extraída recebe um dos 8 cards da Etapa 1 (`CardId` em
`src/lib/carteira/types.ts`) — ou `naoIdentificado`, que **não** é aplicado sem o
consultor escolher a classe:

| Classe | Exemplos |
| --- | --- |
| `resgate_rapido` | Tesouro Selic, CDB de liquidez diária, poupança, fundos DI, caixa |
| `resgate_longo` | CDB pré/IPCA, LCI/LCA, debêntures, CRI/CRA, Tesouro IPCA+, fundos RF com prazo |
| `acoes` | Ações BR (final 3/4/5/6), BOVA11, SMAL11, fundos de ações BR |
| `fiis` | Fundos imobiliários (final 11 com "FII"), Fiagro |
| `exterior` | BDRs (final 31–35, ex.: AAPL34), ações/ETFs internacionais, IVVB11, REITs, bonds, treasuries |
| `cripto` | BTC, ETH, stablecoins, HASH11/QBTC11 |
| `alternativos` | COE, estruturados, multimercado, FIDC, PE/VC, ouro |
| `previdencia` | PGBL, VGBL |

Além da classe, a IA sugere **segmento** (restrito aos rótulos que o dropdown do
card aceita — o front encaixa a sugestão na lista com `normalizarSegmento`) e
**vencimento** (só para renda fixa, e só quando visível no print).

### Renda fixa: liquidez decide o card, indexador decide o segmento

A separação entre `resgate_rapido` e `resgate_longo` é por **liquidez**, não por
indexador — e essa é a regra que mais escapa de um modelo de visão. Ela está
escrita no prompt como árvore de decisão e, para os produtos que o próprio nome
crava, tem uma rede de segurança determinística no front
(`refinarRendaFixa` em `src/lib/importarCarteira.ts`):

| Produto | Card | Segmento |
| --- | --- | --- |
| Tesouro Selic, LFT | `resgate_rapido` | Pós-fixado |
| Tesouro IPCA+, NTN-B, Renda+, Educa+ | `resgate_longo` | Inflação |
| Tesouro Prefixado, LTN, NTN-F | `resgate_longo` | Prefixado |
| Poupança, saldo em conta, caixa | `resgate_rapido` | Pós-fixado |
| Qualquer linha com "liquidez diária" / D+0 / D+1 | `resgate_rapido` | Pós-fixado |

`Tesouro Selic 2029` fica em Resgate Rápido mesmo tendo ano no nome (o resgate é
diário); um `CDB 110% do CDI 2028` fica em Resgate Longo com segmento
"Pós-fixado". Para o resto — CDB, LCI/LCA, debêntures, CRI/CRA, fundos — vale o
que a IA leu, e o front só preenche o segmento vazio a partir do indexador no
nome (IPCA → Inflação, CDI/Selic → Pós-fixado, prefixado → Prefixado).

A rede de segurança **só age em linhas que a IA já colocou em renda fixa** e
ignora nome de banco emissor — `CDB Caixa 2028` continua Resgate Longo. Trocar a
classe na revisão roda a mesma régua de novo e descarta segmento que não
pertença ao card de destino.

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
**adiciona** os ativos importados aos que já estão lançados — o caminho de quem
importa uma corretora por print. O checkbox **Substituir** troca a carteira
inteira pelo que foi importado (aparece só quando já há ativos na tela).

## Limites e custos

- 6 imagens por importação; cada imagem é comprimida para ≤ ~1,2 MB no browser.
- Uma chamada de IA por imagem (em paralelo); se uma falhar, as outras seguem e
  a falha aparece como aviso na revisão.
- Timeout de 90s por imagem.
- A função só responde a usuário autenticado — nenhuma chamada anônima gasta crédito.
