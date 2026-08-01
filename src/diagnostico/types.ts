export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  dataCriacao: string;
  dadosColeta: DadosColetaDiag;
  dadosLF: DadosLFDiag;
  resultado?: ResultadoDiag;
}

export interface DadosColetaDiag {
  dataNascimento?: string;
  estadoCivil?: string;
  nomeConjuge?: string;
  temFilhos?: boolean;
  filhos?: Array<{ nome: string }>;
  profissao?: string;
  vinculoProfissional?: string | string[];
  patrimonioFinanceiro?: number;
  rendaMensal?: number;
  custoVidaMensal?: number;
  aporteMensal?: number;
  rendaDesejadaAposentadoria?: number;
  idadeMeta?: number;
  ativosInvestimento?: Record<string, boolean | number>;
  possuiSeguro?: boolean;
  temPrevidencia?: boolean;
  saldoPrevidencia?: number;
}

export interface DadosLFDiag {
  patrimonioInicial?: number;
  aporteMensal?: number;
  idadeAlvo?: number;
  rendaDesejada?: number;
  objetivos?: unknown[];
  taxaTravada?: boolean;
  taxaTravadaValor?: number | null;
}

export interface ProximoPasso {
  id: string;
  texto: string;
  prioridade: "alta" | "media" | "baixa";
}

export interface ResultadoDiag {
  scoreLF?: number;
  scoreAA?: number;
  scoreProtecao?: number;
  scoreTributario?: number;
  dataResultado?: string;
  proximosPassos?: ProximoPasso[];
}
