// Perfil pessoal
export interface PerfilPessoal {
  // Dados básicos
  nomeCompleto: string;
  dataNascimento: string;
  idade: number;
  estadoCivil: "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel";
  // Cônjuge
  conjuge: {
    nome: string;
    idade: number;
    trabalha: boolean;
    rendaMensal: number;
  };
  // Dependentes
  dependentes: Array<{
    id: string;
    nome: string;
    idade: number;
    relacao: "filho" | "pai" | "mae" | "outro";
  }>;
  // Renda
  rendaMensalBruta: number;
  rendaMensalLiquida: number;
  outrasRendas: number;
  // Despesas
  despesasMensais: {
    moradia: number;
    alimentacao: number;
    transporte: number;
    saude: number;
    educacao: number;
    lazer: number;
    outros: number;
  };
  // Padrão de vida
  padraoDePoupanca: number;
  temEmergenciaFinanceira: boolean;
  profissao: string;
  setor: string;
}

// Patrimônio e carteira
export interface Patrimonio {
  ativos: {
    rendaFixa: number;
    rendaVariavel: number;
    fundos: number;
    previdencia: number;
    criptoativos: number;
    internacional: number;
    outros: number;
  };
  imoveis: Array<{
    id: string;
    tipo: "residencial" | "comercial" | "rural" | "terreno";
    valor: number;
    financiado: boolean;
    saldoDevedor: number;
    gera_renda: boolean;
    rendaMensal: number;
  }>;
  passivos: {
    financiamentos: number;
    cartoesCredito: number;
    emprestimos: number;
    outros: number;
  };
  alocacaoAlvo: {
    rendaFixa: number;
    rendaVariavel: number;
    fundos: number;
    previdencia: number;
    internacional: number;
    alternativos: number;
  };
}

// Objetivos de vida
export interface ObjetivoVida {
  id: string;
  nome: string;
  categoria: "aposentadoria" | "imovel" | "educacao" | "viagem" | "negocio" | "outro";
  valorNecessario: number;
  valorAtual: number;
  prazoAnos: number;
  temInvestimentoSeparado: boolean;
  valorInvestidoSeparado: number;
  prioridade: "alta" | "media" | "baixa";
}

// Proteção (seguros)
export interface Protecao {
  seguroVida: {
    possui: boolean;
    capitalSegurado: number;
    premioMensal: number;
    seguradora: string;
    tipo: "temporario" | "vida_inteira" | "vgbl" | "outro";
  };
  seguroInvalidez: {
    possui: boolean;
    capitalSegurado: number;
    coberturaTotal: boolean;
  };
  planoSaude: {
    possui: boolean;
    tipo: "individual" | "familiar" | "empresarial";
    cobertura: "basica" | "media" | "premium";
  };
  seguroProfissional: boolean;
  seguroPatrimonial: boolean;
  seguroAutomovel: boolean;
}

// Sucessão
export interface Sucessao {
  possuiTestamento: boolean;
  possuiHolding: boolean;
  possuiDoacao: boolean;
  herdeiros: Array<{
    id: string;
    nome: string;
    relacao: string;
    percentual: number;
  }>;
  valorInventarioEstimado: number;
  preocupacaoPrincipal: "impostos" | "conflitos" | "agilidade" | "privacidade";
}

// Câmbio
export interface Cambio {
  exposicaoCambial: "nenhuma" | "baixa" | "media" | "alta";
  motivoExposicao: string[];
  possuiProtecao: boolean;
  tipoProtecao: string[];
  valorExpostoUSD: number;
}

// Liberdade financeira
export interface LiberdadeFinanceira {
  idadeAtual: number;
  idadeMeta: number;
  rendaMensalDesejada: number;
  rendaPassivaAtual: number;
  patrimonioAtual: number;
  taxaRetornoEstimada: number;
  inflacaoEstimada: number;
  metodologia: "regra4porcento" | "renda_perpetua" | "renda_temporaria";
}

// Financial Plan completo
export interface FinancialPlan {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  perfil: PerfilPessoal;
  patrimonio: Patrimonio;
  objetivos: ObjetivoVida[];
  protecao: Protecao;
  sucessao: Sucessao;
  cambio: Cambio;
  liberdadeFinanceira: LiberdadeFinanceira;
  notas: string;
  status: "rascunho" | "completo";
}

// ─── Valores iniciais ─────────────────────────────────────────────────────────

export const initialPerfilPessoal: PerfilPessoal = {
  nomeCompleto: "",
  dataNascimento: "",
  idade: 35,
  estadoCivil: "solteiro",
  conjuge: { nome: "", idade: 0, trabalha: false, rendaMensal: 0 },
  dependentes: [],
  rendaMensalBruta: 0,
  rendaMensalLiquida: 0,
  outrasRendas: 0,
  despesasMensais: {
    moradia: 0,
    alimentacao: 0,
    transporte: 0,
    saude: 0,
    educacao: 0,
    lazer: 0,
    outros: 0,
  },
  padraoDePoupanca: 0,
  temEmergenciaFinanceira: false,
  profissao: "",
  setor: "",
};

export const initialPatrimonio: Patrimonio = {
  ativos: {
    rendaFixa: 0,
    rendaVariavel: 0,
    fundos: 0,
    previdencia: 0,
    criptoativos: 0,
    internacional: 0,
    outros: 0,
  },
  imoveis: [],
  passivos: { financiamentos: 0, cartoesCredito: 0, emprestimos: 0, outros: 0 },
  alocacaoAlvo: {
    rendaFixa: 0,
    rendaVariavel: 0,
    fundos: 0,
    previdencia: 0,
    internacional: 0,
    alternativos: 0,
  },
};

export const initialLiberdadeFinanceira: LiberdadeFinanceira = {
  idadeAtual: 35,
  idadeMeta: 60,
  rendaMensalDesejada: 0,
  rendaPassivaAtual: 0,
  patrimonioAtual: 0,
  taxaRetornoEstimada: 6,
  inflacaoEstimada: 4,
  metodologia: "regra4porcento",
};
