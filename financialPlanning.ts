// ─── Suitability / Perfil de Risco ───────────────────────────────────────────

export type PerfilRisco =
  | "conservador"
  | "conservador_moderado"
  | "moderado"
  | "arrojado";

export const PERFIL_LABELS: Record<PerfilRisco, string> = {
  conservador: "Conservador",
  conservador_moderado: "Conservador-Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

export interface SuitabilityResposta {
  perguntaId: string;
  valor: number;
}

export interface SuitabilityResult {
  respostas: SuitabilityResposta[];
  totalPontos: number;
  percentual: number;
  perfil: PerfilRisco;
  dataResposta: string;
}

// ─── Macroalocação ────────────────────────────────────────────────────────────

export interface MacroalocacaoAlvo {
  rendaFixa: number;
  acoes: number;
  fiis: number;
  rvGlobal: number;
  rfGlobal: number;
  cripto: number;
}

export const ALOCACAO_ALVO: Record<PerfilRisco, MacroalocacaoAlvo> = {
  conservador: {
    rendaFixa: 92,
    acoes: 2,
    fiis: 2,
    rvGlobal: 4,
    rfGlobal: 0,
    cripto: 0,
  },
  conservador_moderado: {
    rendaFixa: 78,
    acoes: 7,
    fiis: 6,
    rvGlobal: 9,
    rfGlobal: 0,
    cripto: 0,
  },
  moderado: {
    rendaFixa: 66,
    acoes: 13,
    fiis: 7,
    rvGlobal: 13,
    rfGlobal: 0,
    cripto: 1,
  },
  arrojado: {
    rendaFixa: 52,
    acoes: 20,
    fiis: 9,
    rvGlobal: 17.5,
    rfGlobal: 0,
    cripto: 1.5,
  },
};

// ─── Suitability Questionnaire ────────────────────────────────────────────────

export interface SuitabilityOpcao {
  valor: number;
  texto: string;
}

export interface SuitabilityPergunta {
  id: string;
  pergunta: string;
  opcoes: SuitabilityOpcao[];
}

export const SUITABILITY_PERGUNTAS: SuitabilityPergunta[] = [
  {
    id: "horizonte",
    pergunta: "Qual é o seu horizonte de investimento?",
    opcoes: [
      { valor: 1, texto: "Menos de 1 ano" },
      { valor: 2, texto: "De 1 a 3 anos" },
      { valor: 3, texto: "De 3 a 5 anos" },
      { valor: 4, texto: "De 5 a 10 anos" },
      { valor: 5, texto: "Mais de 10 anos" },
    ],
  },
  {
    id: "objetivo",
    pergunta: "Qual é o seu principal objetivo financeiro?",
    opcoes: [
      { valor: 1, texto: "Preservar o capital com segurança máxima" },
      { valor: 2, texto: "Obter renda estável com baixo risco" },
      { valor: 3, texto: "Crescer o patrimônio equilibrando risco e retorno" },
      { valor: 4, texto: "Maximizar retorno aceitando oscilações elevadas" },
      { valor: 5, texto: "Construir riqueza de longo prazo com alta concentração em ativos de risco" },
    ],
  },
  {
    id: "reacao_queda",
    pergunta: "Se sua carteira cair 20% em um mês, o que você faria?",
    opcoes: [
      { valor: 1, texto: "Venderia tudo para evitar perdas maiores" },
      { valor: 2, texto: "Ficaria preocupado e reduziria a exposição" },
      { valor: 3, texto: "Manteria a posição e aguardaria a recuperação" },
      { valor: 4, texto: "Aproveitaria para comprar mais ativos de risco" },
      { valor: 5, texto: "Aumentaria significativamente a posição, aproveitando o desconto" },
    ],
  },
  {
    id: "experiencia",
    pergunta: "Como você classifica sua experiência com investimentos?",
    opcoes: [
      { valor: 1, texto: "Nenhuma — só poupança ou CDB" },
      { valor: 2, texto: "Básica — tenho Tesouro Direto e fundos DI" },
      { valor: 3, texto: "Intermediária — invisto em ações e multimercados" },
      { valor: 4, texto: "Avançada — opero derivativos, BDRs ou ativos no exterior" },
      { valor: 5, texto: "Especialista — gestão ativa de carteira com análise fundamentalista ou técnica" },
    ],
  },
  {
    id: "renda_estabilidade",
    pergunta: "Como você avalia a estabilidade da sua renda?",
    opcoes: [
      { valor: 1, texto: "Muito instável — renda variável ou informal" },
      { valor: 2, texto: "Razoável — pode haver interrupções ocasionais" },
      { valor: 3, texto: "Estável — emprego fixo ou renda previsível" },
      { valor: 4, texto: "Muito estável — múltiplas fontes de renda" },
      { valor: 5, texto: "Excepcional — renda passiva que cobre todas as despesas" },
    ],
  },
  {
    id: "perda_maxima",
    pergunta: "Qual a perda máxima que você toleraria em 12 meses?",
    opcoes: [
      { valor: 1, texto: "Nenhuma — não aceito perdas" },
      { valor: 2, texto: "Até 5%" },
      { valor: 3, texto: "Entre 5% e 20%" },
      { valor: 4, texto: "Entre 20% e 40%" },
      { valor: 5, texto: "Mais de 40%" },
    ],
  },
  {
    id: "percentual_investido",
    pergunta: "Qual percentual da sua renda mensal você consegue investir?",
    opcoes: [
      { valor: 1, texto: "Menos de 5%" },
      { valor: 2, texto: "Entre 5% e 15%" },
      { valor: 3, texto: "Entre 15% e 30%" },
      { valor: 4, texto: "Entre 30% e 50%" },
      { valor: 5, texto: "Mais de 50%" },
    ],
  },
];

// ─── Calcular Perfil ──────────────────────────────────────────────────────────

export function calcularPerfil(respostas: SuitabilityResposta[]): SuitabilityResult {
  const maxPontos = SUITABILITY_PERGUNTAS.length * 5; // 7 × 5 = 35
  const totalPontos = respostas.reduce((sum, r) => sum + r.valor, 0);
  const percentual = maxPontos > 0 ? (totalPontos / maxPontos) * 100 : 0;

  let perfil: PerfilRisco;
  if (percentual <= 35) perfil = "conservador";
  else if (percentual <= 55) perfil = "conservador_moderado";
  else if (percentual <= 75) perfil = "moderado";
  else perfil = "arrojado";

  return {
    respostas,
    totalPontos,
    percentual,
    perfil,
    dataResposta: new Date().toISOString(),
  };
}

// ─── Ativos Atuais ────────────────────────────────────────────────────────────

export interface AtivoAtual {
  rendaFixa: number;
  acoes: number;
  fiis: number;
  rvGlobal: number;
  rfGlobal: number;
  cripto: number;
  total: number;
}

export const initialAtivoAtual: AtivoAtual = {
  rendaFixa: 0,
  acoes: 0,
  fiis: 0,
  rvGlobal: 0,
  rfGlobal: 0,
  cripto: 0,
  total: 0,
};

export function calcularAlocacaoAtual(ativos: AtivoAtual): MacroalocacaoAlvo {
  const total = ativos.total || 1;
  return {
    rendaFixa: (ativos.rendaFixa / total) * 100,
    acoes: (ativos.acoes / total) * 100,
    fiis: (ativos.fiis / total) * 100,
    rvGlobal: (ativos.rvGlobal / total) * 100,
    rfGlobal: (ativos.rfGlobal / total) * 100,
    cripto: (ativos.cripto / total) * 100,
  };
}

export function calcularGapAlocacao(
  atual: MacroalocacaoAlvo,
  alvo: MacroalocacaoAlvo
): MacroalocacaoAlvo {
  return {
    rendaFixa: alvo.rendaFixa - atual.rendaFixa,
    acoes: alvo.acoes - atual.acoes,
    fiis: alvo.fiis - atual.fiis,
    rvGlobal: alvo.rvGlobal - atual.rvGlobal,
    rfGlobal: alvo.rfGlobal - atual.rfGlobal,
    cripto: alvo.cripto - atual.cripto,
  };
}

// ─── Planejamento IF (Independência Financeira) ───────────────────────────────

export interface PlanejamentoIF {
  idadeAtual: number;
  idadeMeta: number;
  rendaMensalDesejada: number;
  rendaPassivaAtual: number;
  patrimonioAtual: number;
  aporteMensal: number;
  taxaRetornoAnual: number;
  inflacaoAnual: number;
  metodologia: "regra4porcento" | "renda_perpetua" | "renda_temporaria";
}

export const initialPlanejamentoIF: PlanejamentoIF = {
  idadeAtual: 35,
  idadeMeta: 60,
  rendaMensalDesejada: 0,
  rendaPassivaAtual: 0,
  patrimonioAtual: 0,
  aporteMensal: 0,
  taxaRetornoAnual: 6,
  inflacaoAnual: 4,
  metodologia: "regra4porcento",
};

export interface ResultadoIF {
  patrimonioNecessario: number;
  patrimonioProjetado: number;
  gap: number;
  anosParaMeta: number;
  rendaMensalAtingivel: number;
  percentualIF: number;
}

export function calcularIF(p: PlanejamentoIF): ResultadoIF {
  const anosParaMeta = Math.max(0, p.idadeMeta - p.idadeAtual);
  const taxaMensal = p.taxaRetornoAnual / 100 / 12;
  const meses = anosParaMeta * 12;

  const patrimonioNecessario =
    p.metodologia === "regra4porcento"
      ? (p.rendaMensalDesejada * 12) / 0.04
      : (p.rendaMensalDesejada * 12) / (p.taxaRetornoAnual / 100);

  let patrimonioProjetado: number;
  if (taxaMensal === 0) {
    patrimonioProjetado = p.patrimonioAtual + p.aporteMensal * meses;
  } else {
    const patrimonioAtualFV = p.patrimonioAtual * Math.pow(1 + taxaMensal, meses);
    const aportesFV =
      p.aporteMensal * ((Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal);
    patrimonioProjetado = patrimonioAtualFV + aportesFV;
  }

  const gap = patrimonioNecessario - patrimonioProjetado;
  const rendaMensalAtingivel = (patrimonioProjetado * 0.04) / 12;
  const percentualIF =
    patrimonioNecessario > 0
      ? Math.min(100, (patrimonioProjetado / patrimonioNecessario) * 100)
      : 0;

  return {
    patrimonioNecessario,
    patrimonioProjetado,
    gap,
    anosParaMeta,
    rendaMensalAtingivel,
    percentualIF,
  };
}

// ─── Proteção ─────────────────────────────────────────────────────────────────

export interface ProtecaoSimplificada {
  rendaMensal: number;
  possuiSeguroVida: boolean;
  capitalSeguradoVida: number;
  possuiSeguroInvalidez: boolean;
  possuiPlanoSaude: boolean;
  dependentes: number;
}

export const initialProtecaoSimplificada: ProtecaoSimplificada = {
  rendaMensal: 0,
  possuiSeguroVida: false,
  capitalSeguradoVida: 0,
  possuiSeguroInvalidez: false,
  possuiPlanoSaude: false,
  dependentes: 0,
};

export interface ResultadoProtecao {
  capitalNecessario: number;
  capitalAtual: number;
  gap: number;
  percentualCoberto: number;
  recomendacoes: string[];
}

export function calcularProtecao(p: ProtecaoSimplificada): ResultadoProtecao {
  const capitalNecessario = p.rendaMensal * 12 * 5;
  const capitalAtual = p.possuiSeguroVida ? p.capitalSeguradoVida : 0;
  const gap = Math.max(0, capitalNecessario - capitalAtual);
  const percentualCoberto =
    capitalNecessario > 0
      ? Math.min(100, (capitalAtual / capitalNecessario) * 100)
      : 0;

  const recomendacoes: string[] = [];
  if (!p.possuiSeguroVida || capitalAtual < capitalNecessario)
    recomendacoes.push("Contratar ou aumentar seguro de vida");
  if (!p.possuiSeguroInvalidez)
    recomendacoes.push("Contratar seguro de invalidez permanente");
  if (!p.possuiPlanoSaude)
    recomendacoes.push("Contratar plano de saúde com boa cobertura");

  return { capitalNecessario, capitalAtual, gap, percentualCoberto, recomendacoes };
}

// ─── Planejamento Fiscal ──────────────────────────────────────────────────────

export interface PlanejamentoFiscal {
  rendaBrutaAnual: number;
  contribuiPGBL: boolean;
  aportePGBLAnual: number;
  declaraCompleto: boolean;
  temRendimentosIsentos: boolean;
  valorRendimentosIsentos: number;
}

export const initialPlanejamentoFiscal: PlanejamentoFiscal = {
  rendaBrutaAnual: 0,
  contribuiPGBL: false,
  aportePGBLAnual: 0,
  declaraCompleto: false,
  temRendimentosIsentos: false,
  valorRendimentosIsentos: 0,
};

export interface ResultadoFiscal {
  tetoPGBL: number;
  aportePGBLIdeal: number;
  economiaFiscalPotencial: number;
  economiaFiscalAtual: number;
  gapEconomia: number;
  recomendacoes: string[];
}

export function calcularFiscal(p: PlanejamentoFiscal): ResultadoFiscal {
  const tetoPGBL = p.rendaBrutaAnual * 0.12;
  const aportePGBLIdeal = tetoPGBL;
  const economiaFiscalPotencial = aportePGBLIdeal * 0.275;
  const economiaFiscalAtual = p.contribuiPGBL
    ? Math.min(p.aportePGBLAnual, tetoPGBL) * 0.275
    : 0;
  const gapEconomia = economiaFiscalPotencial - economiaFiscalAtual;

  const recomendacoes: string[] = [];
  if (!p.declaraCompleto)
    recomendacoes.push("Avaliar migração para declaração completa do IR");
  if (!p.contribuiPGBL && p.rendaBrutaAnual > 0)
    recomendacoes.push(`Contribuir para PGBL até o teto de 12% da renda bruta (R$ ${tetoPGBL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`);
  else if (p.contribuiPGBL && p.aportePGBLAnual < tetoPGBL)
    recomendacoes.push(`Aumentar aporte no PGBL para aproveitar o teto fiscal de R$ ${tetoPGBL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  if (!p.temRendimentosIsentos)
    recomendacoes.push("Ampliar exposição a ativos com rendimentos isentos (LCI/LCA, dividendos, FIIs)");

  return {
    tetoPGBL,
    aportePGBLIdeal,
    economiaFiscalPotencial,
    economiaFiscalAtual,
    gapEconomia,
    recomendacoes,
  };
}

// ─── Planejamento Sucessório ──────────────────────────────────────────────────

export interface PlanejamentoSucessorio {
  patrimonioTotal: number;
  possuiTestamento: boolean;
  possuiHolding: boolean;
  possuiSeguroVidaSucessao: boolean;
  capitalSeguroVidaSucessao: number;
  numeroHerdeiros: number;
  estadoResidencia: string;
}

export const initialPlanejamentoSucessorio: PlanejamentoSucessorio = {
  patrimonioTotal: 0,
  possuiTestamento: false,
  possuiHolding: false,
  possuiSeguroVidaSucessao: false,
  capitalSeguroVidaSucessao: 0,
  numeroHerdeiros: 1,
  estadoResidencia: "",
};

export interface ResultadoSucessorio {
  custoInventarioEstimado: number;
  itcmdEstimado: number;
  custoTotal: number;
  patrimonioLiquidoHerdeiros: number;
  percentualCusto: number;
  recomendacoes: string[];
}

export function calcularSucessorio(p: PlanejamentoSucessorio): ResultadoSucessorio {
  const itcmdEstimado = p.patrimonioTotal * 0.04;
  const custoInventario = p.patrimonioTotal * 0.06;
  const custoTotal = itcmdEstimado + custoInventario;
  const patrimonioLiquidoHerdeiros = Math.max(0, p.patrimonioTotal - custoTotal);
  const percentualCusto =
    p.patrimonioTotal > 0 ? (custoTotal / p.patrimonioTotal) * 100 : 0;

  const recomendacoes: string[] = [];
  if (!p.possuiTestamento)
    recomendacoes.push("Elaborar testamento para agilizar e direcionar a sucessão");
  if (!p.possuiHolding && p.patrimonioTotal > 1_000_000)
    recomendacoes.push("Avaliar constituição de holding familiar para reduzir custos sucessórios");
  if (!p.possuiSeguroVidaSucessao)
    recomendacoes.push("Contratar seguro de vida para cobrir custos de inventário e ITCMD");

  return {
    custoInventarioEstimado: custoInventario,
    itcmdEstimado,
    custoTotal,
    patrimonioLiquidoHerdeiros,
    percentualCusto,
    recomendacoes,
  };
}

// ─── Financial Plan (raiz) ────────────────────────────────────────────────────

export interface FinancialPlan {
  id?: string;
  clientId: string;
  createdAt?: string;
  updatedAt?: string;
  suitability: SuitabilityResult | null;
  ativosAtuais: AtivoAtual;
  alocacaoPersonalizada: MacroalocacaoAlvo | null;
  planejamentoIF: PlanejamentoIF;
  protecao: ProtecaoSimplificada;
  fiscal: PlanejamentoFiscal;
  sucessorio: PlanejamentoSucessorio;
  notasAssessor: string;
  status: "rascunho" | "completo";
}

export function initialFinancialPlan(clientId: string): FinancialPlan {
  return {
    clientId,
    suitability: null,
    ativosAtuais: { ...initialAtivoAtual },
    alocacaoPersonalizada: null,
    planejamentoIF: { ...initialPlanejamentoIF },
    protecao: { ...initialProtecaoSimplificada },
    fiscal: { ...initialPlanejamentoFiscal },
    sucessorio: { ...initialPlanejamentoSucessorio },
    notasAssessor: "",
    status: "rascunho",
  };
}
