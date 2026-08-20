// ============================================================================
// Catálogo de ativos — resolve card e segmento a partir do nome/ticker.
// ----------------------------------------------------------------------------
// A base vive em src/data/ativos.csv e é compilada em catalogoAtivos.gen.ts
// (node scripts/gerarCatalogoAtivos.mjs). Este módulo é só a busca: recebe o
// texto como ele aparece na carteira — "PETR4", "PETR4 - PETROBRAS PN",
// "HGLG11 CI", "AAPL34" — e devolve a classificação.
//
// É consultado em três lugares:
//   · Etapa 2, ao gerar os ativos recomendados a partir da planilha;
//   · import por IA, para corrigir o palpite do modelo com dado determinístico;
//   · "+ Adicionar" manual, para preencher o segmento enquanto se digita.
// ============================================================================

import type { CardId } from "./types";
import { CATALOGO_ATIVOS } from "./catalogoAtivos.gen";

export { CATALOGO_TOTAL } from "./catalogoAtivos.gen";

export interface AtivoCatalogado {
  /** Ticker que casou, já em caixa alta. */
  ticker: string;
  card: CardId;
  segmento: string;
  /** Setor original da lista — só em Exterior, onde o segmento é o instrumento. */
  setor?: string;
}

/**
 * Caixa alta sem acento: a chave do catálogo é sempre ASCII maiúsculo. NFD
 * separa o acento da letra e o corte do não-ASCII descarta só o acento — mesma
 * régua de `textoNormalizado` em importarCarteira.ts.
 */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[^\x20-\x7e]/g, "").toUpperCase().trim();
}

function montar(ticker: string): AtivoCatalogado | null {
  const entrada = CATALOGO_ATIVOS[ticker];
  if (!entrada) return null;
  const [card, segmento, setor] = entrada;
  return setor ? { ticker, card, segmento, setor } : { ticker, card, segmento };
}

/** Busca direta por ticker, sem heurística. */
export function buscarTicker(ticker: string): AtivoCatalogado | null {
  return montar(normalizar(ticker));
}

// Formatos de ticker aceitos na varredura por token:
//   · B3 e derivados: 4 letras + 1-2 dígitos, com "F" opcional de fracionário
//     (PETR4, HGLG11, AAPL34, PETR4F). Não colidem com palavras.
//   · Exterior: só letras. Aqui existe risco real de colisão — META, VOO, WELL
//     e COST são tickers e também palavras — então exigimos 3+ caracteres E
//     que o token venha em caixa alta no texto original, como aparece em
//     extrato. Tickers de 1-2 letras (V, O, XP, KO) ficam de fora da varredura
//     e só casam quando são o texto inteiro.
const B3 = /^[A-Z]{4}\d{1,2}F?$/;
const EXTERIOR = /^[A-Z]{3,5}$/;

function tentarToken(token: string): AtivoCatalogado | null {
  const chave = normalizar(token);
  if (B3.test(chave)) {
    // Fracionário: PETR4F é a mesma empresa de PETR4
    return montar(chave) ?? (chave.endsWith("F") ? montar(chave.slice(0, -1)) : null);
  }
  // Só letras: exige caixa alta no original para não confundir com palavra
  if (EXTERIOR.test(chave) && token === chave) return montar(chave);
  return null;
}

/**
 * Classifica um ativo a partir dos textos disponíveis (nome primeiro, descrição
 * depois). Testa o texto inteiro antes de quebrar em tokens — é o que permite
 * casar tickers curtos como "V" ou "XP" sem que eles apareçam no meio de uma
 * frase. Devolve null quando nada casa; nunca chuta.
 */
export function resolverAtivo(...textos: (string | undefined | null)[]): AtivoCatalogado | null {
  const limpos = textos.map((t) => (t ?? "").trim()).filter(Boolean);

  // 1ª passada: o texto inteiro é o ticker ("PETR4", "V", "XP")
  for (const texto of limpos) {
    const direto = montar(normalizar(texto));
    if (direto) return direto;
  }

  // 2ª passada: ticker embutido ("PETR4 - PETROBRAS PN", "FII HGLG11 CI")
  for (const texto of limpos) {
    for (const token of texto.split(/[^A-Za-z0-9]+/).filter(Boolean)) {
      const achou = tentarToken(token);
      if (achou) return achou;
    }
  }
  return null;
}

/**
 * Segmento do catálogo quando o ativo pertence ao card informado. Serve para
 * preencher sem reclassificar: se o ticker é de outro card, devolve null e quem
 * chamou decide o que fazer.
 */
export function segmentoNoCard(card: CardId, ...textos: (string | undefined | null)[]): string | null {
  const achado = resolverAtivo(...textos);
  return achado && achado.card === card ? achado.segmento : null;
}

const TICKERS = Object.keys(CATALOGO_ATIVOS);

/**
 * Sugestões para autocomplete: tickers que começam com o termo, os mais curtos
 * primeiro (PETR4 antes de PETR4F). `card` restringe ao card do campo.
 */
export function sugerirAtivos(termo: string, card?: CardId, limite = 8): AtivoCatalogado[] {
  const alvo = normalizar(termo);
  if (alvo.length < 2) return [];
  const achados: AtivoCatalogado[] = [];
  for (const ticker of TICKERS) {
    if (!ticker.startsWith(alvo)) continue;
    const item = montar(ticker);
    if (!item || (card && item.card !== card)) continue;
    achados.push(item);
  }
  return achados
    .sort((a, b) => a.ticker.length - b.ticker.length || a.ticker.localeCompare(b.ticker))
    .slice(0, limite);
}
