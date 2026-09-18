// ============================================================================
// Importação de dados fiscais por print, PDF ou texto + IA
// ----------------------------------------------------------------------------
// Reutiliza os helpers de preparo de arquivos de importarCarteira.ts e chama
// a Edge Function extract-tax-data, que fala com a OpenAI.
// O resultado é sempre revisado pelo consultor antes de ser aplicado.
// ============================================================================

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase";
import {
  prepararArquivo,
  prepararTexto,
  ehPdf,
  ehImagem,
  bytesDaFonte,
  MAX_BYTES_PDF,
  MAX_CHARS_TEXTO,
  MAX_BYTES_TOTAL,
  type FontePreparada,
} from "@/lib/importarCarteira";

export { ehPdf, ehImagem, prepararArquivo, prepararTexto };
export type { FontePreparada };

export const MAX_FONTES_FISCAL = 5;

export type Confianca = "alta" | "media" | "baixa";

export interface CampoExtraido {
  valor: number;
  confianca: Confianca;
  encontrado: boolean;
}

export interface DadosFiscaisExtraidos {
  rendaAnualBruta: CampoExtraido;
  inssPago: CampoExtraido;
  irRetidoFonte: CampoExtraido;
  dependentes: CampoExtraido;
  despesasMedicas: CampoExtraido;
  despesasInstrucao: CampoExtraido;
  pensaoAlimenticia: CampoExtraido;
  observacoes: string;
}

export interface ResultadoExtracaoFiscal {
  dados: DadosFiscaisExtraidos;
  modelo: string;
}

function campoSeguro(raw: unknown): CampoExtraido {
  const r = raw as Partial<CampoExtraido> | null | undefined;
  return {
    valor: typeof r?.valor === "number" && isFinite(r.valor) ? Math.max(0, r.valor) : 0,
    confianca: (["alta", "media", "baixa"] as Confianca[]).includes(r?.confianca as Confianca)
      ? (r!.confianca as Confianca)
      : "baixa",
    encontrado: typeof r?.encontrado === "boolean" ? r.encontrado : false,
  };
}

function normalizarDados(raw: unknown): DadosFiscaisExtraidos {
  const r = raw as Record<string, unknown> | null | undefined;
  return {
    rendaAnualBruta:  campoSeguro(r?.rendaAnualBruta),
    inssPago:         campoSeguro(r?.inssPago),
    irRetidoFonte:    campoSeguro(r?.irRetidoFonte),
    dependentes:      {
      ...campoSeguro(r?.dependentes),
      valor: Math.round(Math.max(0, (r?.dependentes as CampoExtraido)?.valor ?? 0)),
    },
    despesasMedicas:  campoSeguro(r?.despesasMedicas),
    despesasInstrucao: campoSeguro(r?.despesasInstrucao),
    pensaoAlimenticia: campoSeguro(r?.pensaoAlimenticia),
    observacoes: typeof (r?.observacoes) === "string" ? (r.observacoes as string).trim().slice(0, 500) : "",
  };
}

export async function extrairDadosFiscais(fontes: FontePreparada[]): Promise<ResultadoExtracaoFiscal> {
  if (fontes.length === 0) throw new Error("Envie ao menos um documento fiscal.");
  if (fontes.length > MAX_FONTES_FISCAL) {
    throw new Error(`Máximo de ${MAX_FONTES_FISCAL} arquivos por vez.`);
  }

  const total = fontes.reduce((acc, f) => acc + bytesDaFonte(f), 0);
  if (total > MAX_BYTES_TOTAL) {
    throw new Error(
      `Os arquivos somam ${(total / 1024 / 1024).toFixed(1)} MB e o limite é ${MAX_BYTES_TOTAL / 1024 / 1024} MB.`,
    );
  }

  const { data, error } = await supabase.functions.invoke("extract-tax-data", {
    method: "POST",
    body: { fontes },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);

  return {
    dados: normalizarDados(data?.dados),
    modelo: (data?.modelo ?? "") as string,
  };
}

export { MAX_BYTES_PDF, MAX_CHARS_TEXTO };
