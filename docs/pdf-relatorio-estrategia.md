# PDF do Relatório de Estratégia — Visão Geral para Manutenção

> Documento de orientação para quem (humano ou IA) for dar manutenção na **geração do
> PDF** do documento "Financial Planning / Estratégia Inicial". Lê em ~10 min e evita os
> erros clássicos (conteúdo cortado, página em branco, estilo que desalinha na impressão).

---

## 1. O que é e como o PDF é gerado

Não usamos biblioteca de PDF. O documento é montado como **HTML/React diagramado em folhas
A4** e o PDF sai do **print-to-pdf do navegador** (`window.print()`), controlado por um bloco
`@media print` no CSS.

Fluxo do clique "Imprimir / Salvar PDF":

1. `EstrategiaFinal.tsx` → `handleGerarPdf()` (`src/components/estrategia/EstrategiaFinal.tsx:78`)
   salva a seleção de seções, chama `onConcluir()` (persiste), e após `setTimeout(…, 150)`
   chama `gerarPDF(clientName)`.
2. `gerarPDF` (`src/lib/gerarPDF.ts`) só troca `document.title` (vira o nome do arquivo) e
   chama `window.print()`.
3. O que aparece no PDF é definido pelo `@media print` em `src/index.css` (a partir de
   `@media print {`): esconde a UI (`.no-print`, headers, abas, toasts do sonner), troca
   `doc-screen-only`↔`doc-print-only`, e **trava cada `.doc-pagina` em exatamente 297mm com
   `overflow: hidden`**.

> ⚠️ A trava de 297mm + `overflow: hidden` é intencional: sem ela o navegador quebra uma div
> alta em duas folhas físicas (corte no pé + continuação sem margem). Com ela, qualquer
> excesso é **aparado dentro da folha**. Por isso a paginação precisa caber o conteúdo em cada
> folha — ver seção 4.

---

## 2. Mapa de arquivos

Tudo em `src/components/estrategia/documento/` salvo indicação em contrário.

### Núcleo / primitivas (mexer aqui afeta todas as páginas)
| Arquivo | Papel |
|---|---|
| `PaginaDoc.tsx` | Casca de uma folha A4. Flex column, `minHeight:297mm` (tela) / travada em 297mm (impressão), rodapé empurrado ao fim com `marginTop:auto`. Decoração de fundo (wedges/marca d'água). |
| `PaginaDocFluida.tsx` | **Paginação automática por medição real.** Recebe uma lista de `BlocoDoc` e distribui em quantas folhas forem necessárias. É o mecanismo preferido (ver seção 4). |
| `HeaderSecao.tsx` | Cabeçalho de página de conteúdo (título + "SIMPLA INVEST" + régua). Aceita `subtitulo` (usado como "continuação"). |
| `RodapePagina.tsx` | Rodapé em fluxo ("Financial Planning · {cliente}"). |
| `DivisoriaSecao.tsx` | Página-divisória escura antes de cada área. |
| `MarcaSimpla.tsx` | Logo/wordmark. |
| `CalloutConsultor.tsx` | Observação do consultor: hook `useNotaConsultor` + `blocosNotaConsultor` (ver seção 5). |
| `src/lib/paginacaoDoc.ts` | `empacotarPorAltura` + constantes de orçamento de altura (ver seção 4). |
| `src/lib/documentoStyles.ts` | Tokens de design: paleta `DOC`, `TEXTO_CORPO`, `CARD`, `LABEL_CARD`, `LABEL_SUBSECAO`, `TITULO_SECAO`. |
| `src/lib/documentoConfig.ts` | Seções opcionais (`AREAS_DOCUMENTO`), `SelecaoSecoes`, `ConfigConsultor` + defaults e persistência. |
| `src/lib/gerarPDF.ts` | Dispara `window.print()`. |

### Composição
| Arquivo | Papel |
|---|---|
| `src/components/estrategia/EstrategiaFinal.tsx` | **Raiz de composição.** Define a ordem das páginas e liga/desliga seções conforme a seleção. É por onde se adiciona/reordena seção. |
| `ModalSecoesPdf.tsx` | Modal onde o consultor escolhe quais áreas entram no PDF. |

### Páginas de conteúdo
| Seção | Arquivo | Paginação |
|---|---|---|
| Capa | `DocCapa.tsx` | fixa (1 folha) |
| Sumário | `DocSumario.tsx` | fixa |
| Introdução | `DocFinancialPlanning.tsx` | fixa |
| Ponto de Partida | `DocPontoDePartida.tsx` | **fluida** |
| Liberdade Financeira | `DocLiberdadeFinanceira.tsx` | **fluida** |
| Asset Allocation | `DocAssetAllocation.tsx` | **fluida** |
| Alocação Atual x Proposta | `DocAlocacaoAtualProposta.tsx` | ⚠️ legada (estimada) |
| Movimentações Recomendadas | `DocMovimentacoes.tsx` | **fluida** |
| Proteção e Sucessão | `DocProtecaoSucessao.tsx` | **fluida** |
| Planejamento Tributário | `DocPlanejamentoTributario.tsx` | **fluida** |
| Plano de Ação | `DocPlanoAcao.tsx` | ⚠️ legada (estimada) |
| Mãos à Obra | `DocMaosAObra.tsx` | fixa |
| Disclaimer | `DocDisclaimer.tsx` | fixa |
| Contracapa | `DocContracapa.tsx` | fixa (só imagem) |

---

## 3. Modelo de renderização: tela × impressão

Cada página é a mesma árvore React nos dois modos; o que muda é o CSS:

- `.no-print` — some na impressão (botões, ícones de UI).
- `.doc-screen-only` — só na tela (ex.: `textarea`/`input` editáveis, botão "Adicionar").
- `.doc-print-only` — só na impressão (ex.: texto puro no lugar do input).
- `.doc-vazio-no-print` — some na impressão quando o conteúdo está vazio.

Regra prática: **todo campo editável tem um par** — o controle editável (`doc-screen-only`)
e a versão de texto para impressão (`doc-print-only`). Ver exemplos em `DocPlanoAcao.tsx`
(input↔texto, `type=month`↔"mm/aaaa") e `CalloutConsultor.tsx`.

Diferença de altura importante: **na tela** a `.doc-pagina` tem `minHeight:297mm` e **cresce**
com o conteúdo (não corta); **na impressão** é travada em 297mm e **corta**. Por isso a
paginação é calculada pela **altura de impressão** (seção 4).

---

## 4. Paginação — LEIA antes de mexer em qualquer seção

Existem **dois sistemas**. Prefira sempre o fluido.

### 4a. Fluido (preferido) — `PaginaDocFluida`
A seção monta um array de blocos indivisíveis:

```ts
const blocos: BlocoDoc[] = [
  { chave: "intro", node: <p style={{...}}>…</p> },
  { chave: "grid",  node: <div>…</div> },
  // rótulo que não pode fechar a folha sozinho:
  { chave: "label", grudaNoProximo: true, node: <p>SUBSEÇÃO</p> },
  { chave: "card",  node: <div className="doc-card">…</div> },
];
return <PaginaDocFluida titulo="…" nomeCliente={nomeCliente} blocos={blocos} />;
```

Como funciona: um **medidor oculto** (posição fixa fora da tela, reproduzindo o layout de
**impressão** via classe `.doc-medida-print`) renderiza cada bloco num wrapper
`display:flow-root` e mede a `offsetHeight` real. `empacotarPorAltura` distribui os blocos nas
folhas respeitando o orçamento de altura. As páginas seguintes recebem `subtitulo="continuação"`.

Regras ao criar blocos:
- **Cada `node` deve ter uma única raiz** (`<div>`/`<p>`). Para manter itens juntos, embrulhe
  num `<div>`; para permitir quebra entre eles, faça blocos separados. É assim que você
  controla os pontos de quebra.
- `grudaNoProximo: true` = o bloco não pode ser o último da folha (rótulos de subseção,
  cabeçalhos de grupo). Ele desce junto com o próximo.
- `chave` estável (evita remount e perda de foco em campos editáveis).
- Conteúdo de tamanho variável (texto do consultor, textos de área, listas) deve virar
  **vários blocos** (ex.: um por parágrafo), senão um bloco gigante estoura a folha e corta.

### 4b. Estimada (legada) — `empacotarPorAltura` com números mágicos
Usada ainda em `DocAlocacaoAtualProposta.tsx` e `DocPlanoAcao.tsx`. A altura de cada item é
**chutada** com constantes (`ALTURA_PIZZAS=272`, `ALTURA_PASSO=85`, `nome.length/42`, etc.).
É frágil: mudou fonte/padding → o chute desalinha → volta a cortar. **Dívida técnica
conhecida.** Ao mexer nessas seções, considere migrá-las para `PaginaDocFluida` (é a mudança
de maior impacto para robustez). `DocPlanoAcao` em especial tem bug latente: assume passo de
altura fixa, mas a descrição é texto variável.

### Orçamento de altura — `src/lib/paginacaoDoc.ts`
`orcamentoPagina(comSubtitulo)` = `ALTURA_MIOLO − header − rodapé − FOLGA_SEGURANCA`.
As constantes (`ALTURA_HEADER=66`, `ALTURA_RODAPE=44`, `FOLGA_SEGURANCA=24`, …) são medidas à
mão e acopladas ao estilo de `HeaderSecao`/`RodapePagina`. **Se mudar a fonte/altura do header
ou do rodapé, reavalie essas constantes**, senão a paginação erra o orçamento silenciosamente.

---

## 5. Observação do Consultor (callout)

`CalloutConsultor.tsx` expõe:
- `useNotaConsultor(clientId, secao)` → string reativa (lê `localStorage`, re-renderiza ao
  editar via evento interno `doc-coment-sync`).
- `blocosNotaConsultor(clientId, secao, nota)` → `BlocoDoc[]`: **1 bloco editor** (`doc-screen-only`,
  altura 0 na impressão) + **1 bloco por parágrafo** (`doc-print-only`, quebra por `\n`).

Consequência importante: na **tela** o consultor edita num `textarea` único; na **impressão**
o texto vira caixas âmbar que **fluem por várias folhas** (não corta). Observação vazia não
imprime caixa nenhuma. Como o editor é `doc-screen-only` (altura 0 na impressão), ele **não**
gera página-fantasma no PDF — a paginação usa altura de impressão de propósito.

Uso na seção:
```ts
const nota = useNotaConsultor(plan.clientId, "lf");
// … monta blocos …
blocos.push(...blocosNotaConsultor(plan.clientId, "lf", nota));
```
Sufixos de `secao` em uso: `lf`, `aa`, `ps`, `fiscal`, `aa_mov`.

---

## 6. Seleção de seções e config do consultor

- `AREAS_DOCUMENTO` (`documentoConfig.ts`) lista as áreas **opcionais**. Capa, sumário,
  introdução, mãos à obra, disclaimer e contracapa são **fixas**.
- A seleção é persistida por cliente e mesclada com o default (área nova entra marcada).
- `ConfigConsultor` (nome, credenciais, descrição, disclaimer) fica em `localStorage`
  (`config_consultor`) e é editável na própria página do disclaimer.

### Chaves de `localStorage`
| Chave | Conteúdo |
|---|---|
| `doc_secoes_{clientId}` | seleção de seções do PDF |
| `doc_coment_{clientId}_{secao}` | texto da observação do consultor |
| `config_consultor` | dados do consultor / disclaimer |

---

## 7. Como validar uma mudança no PDF

Existe um preview de desenvolvimento com dados fictícios (não entra no build):
`src/devPreviewDoc.tsx` servido por `preview-doc.html` (`http://localhost:5199/preview-doc.html`).
Suporta `?sem=planejamento_tributario,plano_acao` para simular a exclusão de seções.

Para checar corte/paginação de verdade, gere o PDF headless e inspecione (fluxo já usado no
projeto — ver memória "Geração de PDF do documento"):

```bash
# 1) subir o preview
npx vite --port 5199

# 2) imprimir para PDF via Edge headless
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw --virtual-time-budget=9000 \
  --user-data-dir=/tmp/edge-pdf --print-to-pdf=/tmp/out.pdf \
  "http://localhost:5199/preview-doc.html"

# 3) inspecionar com PyMuPDF (contagem de páginas, texto por página, render p/ PNG)
python -c "import fitz; d=fitz.open('/tmp/out.pdf'); [print(i+1, p.get_text()[:40]) for i,p in enumerate(d)]"
```

O que verificar: nº de páginas coerente; nenhuma página em branco inesperada (a contracapa
é só imagem, então "vazia" ali é normal); nenhum texto cortado no pé; cabeçalhos "continuação"
nas folhas de transbordo.

> Dica para forçar overflow no teste: semear uma observação longa em `localStorage`
> (`doc_coment_preview-cliente_{lf|aa|ps|fiscal|aa_mov}`) antes de imprimir.

---

## 8. Armadilhas comuns (checklist rápido)

- **Não** confie em `overflow` visível na tela: a folha cresce na tela mas corta na
  impressão. Sempre valide gerando o PDF.
- **Não** coloque conteúdo de tamanho variável num único bloco/página fixa — vira corte.
  Transforme em vários `BlocoDoc`.
- Gráficos Recharts na impressão: usar dimensões **fixas** e `isAnimationActive={false}`
  (senão saem em branco/animando no print). Ver `DocProtecaoSucessao`/`DocAlocacaoAtualProposta`.
- Campo editável novo: crie o par `doc-screen-only` (controle) + `doc-print-only` (texto).
- Ao mudar estilo de `HeaderSecao`/`RodapePagina`, revise as constantes de `paginacaoDoc.ts`.
- Não existe mais aviso "conteúdo excede a página" — foi removido de propósito; o overflow
  agora deve **fluir** via paginação, não avisar.
- Não há numeração de página no rodapé (decisão de design da referência).

---

## 9. Dívida técnica conhecida (candidatos a refactor)

1. **Duas lógicas de paginação.** Migrar `DocAlocacaoAtualProposta` e `DocPlanoAcao` para
   `PaginaDocFluida` (remove números mágicos e o bug latente do Plano de Ação).
2. **Estilos inline duplicados** sem escala tipográfica — extrair estilos nomeados em
   `documentoStyles.ts` (título de card, linha de tabela, badge).
3. **Boilerplate de seção** repetido — criar helpers de bloco (`blocoParagrafo`,
   `blocoEstadoVazio`, `blocoLabelSubsecao`).
4. **Mapas duplicados** — `PRIO_BADGE` existe em dois formatos; `AREAS` duplica rótulos de
   `AREAS_DOCUMENTO`.
5. **Regra de negócio em componente** — `gerarPassosIniciais` (`DocPlanoAcao.tsx`) deveria
   virar `lib/`.

---

## Regra de ouro

Sempre que a mudança puder afetar quanto conteúdo cabe numa folha (texto, padding, fonte,
item novo), **gere o PDF headless e confira** (seção 7). O que parece certo na tela pode
cortar na impressão.
