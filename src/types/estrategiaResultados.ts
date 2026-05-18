export interface ResultadoIF {
  patrimonioAposentadoria: number;
  rendaSustentavel: number;
  gapRenda: number;
  liberdadeAlcancada: boolean;
  aporteAjustado: number;
  savedAt: string;
}

export interface ResultadoSeguro {
  totalNeed: number;
  totalCoverage: number;
  gap: number;
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
  savedAt: string;
}

export interface ResultadosEstrategia {
  if: ResultadoIF | null;
  seguro: ResultadoSeguro | null;
  fiscal: ResultadoFiscal | null;
}

export const defaultResultados: ResultadosEstrategia = {
  if: null,
  seguro: null,
  fiscal: null,
};
