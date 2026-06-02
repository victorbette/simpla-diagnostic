// macroAtual / macroMeta are keyed by CardId (resgate_rapido, resgate_longo, acoes, fiis, exterior, cripto)
// and store percentages (0–100).
import type { ObjetivoVida } from "@/types/objetivos";
import type { PontoProjecao } from "@/lib/financialFreedomCalc";

export interface PlanoAcaoItem {
  id: string;
  card?: string;
  nomeAtivo: string;
  segmento: string;
  tipo: string;
  valorAtualBRL: number;
  valorMetaBRL: number;
  movimentacaoBRL: number;
  prioridade: string;
}

export interface ResultadoCarteira {
  patrimonio: number;
  planoAcaoCount: number;
  totalAportes: number;
  totalResgates: number;
  macroAtual: Record<string, number>;   // CardId → % atual
  macroMeta: Record<string, number>;    // CardId → % meta (do slider)
  planoAcao: PlanoAcaoItem[];
  dataCalculo: string;
  savedAt: string;
}

export type { PontoProjecao };

export interface ResultadoIF {
  patrimonioAposentadoria: number;
  rendaSustentavel: number;
  gapRenda: number;
  liberdadeAlcancada: boolean;
  aporteAjustado: number;
  patrimonioNecessario: number;
  patrimonioAtual: number;
  idadeAtual: number;
  idadeMeta: number;
  anosRestantes: number;
  rendaMensalDesejada: number;
  aporteAtual: number;
  taxaRetorno: number;
  projecao: PontoProjecao[];
  curvaIdeal?: (number | null)[];
  objetivos?: ObjetivoVida[];
  anoNascimento?: number;
  mesNascimento?: number;
  mesInicioRetirada?: number;
  dataCalculo: string;
  savedAt: string;
}

export interface ResultadoSeguro {
  totalNeed: number;
  totalCoverage: number;
  gap: number;
  scoreProtecao: number;
  temSeguroVida: boolean;
  temSeguroInvalidez: boolean;
  immediateTotal: number;
  ongoingTotal: number;
  educationTotal: number;
  lifestyleTotal: number;
  inventoryCost: number;
  disabilityTotal: number;
  disabilityGap: number;
  disabilityCoverage: number;
  criticalIllnessTotal: number;
  criticalIllnessGap: number;
  criticalIllnessCoverage: number;
  dataCalculo: string;
  savedAt: string;
}

export interface ResultadoFiscal {
  rendaAnual: number;
  tetoPGBLAnual: number;
  aporteAnual: number;
  irComPGBL: number;
  irSemPGBL: number;
  economiaAnual: number;
  espacoDisponivelMensal: number;
  aproveitandoTeto: boolean;
  dataCalculo: string;
  savedAt: string;
}

export interface EstrategiaFinalComentarios {
  aa: string;
  lf: string;
  ps: string;
  fiscal: string;
  comentariosFinais: string;
  dataGeracao: string;
}

export interface ProximoPasso {
  id: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  dataPrevisao: string;
  area: string;
}

export interface ResultadosEstrategia {
  carteira: ResultadoCarteira | null;
  if: ResultadoIF | null;
  seguro: ResultadoSeguro | null;
  fiscal: ResultadoFiscal | null;
  holding?: { observacoes: string };
  acoesConcluidas?: Record<string, boolean>;
  proximosPassos?: ProximoPasso[];
  estrategiaFinal?: EstrategiaFinalComentarios;
}

export const defaultResultados: ResultadosEstrategia = {
  carteira: null,
  if: null,
  seguro: null,
  fiscal: null,
};
