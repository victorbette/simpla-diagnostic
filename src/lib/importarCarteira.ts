// ============================================================================
// Importação da carteira atual por print + IA
// ----------------------------------------------------------------------------
// O front prepara as imagens (redimensiona/comprime) e chama a Edge Function
// extract-portfolio, que fala com a OpenAI. A chave da IA nunca vem para cá.
// O resultado é sempre revisado pelo consultor antes de virar valor no forms.
// ============================================================================

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase";
import type { AtivoAtual } from "@/types/financialPlanning";

export type ClasseAtivo = keyof Omit<AtivoAtual, "total">;
export type ClasseExtraida = ClasseAtivo | "naoIdentificado";
export type Confianca = "alta" | "media" | "baixa";

export interface ItemExtraido {
  ativo: string;
  descricao: string;
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

/** Ordem e rótulos espelham a tabela do AtivoForm. */
export const CLASSES_REVISAO: { key: ClasseExtraida; label: string }[] = [
  { key: "rendaFixa", label: "Renda Fixa" },
  { key: "acoes", label: "Ações brasileiras" },
  { key: "fiis", label: "FIIs" },
  { key: "rvGlobal", label: "RV Global" },
  { key: "rfGlobal", label: "RF Global" },
  { key: "cripto", label: "Criptoativos" },
  { key: "alternativos", label: "Alternativos" },
  { key: "previdencia", label: "Previdência Privada" },
  { key: CLASSE_NAO_IDENTIFICADA, label: "Não identificado" },
];

export function rotuloClasse(classe: ClasseExtraida): string {
  return CLASSES_REVISAO.find((c) => c.key === classe)?.label ?? "Não identificado";
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
    itens: (data?.itens ?? []) as ItemExtraido[],
    observacoes: (data?.observacoes ?? []) as string[],
    erros: (data?.erros ?? []) as { imagem: number; erro: string }[],
    moedas: (data?.moedas ?? []) as string[],
    modelo: (data?.modelo ?? "") as string,
  };
}

// ─── Agregação para o AtivoForm ───────────────────────────────────────────────

const CLASSES_ATIVO: ClasseAtivo[] = [
  "rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto", "alternativos", "previdencia",
];

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

/**
 * Aplica os itens revisados sobre a carteira do forms. `somar` acumula em cima
 * dos valores já preenchidos (útil ao importar corretoras em prints separados);
 * caso contrário a carteira passa a ser exatamente o que foi importado — as
 * classes ausentes no print zeram. Itens em "Não identificado" ficam de fora:
 * o consultor decide a classe antes de eles entrarem em qualquer conta.
 */
export function aplicarNaCarteira(
  atual: AtivoAtual,
  itens: ItemRevisao[],
  somar: boolean,
): AtivoAtual {
  const totais = totaisPorClasse(itens);
  const resultado: AtivoAtual = { ...atual };

  for (const classe of CLASSES_ATIVO) {
    const importado = totais[classe] ?? 0;
    resultado[classe] = somar ? (atual[classe] ?? 0) + importado : importado;
  }
  resultado.total = CLASSES_ATIVO.reduce((acc, c) => acc + (resultado[c] ?? 0), 0);
  return resultado;
}
