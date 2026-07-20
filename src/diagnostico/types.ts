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
  dataNascimentoConjuge?: string;
  filhos?: Array<{ nome: string; idade: number }>;
  profissao?: string;
  vinculoProfissional?: string;
  patrimonioFinanceiro?: number;
  rendaMensal?: number;
  custoVidaMensal?: number;
  aporteMensal?: number;
  gastoCartaoMensal?: number;
  rendaDesejadaAposentadoria?: number;
  idadeMeta?: number;
  suitabilityPerfil?: string;
  temRendaFixa?: boolean;
  temAcoes?: boolean;
  temFIIs?: boolean;
  temExterior?: boolean;
  temCripto?: boolean;
  contribuiINSS?: boolean;
  valorINSS?: number;
  possuiSeguro?: boolean;
  valorApolice?: number;
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
