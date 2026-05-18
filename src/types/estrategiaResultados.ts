export interface ResultadoCarteira {
  patrimonio: number;
  planoAcaoCount: number;
  totalAportar: number;
  totalResgatar: number;
  savedAt: string;
}

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
  carteira: ResultadoCarteira | null;
  if: ResultadoIF | null;
  seguro: ResultadoSeguro | null;
  fiscal: ResultadoFiscal | null;
}

export const defaultResultados: ResultadosEstrategia = {
  carteira: null,
  if: null,
  seguro: null,
  fiscal: null,
};
