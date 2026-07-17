/* Scores por área e frases-resumo do diagnóstico — lógica compartilhada entre
 * o FinancialPlanDashboard (tela) e o documento "Estratégia Pronta" (página
 * Ponto de Partida). Área sem análise recebe score -1 ("Não analisado") e é
 * excluída da média do score geral. */
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalAtualSeguro(seguroSalvo: NonNullable<ResultadosEstrategia["seguro"]>): number {
  const direto = Number(seguroSalvo.capitalAtual) || Number(seguroSalvo.totalCoverage) || 0;
  if (direto) return direto;
  const df = seguroSalvo.dadosFormulario;
  return df
    ? (Number(df.seguroVidaAtual) || 0) +
      (Number(df.seguroInvalidezAtual) || 0) +
      (Number(df.outrosSeguroAtual) || 0)
    : 0;
}

// Variáveis de Liberdade Financeira: APENAS coleta, perpetuidade IPCA+4%
function varsLF(plan: FinancialPlan) {
  const dc = plan.dadosCliente;
  const patrimonioAtual = Number(dc.patrimonioFinanceiroEstimado) || 0;
  const aporteMensal    = Number(dc.aportesMensalMedio) || 0;
  const rendaDesejada   = Number(dc.rendaDesejadaAposentadoria) || 0;
  const idadeMeta       = Number(plan.planejamentoIF.idadeMeta) || 60;
  const idadeAtual      = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  const patrimonioNecessario = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const TAXA_MENSAL = Math.pow(1.04, 1 / 12) - 1;
  const nMeses = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const projecao = nMeses > 0
    ? patrimonioAtual * Math.pow(1 + TAXA_MENSAL, nMeses) +
      aporteMensal * (Math.pow(1 + TAXA_MENSAL, nMeses) - 1) / TAXA_MENSAL
    : patrimonioAtual;

  const temDados = patrimonioNecessario > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;
  return { patrimonioAtual, aporteMensal, rendaDesejada, idadeMeta, idadeAtual, patrimonioNecessario, projecao, temDados };
}

// ── Scores ────────────────────────────────────────────────────────────────────

export interface ScoresAreas {
  lf: number;
  aa: number;
  ps: number;
  fiscal: number;
  /** null quando nenhuma área foi analisada */
  geral: number | null;
}

export function calcularScoresAreas(plan: FinancialPlan, resultados: ResultadosEstrategia): ScoresAreas {
  const dc          = plan.dadosCliente;
  const seguroSalvo = resultados.seguro;
  const fiscalSalvo = resultados.fiscal;

  // ── Liberdade Financeira ──────────────────────────────────────────────────
  const vlf = varsLF(plan);
  const lf = !vlf.temDados
    ? -1
    : Math.min(100, Math.round((vlf.projecao / vlf.patrimonioNecessario) * 100));

  // ── Asset Allocation ──────────────────────────────────────────────────────
  const aa = (() => {
    const aaTemDados = Number(dc.patrimonioFinanceiroEstimado) > 0;
    if (!aaTemDados) return -1;

    const perfil      = dc.suitabilityPerfil ?? '';
    const temRendaFixa = true; // patrimônio > 0 implica ao menos renda fixa
    const temAcoes    = Number(plan.ativosAtuais.acoes) > 0;
    const temFIIs     = Number(plan.ativosAtuais.fiis) > 0;
    const temExterior = Number(plan.ativosAtuais.rvGlobal) > 0 || Number(plan.ativosAtuais.rfGlobal) > 0;

    let pontos = 0;
    if (temRendaFixa) pontos += 30;
    if (temAcoes)     pontos += 25;
    if (temFIIs)      pontos += 25;
    if (temExterior)  pontos += 20;

    // Conservador sem RV não é penalizado
    if (perfil === 'conservador' && !temAcoes && !temFIIs) {
      pontos = Math.min(pontos + 20, 70);
    }

    return Math.min(100, pontos);
  })();

  // ── Proteção ──────────────────────────────────────────────────────────────
  const ps = (() => {
    if (!seguroSalvo) return -1;
    const capitalNecessario = Number(seguroSalvo.capitalNecessario) || Number(seguroSalvo.totalNeed) || 0;
    const capitalAtual = capitalAtualSeguro(seguroSalvo);
    if (capitalNecessario > 0) {
      return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
    }
    return capitalAtual > 0 ? 50 : (seguroSalvo.scoreProtecao ?? 0);
  })();

  // ── Tributário ────────────────────────────────────────────────────────────
  const fiscal = (() => {
    if (!fiscalSalvo) return -1;
    const tipoDeclaracao  = fiscalSalvo.tipoDeclaracao ?? 'nao_sei';
    const tetoPGBL        = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;
    const economia        = Number(fiscalSalvo.economiaAnual) || 0;

    let pontos = 0;

    // 1. Tipo de declaração definido (30 pts completa / 20 pts simplificada)
    if (tipoDeclaracao === 'completa')     pontos += 30;
    else if (tipoDeclaracao === 'simplificada') pontos += 20;

    // 2. Aproveitamento PGBL (40 pts) ou identificação do modelo (20 pts)
    if (tipoDeclaracao === 'completa') {
      if (aporteAnualPGBL > 0) {
        const aproveitamento = tetoPGBL > 0 ? Math.min(1, aporteAnualPGBL / tetoPGBL) : 0;
        pontos += Math.round(aproveitamento * 40);
      }
    } else if (tipoDeclaracao === 'simplificada') {
      pontos += 20;
    }

    // 3. Diferimento gerado (30 pts) ou neutro para simplificada (15 pts)
    if (economia > 0 && tetoPGBL > 0) {
      const economiaPct = Math.min(1, economia / (tetoPGBL * 0.275));
      pontos += Math.round(economiaPct * 30);
    } else if (tipoDeclaracao === 'simplificada') {
      pontos += 15;
    }

    return Math.min(100, pontos);
  })();

  // ── Score Geral ───────────────────────────────────────────────────────────
  const scoresAtivos = [lf, aa, ps, fiscal].filter((s) => s >= 0);
  const geral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  return { lf, aa, ps, fiscal, geral };
}

// ── Textos analíticos por área ────────────────────────────────────────────────

export interface TextosAreas {
  lf: string;
  aa: string;
  ps: string;
  fiscal: string;
}

export function gerarTextosAreas(plan: FinancialPlan, resultados: ResultadosEstrategia): TextosAreas {
  const dc          = plan.dadosCliente;
  const seguroSalvo = resultados.seguro;
  const fiscalSalvo = resultados.fiscal;

  // ── LF ────────────────────────────────────────────────────────────────────
  const lf = (() => {
    const v = varsLF(plan);
    if (!v.temDados) {
      return "Para calcular o score de Liberdade Financeira, preencha na Coleta de Dados: patrimônio atual, aporte mensal, renda desejada na aposentadoria, data de nascimento e idade meta.";
    }
    const pct = Math.round((v.projecao / v.patrimonioNecessario) * 100);
    if (v.projecao >= v.patrimonioNecessario) {
      return `Com patrimônio atual de ${formatCurrency(v.patrimonioAtual)} e aporte de ${formatCurrency(v.aporteMensal)}/mês, a projeção a IPCA+4% ao ano indica patrimônio de ${formatCurrency(v.projecao)} aos ${v.idadeMeta} anos, suficiente para gerar ${formatCurrency(v.rendaDesejada)}/mês em perpetuidade (patrimônio necessário: ${formatCurrency(v.patrimonioNecessario)}).`;
    }
    const gap = Math.max(0, v.patrimonioNecessario - v.projecao);
    return `Com patrimônio atual de ${formatCurrency(v.patrimonioAtual)} e aporte de ${formatCurrency(v.aporteMensal)}/mês, a projeção a IPCA+4% ao ano indica ${formatCurrency(v.projecao)} aos ${v.idadeMeta} anos — ${pct}% do necessário para gerar ${formatCurrency(v.rendaDesejada)}/mês em perpetuidade. Gap de ${formatCurrency(gap)}.`;
  })();

  // ── AA ────────────────────────────────────────────────────────────────────
  const aa = (() => {
    const aaTemDados = Number(dc.patrimonioFinanceiroEstimado) > 0;
    if (!aaTemDados) {
      return "Preencha o patrimônio financeiro e os tipos de investimentos na Coleta de Dados para obter a análise de Asset Allocation.";
    }
    const temAcoes   = Number(plan.ativosAtuais.acoes) > 0;
    const temFIIs    = Number(plan.ativosAtuais.fiis) > 0;
    const temExterior = Number(plan.ativosAtuais.rvGlobal) > 0 || Number(plan.ativosAtuais.rfGlobal) > 0;
    const classes = [
      `✓ Renda Fixa (base da carteira)`,
      `${temAcoes    ? '✓' : '✗'} Ações (crescimento patrimonial)`,
      `${temFIIs     ? '✓' : '✗'} FIIs (renda passiva)`,
      `${temExterior ? '✓' : '✗'} Exterior (diversificação geográfica)`,
    ].join(' · ');
    return `Diversificação registrada na coleta: ${classes}.`;
  })();

  // ── PS ────────────────────────────────────────────────────────────────────
  const ps = (() => {
    if (!seguroSalvo) {
      return "Análise de proteção ainda não realizada. Acesse a aba Proteção e Sucessório para mapear sua necessidade de cobertura de vida, invalidez e doenças graves e identificar eventuais gaps.";
    }
    const capitalNecessario = Number(seguroSalvo.capitalNecessario) || Number(seguroSalvo.totalNeed) || 0;
    const capitalAtual = capitalAtualSeguro(seguroSalvo);
    const gap = Math.max(0, capitalNecessario - capitalAtual);
    const totalImediato = Number(seguroSalvo.capitalImediato) || Number(seguroSalvo.immediateTotal) || 0;
    const subtotalContinuo = Number(seguroSalvo.capitalContinuo) || Number(seguroSalvo.ongoingTotal) || 0;
    const totalCoberturasVida = Number(seguroSalvo.capitalCoberturasVida) || Math.max(0, capitalNecessario - totalImediato - subtotalContinuo);
    if (capitalAtual === 0 && capitalNecessario > 0) {
      return `Nenhuma apólice de seguro foi informada. O capital necessário estimado é de ${formatCurrency(capitalNecessario)}, considerando necessidades imediatas de ${formatCurrency(totalImediato)}, renda contínua de ${formatCurrency(subtotalContinuo)} e coberturas em vida de ${formatCurrency(totalCoberturasVida)}. Recomendamos avaliar a contratação de seguro de vida para proteger sua família.`;
    }
    if (capitalAtual >= capitalNecessario) {
      return `Sua cobertura atual de ${formatCurrency(capitalAtual)} é adequada para o capital necessário estimado de ${formatCurrency(capitalNecessario)}, considerando necessidades imediatas de ${formatCurrency(totalImediato)}, renda contínua de ${formatCurrency(subtotalContinuo)} e coberturas em vida de ${formatCurrency(totalCoberturasVida)}. Mantenha suas apólices em dia e revise anualmente.`;
    }
    const pct = Math.round((capitalAtual / capitalNecessario) * 100);
    return `Sua cobertura atual de ${formatCurrency(capitalAtual)} cobre ${pct}% do capital necessário de ${formatCurrency(capitalNecessario)}. O gap identificado é de ${formatCurrency(gap)}. Avalie a contratação de seguro adicional para proteger adequadamente sua família.`;
  })();

  // ── Fiscal ────────────────────────────────────────────────────────────────
  const fiscal = (() => {
    if (!fiscalSalvo) {
      return "Acesse Planejamento Tributário para analisar o tipo de declaração e oportunidade de PGBL.";
    }
    const tipoDeclaracao  = fiscalSalvo.tipoDeclaracao ?? 'nao_sei';
    const tetoPGBL        = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;
    const economia        = Number(fiscalSalvo.economiaAnual) || 0;

    if (tipoDeclaracao === 'nao_sei') {
      return "Tipo de declaração ainda não definido. Isso impacta diretamente na elegibilidade ao PGBL e no planejamento fiscal.";
    }
    if (tipoDeclaracao === 'completa' && economia > 0) {
      const aprovPct = tetoPGBL > 0 ? Math.round((aporteAnualPGBL / tetoPGBL) * 100) : 0;
      return `Declaração completa com PGBL. Aproveitamento: ${aprovPct}% do teto disponível (${formatCurrency(tetoPGBL)}/ano). Economia fiscal: ${formatCurrency(economia)}/ano.`;
    }
    if (tipoDeclaracao === 'completa' && aporteAnualPGBL === 0) {
      return `Declaração completa sem PGBL. Oportunidade de deduzir até ${formatCurrency(tetoPGBL)}/ano no IR.`;
    }
    if (tipoDeclaracao === 'simplificada') {
      return "Declaração no modelo simplificado. Nesse modelo, aportes em PGBL não geram dedução adicional de IR. Avalie periodicamente se o modelo completo seria mais vantajoso — especialmente se despesas dedutíveis superarem o desconto padrão.";
    }
    return `Declaração completa identificada. Verifique se o aporte no PGBL foi preenchido e se a renda bruta está correta na calculadora tributária.`;
  })();

  return { lf, aa, ps, fiscal };
}
