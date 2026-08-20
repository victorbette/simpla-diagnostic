// ============================================================================
// Importação da carteira atual por print, PDF ou texto + IA
// ----------------------------------------------------------------------------
// O front prepara as fontes (redimensiona/comprime imagens, converte PDF para
// base64, limpa texto colado) e chama a Edge Function extract-portfolio, que
// fala com a OpenAI. A chave da IA nunca vem para cá. O resultado é sempre
// revisado pelo consultor antes de virar ativo na Etapa 1 de Gestão de Carteira.
// ============================================================================

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER, SEGMENTOS_POR_CLASSE } from "@/lib/carteira/types";
import { genId } from "@/lib/carteira/calculos";
import { resolverAtivo, segmentoNoCard } from "@/lib/carteira/catalogo";

export type ClasseExtraida = CardId | "naoIdentificado";
export type Confianca = "alta" | "media" | "baixa";
export type TipoFonte = "imagem" | "pdf" | "texto";

/** O que vai no corpo da requisição: uma entrada por print, PDF ou texto. */
export interface FontePreparada {
  tipo: TipoFonte;
  /** Data URL (imagem/PDF) ou o texto puro. */
  conteudo: string;
  nome: string;
}

export interface ItemExtraido {
  ativo: string;
  descricao: string;
  segmento: string;
  vencimento: string;
  valor: number;
  classe: ClasseExtraida;
  confianca: Confianca;
  /** Índice da fonte que originou a linha; -1 quando adicionada na mão. */
  fonte: number;
}

/** Item na tela de revisão: o consultor pode editar, excluir ou desmarcar. */
export interface ItemRevisao extends ItemExtraido {
  id: string;
  incluir: boolean;
}

export interface ResultadoExtracao {
  itens: ItemExtraido[];
  observacoes: string[];
  erros: { fonte: number; erro: string }[];
  moedas: string[];
  modelo: string;
}

/** Limites espelhados na Edge Function — barrar aqui evita round-trip inútil. */
export const MAX_FONTES = 10;
export const MAX_BYTES_PDF = 8 * 1024 * 1024;
export const MAX_CHARS_TEXTO = 100_000;
export const MAX_BYTES_TOTAL = 15 * 1024 * 1024;

const LADO_MAXIMO = 2000; // acima disso a OpenAI reescala mesmo — só pesa o upload
// Por imagem, já decodificada (o base64 infla ~33%). Com até 10 fontes no lote,
// 800KB mantém o pior caso dentro do teto de memória do worker.
const ALVO_BYTES = 800 * 1024;

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

// ─── Catálogo: ticker crava classe e segmento ────────────────────────────────

/**
 * Corrige a linha pelo catálogo de ativos (src/data/ativos.csv). Ler "PETR4"
 * num print é evidência determinística de classe e setor — mais forte que o
 * palpite do modelo de visão, que precisa deduzir o setor de uma tabela sem
 * contexto. Por isso o catálogo sobrescreve `classe` e `segmento` quando o
 * ticker casa; quando não casa, a linha segue exatamente como estava.
 *
 * Só o valor financeiro continua sendo leitura pura da IA — o catálogo não sabe
 * nada sobre quanto o cliente tem.
 */
export function aplicarCatalogo(item: ItemExtraido): ItemExtraido {
  const achado = resolverAtivo(item.ativo, item.descricao);
  if (!achado) return item;
  return {
    ...item,
    classe: achado.card,
    segmento: achado.segmento,
    // Ações, FIIs, exterior e cripto não têm vencimento: se a IA leu uma data
    // de outra coluna, ela morre aqui em vez de virar campo do ativo.
    vencimento: CARD_META[achado.card].temVencimento ? item.vencimento : "",
  };
}

/**
 * Troca a classe de uma linha na revisão. O segmento só sobrevive se existir no
 * card de destino — se não sobreviver, o catálogo tenta preencher pelo ticker
 * antes de deixar vazio. A régua de renda fixa roda de novo (mandar uma linha
 * para "Renda Fixa" já reposiciona Tesouro Selic em Resgate Rápido).
 *
 * Aqui o catálogo NÃO reclassifica: a troca de classe é decisão explícita do
 * consultor e ganha do palpite automático.
 */
export function reclassificar(item: ItemRevisao, classe: ClasseExtraida): ItemRevisao {
  if (classe === CLASSE_NAO_IDENTIFICADA) return { ...item, classe };
  const card = classe as CardId;
  const segmento = casarSegmento(card, item.segmento)
    ?? segmentoNoCard(card, item.ativo, item.descricao)
    ?? "";
  const vencimento = CARD_META[card].temVencimento ? item.vencimento : "";
  return { ...refinarRendaFixa({ ...item, classe, segmento, vencimento }), id: item.id, incluir: item.incluir };
}

// ─── Preparo das fontes ───────────────────────────────────────────────────────

export function ehPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function ehImagem(file: File): boolean {
  return file.type.startsWith("image/");
}

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

/**
 * PDF vai inteiro para a OpenAI — não dá para reduzir no browser sem uma lib de
 * renderização, e o modelo lê tanto a camada de texto quanto as páginas
 * rasterizadas (extrato escaneado também funciona, com menos precisão).
 */
export function prepararPdf(file: File): Promise<string> {
  if (file.size > MAX_BYTES_PDF) {
    throw new Error(
      `"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB e o limite é ${MAX_BYTES_PDF / 1024 / 1024} MB. Envie só as páginas de posição.`,
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Não foi possível ler "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function prepararTexto(texto: string, nome: string): FontePreparada {
  const limpo = texto.trim();
  if (!limpo) throw new Error("O texto colado está vazio.");
  if (limpo.length > MAX_CHARS_TEXTO) {
    throw new Error(
      `O texto tem ${limpo.length.toLocaleString("pt-BR")} caracteres e o limite é ${MAX_CHARS_TEXTO.toLocaleString("pt-BR")}. Cole em partes.`,
    );
  }
  return { tipo: "texto", conteudo: limpo, nome };
}

export async function prepararArquivo(file: File): Promise<FontePreparada> {
  if (ehPdf(file)) return { tipo: "pdf", conteudo: await prepararPdf(file), nome: file.name };
  return { tipo: "imagem", conteudo: await prepararImagem(file), nome: file.name };
}

/** Bytes que a fonte vai ocupar no corpo — mesma conta que a função faz. */
export function bytesDaFonte(fonte: FontePreparada): number {
  if (fonte.tipo === "texto") return fonte.conteudo.length;
  const b64 = fonte.conteudo.slice(fonte.conteudo.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4);
}

// ─── Chamada da Edge Function ─────────────────────────────────────────────────

const CLASSES_VALIDAS: ClasseExtraida[] = [...CARD_ORDER, CLASSE_NAO_IDENTIFICADA];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarItem(bruto: any): ItemExtraido {
  const classe = CLASSES_VALIDAS.includes(bruto?.classe) ? (bruto.classe as ClasseExtraida) : CLASSE_NAO_IDENTIFICADA;
  // Ordem: régua de renda fixa primeiro (posiciona Tesouro Selic e afins), e o
  // catálogo por último, porque o casamento por ticker é o sinal mais forte —
  // inclusive para tirar de "Não identificado" uma linha que a IA não soube ler.
  return aplicarCatalogo(refinarRendaFixa({
    ativo: String(bruto?.ativo ?? ""),
    descricao: String(bruto?.descricao ?? ""),
    segmento: String(bruto?.segmento ?? ""),
    vencimento: String(bruto?.vencimento ?? ""),
    valor: Number(bruto?.valor) || 0,
    classe,
    confianca: ["alta", "media", "baixa"].includes(bruto?.confianca) ? bruto.confianca : "media",
    fonte: Number.isFinite(Number(bruto?.fonte)) ? Number(bruto.fonte) : -1,
  }));
}

export async function extrairCarteira(fontes: FontePreparada[]): Promise<ResultadoExtracao> {
  const total = fontes.reduce((acc, f) => acc + bytesDaFonte(f), 0);
  if (total > MAX_BYTES_TOTAL) {
    throw new Error(
      `Os arquivos somam ${(total / 1024 / 1024).toFixed(1)} MB e o limite por importação é ${MAX_BYTES_TOTAL / 1024 / 1024} MB. Envie em duas levas.`,
    );
  }

  const { data, error } = await supabase.functions.invoke("extract-portfolio", {
    method: "POST",
    body: { fontes },
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
    erros: (data?.erros ?? []) as { fonte: number; erro: string }[],
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
