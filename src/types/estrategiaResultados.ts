export interface MacroAlocacao {
  rendaFixa: number;
  acoes: number;
  fiis: number;
  rvGlobal: number;
  rfGlobal: number;
  cripto: number;
}

export interface PlanoAcaoItem {
  id: string;
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
  totalAportar: number;
  totalResgatar: number;
  macroAtual: MacroAlocacao;
  macroMeta: MacroAlocacao;
  planoAcao: PlanoAcaoItem[];
  dataCalculo: string;
  savedAt: string;
}

export interface ProjecaoPoint {
  idade: number;
  patrimonio: number;
  fase?: string;
}

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
  projecao: ProjecaoPoint[];
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
