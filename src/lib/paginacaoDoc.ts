/* ── Paginação por altura estimada das páginas A4 do documento final ─────────
 * As páginas do documento (PaginaDoc) têm exatamente 297mm; conteúdo que
 * excede a folha é cortado na impressão. Este módulo permite às páginas de
 * conteúdo dinâmico (movimentações, plano de ação, tabela da carteira)
 * distribuir os itens em folhas respeitando um orçamento de altura,
 * em vez de caps por contagem de itens (que quebram com textos longos).
 *
 * Todas as medidas em px CSS (1mm ≈ 3.7795px @ 96dpi).
 */

export const MM_PX = 3.7795;

/** Altura útil do miolo: 297mm menos o padding vertical padrão (14mm + 10mm) */
export const ALTURA_MIOLO = Math.floor((297 - 24) * MM_PX); // ≈ 1031

/** HeaderSecao sem e com subtítulo ("continuação") */
export const ALTURA_HEADER = 66;
export const ALTURA_HEADER_SUBTITULO = 87;

/** RodapePagina + paddingTop do wrapper do rodapé */
export const ALTURA_RODAPE = 44;

/** Folga contra variações de fonte/quebra de linha entre tela e impressão */
export const FOLGA_SEGURANCA = 24;

/** Orçamento de altura do conteúdo em página com header padrão e rodapé */
export function orcamentoPagina(comSubtitulo = false): number {
  return (
    ALTURA_MIOLO -
    (comSubtitulo ? ALTURA_HEADER_SUBTITULO : ALTURA_HEADER) -
    ALTURA_RODAPE -
    FOLGA_SEGURANCA
  );
}

/** Nº estimado de linhas de um texto após quebra automática de linha */
export function linhasTexto(texto: string, charsPorLinha: number): number {
  return (texto ?? "")
    .split("\n")
    .reduce((n, p) => n + Math.max(1, Math.ceil(p.length / charsPorLinha)), 0);
}

export interface ItemPaginavel<T> {
  item: T;
  altura: number;
  /** Item que não pode fechar uma página (ex.: cabeçalho de grupo/subseção):
   *  é movido junto com o item seguinte quando a página enche. */
  grudaNoProximo?: boolean;
}

/**
 * Empacota itens em páginas na ordem dada, respeitando o orçamento de altura
 * de cada página. `orcamentos[i]` vale para a página i; o último valor vale
 * para todas as páginas seguintes. Um item mais alto que o orçamento ganha
 * página própria (o excesso é sinalizado na tela pelo aviso do PaginaDoc).
 */
export function empacotarPorAltura<T>(
  itens: ItemPaginavel<T>[],
  orcamentos: number[],
): ItemPaginavel<T>[][] {
  const paginas: ItemPaginavel<T>[][] = [];
  let atual: ItemPaginavel<T>[] = [];
  let usado = 0;

  const orcamentoDe = (pagina: number) =>
    orcamentos[Math.min(pagina, orcamentos.length - 1)];

  for (let i = 0; i < itens.length; i++) {
    // Bloco indivisível: item + sequência de itens "gruda no próximo" antes dele
    const bloco: ItemPaginavel<T>[] = [itens[i]];
    while (bloco[bloco.length - 1].grudaNoProximo && i + 1 < itens.length) {
      i++;
      bloco.push(itens[i]);
    }
    const alturaBloco = bloco.reduce((s, b) => s + b.altura, 0);

    if (usado > 0 && usado + alturaBloco > orcamentoDe(paginas.length)) {
      paginas.push(atual);
      atual = [];
      usado = 0;
    }
    atual.push(...bloco);
    usado += alturaBloco;
  }
  if (atual.length > 0) paginas.push(atual);
  return paginas;
}
