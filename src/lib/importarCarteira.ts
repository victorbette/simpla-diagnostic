// ============================================================================
// Importação da carteira atual por print + IA
// ----------------------------------------------------------------------------
// O front prepara as imagens (redimensiona/comprime) e chama a Edge Function
// extract-portfolio, que fala com a OpenAI. A chave da IA nunca vem para cá.
// O resultado é sempre revisado pelo consultor antes de virar ativo na Etapa 1
// de Gestão de Carteira.
// ============================================================================

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER, SEGMENTOS_POR_CLASSE } from "@/lib/carteira/types";
import { genId } from "@/lib/carteira/calculos";

export type ClasseExtraida = CardId | "naoIdentificado";
export type Confianca = "alta" | "media" | "baixa";

export interface ItemExtraido {
  ativo: string;
  descricao: string;
  segmento: string;
  vencimento: string;
  valor: number;
  classe: ClasseExtraida;
  confianca: Confianca;
  imagem: number;
}

/** Item na tela de revisão: o consultor pode editar, excluir ou desmarcar. */
export interface ItemRevisao extends ItemExtraido {
  id: string;
  incluir: boolean;
}

export interface ResultadoExtracao {
  itens: ItemExtraido[];
  observacoes: string[];
  erros: { imagem: number; erro: string }[];
  moedas: string[];
  modelo: string;
}

export const MAX_IMAGENS = 6;
const LADO_MAXIMO = 2000; // acima disso a OpenAI reescala mesmo — só pesa o upload
const ALVO_BYTES = 1.2 * 1024 * 1024; // por imagem, já decodificada (o base64 infla ~33%)

export const CLASSE_NAO_IDENTIFICADA: ClasseExtraida = "naoIdentificado";

/** Ordem e rótulos espelham os cards da Etapa 1 (Carteira Atual). */
export const CLASSES_REVISAO: { key: ClasseExtraida; label: string }[] = [
  ...CARD_ORDER.map((card) => ({ key: card as ClasseExtraida, label: CARD_META[card].label })),
  { key: CLASSE_NAO_IDENTIFICADA, label: "Não identificado" },
];

export function rotuloClasse(classe: ClasseExtraida): string {
  return CLASSES_REVISAO.find((c) => c.key === classe)?.label ?? "Não identificado";
}

/** Segmentos aceitos pelo card — o dropdown da Etapa 1 usa exatamente esta lista. */
export function segmentosDoCard(card: CardId): readonly string[] {
  return SEGMENTOS_POR_CLASSE[card] ?? CARD_META[card].segmentos;
}

/**
 * Casa o segmento sugerido com a lista do card (comparação sem acento/caixa/
 * pontuação) e devolve null quando não pertence àquele card — é o que permite
 * descartar o segmento ao trocar a linha de classe. Cards de texto livre
 * (cripto) aceitam qualquer coisa.
 */
export function casarSegmento(card: CardId, sugerido: string): string | null {
  const texto = (sugerido ?? "").trim();
  if (!texto) return null;
  const opcoes = segmentosDoCard(card);
  if (opcoes.length === 0) return texto;

  // NFD + filtro a-z0-9 tira acento, caixa e pontuação ("Galpões Log." → "galpoeslog")
  const chave = (s: string) => s.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");
  const alvo = chave(texto);
  return opcoes.find((o) => chave(o) === alvo)
    ?? opcoes.find((o) => chave(o).startsWith(alvo) || alvo.startsWith(chave(o)))
    ?? null;
}

/**
 * Segmento definitivo do ativo: o casamento acima, ou o mesmo default que um
 * ativo criado na mão pelo "+ Adicionar" da Etapa 1 receberia.
 */
export function normalizarSegmento(card: CardId, sugerido: string): string {
  return casarSegmento(card, sugerido) ?? CARD_META[card].segmentos[0] ?? "";
}

// ─── Renda fixa: liquidez decide o card, indexador decide o segmento ──────────
// A IA já recebe essa régua no prompt, mas os títulos públicos são cravados pelo
// nome e não vale depender de leitura para eles — daí esta rede de segurança.

const CARDS_RF: ClasseExtraida[] = ["resgate_longo", "resgate_rapido"];

/** Minúsculas e sem acento, preservando os espaços (NFD + corte do não-ASCII). */
function textoNormalizado(s: string): string {
  return s.normalize("NFD").replace(/[^\x20-\x7e]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Produtos em que o nome já crava card e segmento. */
const REGRAS_RF: { teste: RegExp; card: CardId; segmento: string }[] = [
  // Tesouro Selic vence em 2029 e ainda assim resgata no mesmo dia
  { teste: /tesouro\s*selic|(^|\W)lft(\W|$)/, card: "resgate_rapido", segmento: "Pós-fixado" },
  { teste: /tesouro\s*(ipca|inflacao)|renda\s*\+|educa\s*\+|(^|\W)ntn\s*-?\s*b(\W|$)/, card: "resgate_longo", segmento: "Inflação" },
  { teste: /tesouro\s*pref?|(^|\W)(ltn|ntn\s*-?\s*f)(\W|$)/, card: "resgate_longo", segmento: "Prefixado" },
  // "caixa" e "disponível" só valem sozinhos ou como saldo: Caixa também é banco
  // emissor ("CDB Caixa 2028" é resgate longo, não dinheiro parado)
  { teste: /poupanca|conta\s*(corrente|remunerada)|^(caixa|disponivel|saldo)$|saldo\s*(em\s*)?(conta|caixa)|caixa\s*(livre|disponivel)/, card: "resgate_rapido", segmento: "Pós-fixado" },
  { teste: /liquidez\s*diaria|resgate\s*(imediato|diario)|(^|\W)d\s*\+\s*[01](\W|$)/, card: "resgate_rapido", segmento: "Pós-fixado" },
];

/** Só o indexador: ajusta o segmento sem mexer no card que a IA escolheu. */
const SEGMENTOS_RF: { teste: RegExp; segmento: string }[] = [
  { teste: /ipca|igp\s*-?\s*m|inflacao/, segmento: "Inflação" },
  { teste: /cdi|selic|pos\s*-?\s*fixado/, segmento: "Pós-fixado" },
  { teste: /pre\s*-?\s*fixado|prefixado/, segmento: "Prefixado" },
  { teste: /(^|\W)(fundo|fic|fi)(\W|$)/, segmento: "Fundos RF" },
];

/**
 * Corrige a linha de renda fixa antes de ela chegar à revisão. Só mexe em quem a
 * IA já colocou em renda fixa — "Não identificado" continua exigindo a decisão
 * do consultor, e as demais classes não são reclassificadas por heurística.
 */
export function refinarRendaFixa(item: ItemExtraido): ItemExtraido {
  if (!CARDS_RF.includes(item.classe)) return item;

  const texto = textoNormalizado(`${item.ativo} ${item.descricao}`);
  const regra = REGRAS_RF.find((r) => r.teste.test(texto));

  const card = regra ? regra.card : (item.classe as CardId);
  const segmento = regra
    ? regra.segmento
    : item.segmento || (SEGMENTOS_RF.find((r) => r.teste.test(texto))?.segmento ?? "");

  return {
    ...item,
    classe: card,
    // Sem casamento fica vazio: o default do card só entra ao virar ativo
    segmento: casarSegmento(card, segmento) ?? "",
  };
}

/**
 * Troca a classe de uma linha na revisão. O segmento só sobrevive se existir no
 * card de destino, e a régua de renda fixa roda de novo (mandar uma linha para
 * "Renda Fixa" já reposiciona Tesouro Selic em Resgate Rápido, por exemplo).
 */
export function reclassificar(item: ItemRevisao, classe: ClasseExtraida): ItemRevisao {
  if (classe === CLASSE_NAO_IDENTIFICADA) return { ...item, classe };
  const segmento = casarSegmento(classe as CardId, item.segmento) ?? "";
  const vencimento = CARD_META[classe as CardId].temVencimento ? item.vencimento : "";
  return { ...refinarRendaFixa({ ...item, classe, segmento, vencimento }), id: item.id, incluir: item.incluir };
}

// ─── Preparo das imagens ──────────────────────────────────────────────────────

function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
    img.src = url;
  });
}

/**
 * Redimensiona para no máximo 2000px no maior lado e devolve um data URL JPEG.
 * Reduz a qualidade em degraus se o base64 passar do alvo (limite do gateway).
 */
export async function prepararImagem(file: File): Promise<string> {
  const img = await carregarImagem(file);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Navegador não suporta canvas 2D.");
  // Fundo branco: prints com transparência (PNG) não viram fundo preto no JPEG
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const qualidade of [0.92, 0.8, 0.65, 0.5]) {
    const dataUrl = canvas.toDataURL("image/jpeg", qualidade);
    const bytes = (dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75;
    if (bytes <= ALVO_BYTES) return dataUrl;
  }
  throw new Error(`"${file.name}" é grande demais mesmo comprimido. Recorte o print e tente de novo.`);
}

// ─── Chamada da Edge Function ─────────────────────────────────────────────────

const CLASSES_VALIDAS: ClasseExtraida[] = [...CARD_ORDER, CLASSE_NAO_IDENTIFICADA];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarItem(bruto: any): ItemExtraido {
  const classe = CLASSES_VALIDAS.includes(bruto?.classe) ? (bruto.classe as ClasseExtraida) : CLASSE_NAO_IDENTIFICADA;
  return refinarRendaFixa({
    ativo: String(bruto?.ativo ?? ""),
    descricao: String(bruto?.descricao ?? ""),
    segmento: String(bruto?.segmento ?? ""),
    vencimento: String(bruto?.vencimento ?? ""),
    valor: Number(bruto?.valor) || 0,
    classe,
    confianca: ["alta", "media", "baixa"].includes(bruto?.confianca) ? bruto.confianca : "media",
    imagem: Number.isFinite(Number(bruto?.imagem)) ? Number(bruto.imagem) : -1,
  });
}

export async function extrairCarteira(imagens: string[]): Promise<ResultadoExtracao> {
  const { data, error } = await supabase.functions.invoke("extract-portfolio", {
    method: "POST",
    body: { imagens },
  });

  if (error) {
    // non-2xx chega como FunctionsHttpError; o corpo JSON traz a causa real
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);

  return {
    itens: (Array.isArray(data?.itens) ? data.itens : []).map(normalizarItem),
    observacoes: (data?.observacoes ?? []) as string[],
    erros: (data?.erros ?? []) as { imagem: number; erro: string }[],
    moedas: (data?.moedas ?? []) as string[],
    modelo: (data?.modelo ?? "") as string,
  };
}

// ─── Agregação para a Etapa 1 ─────────────────────────────────────────────────

export function totaisPorClasse(itens: ItemRevisao[]): Record<ClasseExtraida, number> {
  const base = Object.fromEntries(
    CLASSES_REVISAO.map((c) => [c.key, 0]),
  ) as Record<ClasseExtraida, number>;

  for (const it of itens) {
    if (!it.incluir) continue;
    base[it.classe] = (base[it.classe] ?? 0) + (it.valor || 0);
  }
  return base;
}

/** Linhas que de fato viram ativo: marcadas e já com classe definida. */
export function itensAplicaveis(itens: ItemRevisao[]): ItemRevisao[] {
  return itens.filter((it) => it.incluir && it.classe !== CLASSE_NAO_IDENTIFICADA);
}

function paraAtivo(item: ItemRevisao): Ativo {
  const card = item.classe as CardId;
  const nome = item.ativo.trim() || item.descricao.trim();
  const ativo: Ativo = {
    id: genId(),
    card,
    nome,
    segmento: normalizarSegmento(card, item.segmento),
    valorBRL: item.valor || 0,
  };
  if (CARD_META[card].temVencimento && item.vencimento.trim()) {
    ativo.vencimento = item.vencimento.trim();
  }
  return ativo;
}

/**
 * Converte os itens revisados em ativos da Etapa 1. `substituir` troca a
 * carteira inteira pelo que foi importado; por padrão os ativos importados são
 * acrescentados aos que já estavam lançados (caminho de quem importa uma
 * corretora por print). Itens em "Não identificado" ficam de fora: o consultor
 * decide a classe antes de eles entrarem em qualquer conta.
 */
export function aplicarNaCarteira(
  atuais: Ativo[],
  itens: ItemRevisao[],
  substituir: boolean,
): Ativo[] {
  const importados = itensAplicaveis(itens).map(paraAtivo);
  return substituir ? importados : [...atuais, ...importados];
}
