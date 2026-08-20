# Catálogo de ativos

Base que resolve **classe (card) e segmento a partir do ticker**. Existe porque
nem a planilha de alocação nem a leitura por IA trazem essa informação de forma
confiável: a planilha só lista o nome do produto, e um print de home broker
raramente diz que PETR4 é petróleo.

## Onde fica

| Arquivo | Papel |
| --- | --- |
| `src/data/ativos.csv` | **Fonte da verdade.** Editável à mão, uma linha por ativo. |
| `scripts/gerarCatalogoAtivos.mjs` | Traduz o CSV para o vocabulário do app e gera o módulo. |
| `src/lib/carteira/catalogoAtivos.gen.ts` | **Gerado — não edite.** Tabela `ticker → [card, segmento, setor?]`. |
| `src/lib/carteira/catalogo.ts` | A busca: `resolverAtivo`, `segmentoNoCard`, `sugerirAtivos`. |
| `scripts/testar-catalogo.mjs` | Testa formatos de ticker reais e os falsos positivos. |

## Como atualizar a lista

1. Edite `src/data/ativos.csv` (`TICKER,Classe,Categoria`).
2. `npm run catalogo`
3. `node scripts/testar-catalogo.mjs`

O `npm run build` também regenera, então o `.gen.ts` nunca fica defasado em
relação ao CSV.

### Formato do CSV

```csv
TICKER,Classe,Categoria
PETR4,Ações,"Petróleo, Gás e Biocombustíveis"
IVVB11 | VOO,ETFs,S&P500 EUA
```

- **TICKER** — equivalentes separados por `|` viram chaves distintas apontando
  para a mesma classificação (BDR + ticker americano, ETFs irmãos).
- **Classe** — `Ações`, `Fundos Imobiliários`, `Stocks`, `REITs` ou `ETFs`.
- **Categoria** — setor (ações/FIIs) ou mercado-alvo (ETFs). Campo com vírgula
  precisa de aspas.

O gerador **aborta** se uma categoria não corresponder a nenhum segmento válido
do card, listando o que precisa ser decidido. Isso é proposital: um segmento
fora de `SEGMENTOS_POR_CLASSE` seria descartado silenciosamente pelo
`casarSegmento` na importação, e o campo voltaria a ficar vazio.

Para aceitar um segmento novo, adicione o rótulo **nos dois lugares**:
`SEGMENTOS_POR_CLASSE` em `src/lib/carteira/types.ts` e `SEGMENTOS_VALIDOS` em
`scripts/gerarCatalogoAtivos.mjs` (o gerador valida contra essa cópia).

## Regras de tradução

**ETFs não vão todos para o mesmo lugar.** Quem decide é o mercado-alvo, não o
formato do papel: `Índice Ibovespa`, `ETF de Small Caps brasileiras` e
`ETF de empresas pagadoras de dividendos` são renda variável Brasil (card
`acoes`, segmento `ETF Brasil`); `Criptomoeda(s)` vai para `cripto`;
`Renda Fixa EUA` vira `ETF RF`; o resto é `ETF RV` em Exterior.

**Em Exterior o segmento é o instrumento, não o setor.** `Stocks`, `REITs`,
`ETF RV`, `ETF RF` — é o vocabulário do card. O setor original da lista
("Technology", "Residential") fica guardado como `setor` na entrada do catálogo
e aparece nas sugestões de autocomplete.

**BDR segue a empresa, não o papel.** A lista separa BDR de empresa estrangeira
(AAPL34 → Exterior) de BDR de empresa brasileira listada fora (ROXO34/NU,
XPBR31/XP, INBR32, JBSS32, AURA33 → Ações). O gerador respeita a coluna
`Classe`, então essa distinção é mantida pela própria lista.

**Renda fixa não está no catálogo.** CDB, LCI, debênture e Tesouro não têm
ticker estável; quem resolve continua sendo a régua de liquidez e indexador em
`refinarRendaFixa` (`src/lib/importarCarteira.ts`).

## Onde o catálogo é consultado

**Etapa 2 — ativos recomendados** (`alocacaoSimpla.ts`). Os nomes de produto da
planilha costumam ser o próprio ticker. `segmentoNoCard` só preenche quando o
ticker pertence ao card daquela classe; se a planilha e o catálogo discordarem,
vale o fallback da classe em vez de um segmento inválido.

**Etapa 1 — importação por IA** (`importarCarteira.ts`). `aplicarCatalogo` roda
depois da régua de renda fixa e **sobrescreve classe e segmento** quando o
ticker casa — ler "PETR4" é evidência determinística, mais forte que a dedução
do modelo de visão. Também tira linhas de "Não identificado". O valor financeiro
continua sendo leitura pura da IA. Já em `reclassificar`, quando o consultor
troca a classe à mão, o catálogo **não** reclassifica: só oferece o segmento.

**Etapa 1 — lançamento manual** (`CarteiraCard.tsx`). O campo de nome tem
autocomplete por ticker e preenche o segmento sozinho. Escolher o segmento à mão
trava o campo — a partir daí trocar o nome não o sobrescreve.

## Falsos positivos

Há tickers que também são palavras (`META`, `VOO`, `WELL`, `COST`) ou siglas de
corretora (`XP`), e casar um deles no meio de uma descrição reclassificaria o
ativo errado. A busca se defende assim:

- Tickers com dígito (`PETR4`, `HGLG11`, `AAPL34`) não colidem com palavras e
  são procurados livremente, incluindo o fracionário `PETR4F`.
- Tickers só de letras precisam ter **3+ caracteres e vir em caixa alta** no
  texto original — `META` casa, `Meta de aporte` não.
- Tickers de 1 a 2 letras (`V`, `O`, `XP`, `KO`, `NU`) só casam quando são o
  texto **inteiro**, e por isso "XP Investimentos CCB 2028" não vira ação da XP.

`scripts/testar-catalogo.mjs` fixa esses casos — rode depois de mexer na busca.
