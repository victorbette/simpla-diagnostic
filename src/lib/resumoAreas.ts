/* Scores por área e frases-resumo do diagnóstico — lógica compartilhada entre
 * o FinancialPlanDashboard (tela) e o documento "Estratégia Pronta" (página
 * Ponto de Partida). Área sem análise recebe score -1 ("Não analisado") e é
 * excluída da média do score geral. */
import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

// ── Variáveis intermediárias compartilhadas entre scores e textos ────────────

/** Projeção de liberdade financeira a partir dos dados da coleta:
 *  acumulação a 4,5% a.a. real até a idade-meta e retirada a 4% a.a. até os 90. */
function varsLiberdadeFinanceira(plan: FinancialPlan, resultados: ResultadosEstrategia) {
  const dc = plan.dadosCliente;
  const ifSalvo = resultados.if;
  const patrimonioAtual = Number(dc.patrimonioFinanceiroEstimado) || 0;
  const aporteMensal    = Number(dc.aportesMensalMedio) || 0;
  const idadeAtual = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;
  const idadeMeta     = Number(ifSalvo?.idadeMeta)           || plan.planejamentoIF.idadeMeta || 60;
  const rendaDesejada = Number(ifSalvo?.rendaMensalDesejada) || plan.planejamentoIF.rendaMensalDesejada || 0;

  const taxaMensal = Math.pow(1.045, 1 / 12) - 1;
  const nMeses     = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const projecao   = nMeses > 0
    ? patrimonioAtual * Math.pow(1 + taxaMensal, nMeses) +
      aporteMensal * (Math.pow(1 + taxaMensal, nMeses) - 1) / taxaMensal
    : patrimonioAtual;

  const taxaRetMensal = Math.pow(1.04, 1 / 12) - 1;
  const mesesRetirada = Math.max(0, (90 - idadeMeta) * 12);
  const patrimonioNecessario = rendaDesejada > 0
    ? rendaDesejada * (1 - Math.pow(1 + taxaRetMensal, -mesesRetirada)) / taxaRetMensal
    : 0;

  const temDados = patrimonioNecessario > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;

  return { patrimonioAtual, aporteMensal, idadeAtual, idadeMeta, rendaDesejada, projecao, patrimonioNecessario, temDados };
}

/** Cobertura atual: campos diretos ou soma das apólices do formulário. */
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

function varsFiscal(plan: FinancialPlan, resultados: ResultadosEstrategia) {
  const fiscalSalvo = resultados.fiscal;
  return {
    tipoDeclaracao: (fiscalSalvo?.tipoDeclaracao ?? plan.fiscal.tipoDeclaracao) as string,
    rendaAnual:       Number(fiscalSalvo?.rendaAnual)            || 0,
    tetoPGBL:         Number(fiscalSalvo?.tetoPGBLAnual)         || 0,
    aporteAnual:      Number(fiscalSalvo?.aporteAnual)           || 0,
    economiaAnual:    Number(fiscalSalvo?.economiaAnual)         || 0,
    numDependentes:   Number(fiscalSalvo?.inputDependentes)      || 0,
    aporteMensalPGBL: Number(fiscalSalvo?.inputAporteMensalPGBL) || 0,
  };
}

// ── Scores ───────────────────────────────────────────────────────────────────

export interface ScoresAreas {
  lf: number;
  aa: number;
  ps: number;
  fiscal: number;
  /** null quando nenhuma área foi analisada */
  geral: number | null;
}

export function calcularScoresAreas(plan: FinancialPlan, resultados: ResultadosEstrategia): ScoresAreas {
  const seguroSalvo   = resultados.seguro;
  const fiscalSalvo   = resultados.fiscal;
  const carteiraSalva = resultados.carteira;

  // ── Liberdade Financeira (-1 = não analisado) ─────────────────────────────
  const vlf = varsLiberdadeFinanceira(plan, resultados);
  const lf = !vlf.temDados
    ? -1
    : Math.min(100, Math.round((vlf.projecao / vlf.patrimonioNecessario) * 100));

  // ── Proteção (-1 = não analisado, 0 = 0% de cobertura) ────────────────────
  const ps = (() => {
    if (!seguroSalvo) return -1;
    const capitalNecessario = Number(seguroSalvo.capitalNecessario) || Number(seguroSalvo.totalNeed) || 0;
    const capitalAtual = capitalAtualSeguro(seguroSalvo);
    if (capitalNecessario > 0) {
      return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
    }
    return seguroSalvo.scoreProtecao ?? 0;
  })();

  // ── Tributário (-1 = não analisado) ───────────────────────────────────────
  const fiscal = (() => {
    if (!fiscalSalvo) return -1;
    const vf = varsFiscal(plan, resultados);
    let pts = 0;
    // Critério 1: tipo de declaração definido (20pts)
    if (vf.tipoDeclaracao !== "nao_sei") pts += 20;
    // Critério 2: adequação do modelo (30pts)
    if (vf.tipoDeclaracao === "completa") {
      pts += (vf.rendaAnual > 40000 || vf.numDependentes > 0) ? 30 : 10;
    } else if (vf.tipoDeclaracao === "simplificada") {
      pts += (vf.rendaAnual <= 40000 && vf.numDependentes === 0) ? 30 : 15;
    }
    // Critério 3: aproveitamento PGBL (50pts)
    if (vf.tipoDeclaracao === "completa") {
      const aprovPct = vf.tetoPGBL > 0
        ? Math.min(100, Math.round((vf.aporteAnual / vf.tetoPGBL) * 100))
        : 0;
      pts += Math.round(aprovPct * 0.5);
    } else if (vf.tipoDeclaracao === "simplificada") {
      pts += 25;
    }
    return Math.min(100, pts);
  })();

  // ── Asset Allocation (-1 = não analisado) ─────────────────────────────────
  const aa = (() => {
    if (!carteiraSalva) return -1;
    const macroAtual = carteiraSalva.macroAtual ?? {};
    const macroMeta  = carteiraSalva.macroMeta  ?? {};
    const ids = Object.keys(macroMeta);
    if (!ids.length || !Object.keys(macroAtual).length) return -1;
    const desvios = ids.map((id) =>
      Math.abs((Number(macroAtual[id]) || 0) - (Number(macroMeta[id]) || 0))
    );
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    return Math.max(0, Math.round(100 - desvioMedio * 3));
  })();

  // ── Score Geral (ignora áreas não analisadas) ─────────────────────────────
  const scoresAtivos = [lf, aa, ps, fiscal].filter((s) => s >= 0);
  const geral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  return { lf, aa, ps, fiscal, geral };
}

// ── Textos analíticos por área ───────────────────────────────────────────────

export interface TextosAreas {
  lf: string;
  aa: string;
  ps: string;
  fiscal: string;
}

export function gerarTextosAreas(plan: FinancialPlan, resultados: ResultadosEstrategia): TextosAreas {
  const ifSalvo       = resultados.if;
  const seguroSalvo   = resultados.seguro;
  const fiscalSalvo   = resultados.fiscal;
  const carteiraSalva = resultados.carteira;
  const perfil = plan.dadosCliente.suitabilityPerfil;

  const lf = (() => {
    if (!ifSalvo) {
      return "Simulação de liberdade financeira ainda não realizada. Acesse a aba Liberdade Financeira para configurar sua projeção e descobrir em quanto tempo você pode atingir a independência financeira com os aportes atuais.";
    }
    const v = varsLiberdadeFinanceira(plan, resultados);
    const anosRestantes = Math.max(0, v.idadeMeta - v.idadeAtual);
    const pct = v.patrimonioNecessario > 0
      ? Math.round((v.projecao / v.patrimonioNecessario) * 100)
      : 0;
    const gap = Math.max(0, v.patrimonioNecessario - v.projecao);
    if (v.patrimonioNecessario > 0 && v.projecao >= v.patrimonioNecessario) {
      return `Com patrimônio atual de ${formatCurrency(v.patrimonioAtual)} e aportes mensais de ${formatCurrency(v.aporteMensal)}, o patrimônio projetado aos ${v.idadeMeta} anos (em ${anosRestantes} anos) é de ${formatCurrency(v.projecao)} — ${pct}% da meta de ${formatCurrency(v.patrimonioNecessario)} para sustentar ${formatCurrency(v.rendaDesejada)}/mês. A liberdade financeira está no caminho certo.`;
    }
    if (v.patrimonioNecessario > 0) {
      return `Com patrimônio atual de ${formatCurrency(v.patrimonioAtual)} e aportes de ${formatCurrency(v.aporteMensal)}/mês, a projeção aos ${v.idadeMeta} anos é de ${formatCurrency(v.projecao)} — ${pct}% dos ${formatCurrency(v.patrimonioNecessario)} necessários para ${formatCurrency(v.rendaDesejada)}/mês. Há um gap de ${formatCurrency(gap)}: considere aumentar aportes, postergar a meta de idade ou redimensionar a renda desejada.`;
    }
    // Sem dados da coleta para projetar — usa o resultado salvo da ferramenta
    const projecao  = ifSalvo.patrimonioAposentadoria;
    const meta      = ifSalvo.patrimonioNecessario;
    const renda     = ifSalvo.rendaMensalDesejada;
    const idadeAlvo = ifSalvo.idadeMeta;
    if (projecao >= meta) {
      return `Projeção de ${formatCurrency(projecao)} aos ${idadeAlvo} anos supera a meta de ${formatCurrency(meta)} para renda de ${formatCurrency(renda)}/mês. Liberdade financeira no caminho certo.`;
    }
    return `Projeção de ${formatCurrency(projecao)} aos ${idadeAlvo} anos é inferior à meta de ${formatCurrency(meta)} para renda de ${formatCurrency(renda)}/mês. Revise aportes ou estratégia de investimentos.`;
  })();

  const aa = (() => {
    if (!carteiraSalva) {
      return "Análise de carteira ainda não realizada. Acesse a aba Asset Allocation para registrar seus investimentos, definir a alocação ideal para seu perfil e receber um plano de ação personalizado de rebalanceamento.";
    }
    const { patrimonio, macroAtual, macroMeta } = carteiraSalva;
    const ids = Object.keys(macroMeta ?? {});
    const desvioMedio = ids.length
      ? ids.map((id) => Math.abs((Number(macroAtual[id]) || 0) - (Number(macroMeta[id]) || 0)))
          .reduce((s, d) => s + d, 0) / ids.length
      : 0;
    const alinhado = desvioMedio < 5;
    const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
    if (alinhado) {
      return `Patrimônio financeiro de ${formatCurrency(patrimonio)} com perfil ${perfilLabel}. A alocação atual está alinhada com a meta — desvio médio entre segmentos inferior a 5%. A carteira segue as diretrizes do diagnóstico Simpla Invest para este perfil, com boa diversificação entre as classes de ativos.`;
    }
    return `Patrimônio financeiro de ${formatCurrency(patrimonio)} com perfil ${perfilLabel}. O desvio médio entre alocação atual e meta é de ${desvioMedio.toFixed(1)}%, indicando oportunidade de rebalanceamento. O plano de ação detalha os movimentos necessários para otimizar a carteira conforme o perfil ${perfilLabel} e os objetivos definidos.`;
  })();

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
      return `Sua cobertura atual de ${formatCurrency(capitalAtual)} (entre seguro de vida e demais apólices) é adequada para o capital necessário estimado de ${formatCurrency(capitalNecessario)}, considerando necessidades imediatas de ${formatCurrency(totalImediato)}, renda contínua de ${formatCurrency(subtotalContinuo)} e coberturas em vida de ${formatCurrency(totalCoberturasVida)}. Mantenha suas apólices em dia e revise anualmente.`;
    }
    const pct = Math.round((capitalAtual / capitalNecessario) * 100);
    return `Sua cobertura atual de ${formatCurrency(capitalAtual)} cobre ${pct}% do capital necessário de ${formatCurrency(capitalNecessario)}. O gap identificado é de ${formatCurrency(gap)}. Avalie a contratação de seguro adicional para proteger adequadamente sua família.`;
  })();

  const fiscal = (() => {
    if (!fiscalSalvo) {
      return "Análise tributária ainda não realizada. Acesse a aba Planejamento Tributário para simular o diferimento fiscal via PGBL e identificar oportunidades de redução de IR.";
    }
    const vf = varsFiscal(plan, resultados);
    if (vf.tipoDeclaracao === "simplificada") {
      return "Declaração no modelo simplificado (desconto padrão de R$ 16.754,34/ano). Nesse modelo, aportes em PGBL não geram dedução adicional de IR. Avalie periodicamente se o modelo completo seria mais vantajoso — especialmente se despesas dedutíveis (saúde, educação, dependentes, INSS) superarem o desconto fixo.";
    }
    if (vf.tipoDeclaracao === "nao_sei") {
      return "Tipo de declaração não identificado. Para otimizar a estratégia tributária, defina se declara pelo modelo completo ou simplificado. No modelo completo, aportes em PGBL de até 12% da renda bruta anual são dedutíveis da base de cálculo do IR, podendo gerar economia significativa.";
    }
    if (vf.economiaAnual > 0) {
      const pctAproveitamento = vf.tetoPGBL > 0
        ? Math.round((vf.aporteAnual / vf.tetoPGBL) * 100)
        : 0;
      if (vf.aporteMensalPGBL > 0) {
        return `Declaração completa. Aportando ${formatCurrency(vf.aporteMensalPGBL)}/mês em PGBL (${formatCurrency(vf.aporteAnual)}/ano), aproveitando ${pctAproveitamento}% do teto de ${formatCurrency(vf.tetoPGBL)}/ano (12% da renda bruta de ${formatCurrency(vf.rendaAnual)}), a economia fiscal estimada é de ${formatCurrency(vf.economiaAnual)}/ano — ${formatCurrency(vf.economiaAnual / 12)}/mês. Reinvestindo a restituição no próprio PGBL, o efeito composto amplifica ainda mais o benefício ao longo do tempo.`;
      }
      return `Declaração completa. Com aporte de ${formatCurrency(vf.aporteAnual)}/ano no PGBL (${formatCurrency(vf.aporteAnual / 12)}/mês), aproveitando ${pctAproveitamento}% do teto de ${formatCurrency(vf.tetoPGBL)}/ano (12% da renda bruta de ${formatCurrency(vf.rendaAnual)}), a economia fiscal estimada é de ${formatCurrency(vf.economiaAnual)}/ano — ${formatCurrency(vf.economiaAnual / 12)}/mês. Ao reinvestir a restituição no próprio PGBL, o efeito composto amplifica ainda mais o benefício ao longo do tempo.`;
    }
    if (vf.aporteMensalPGBL === 0 && vf.tetoPGBL > 0) {
      return `Declaração completa identificada. Nenhum aporte em PGBL informado. Há espaço para deduzir até ${formatCurrency(vf.tetoPGBL / 12)}/mês (${formatCurrency(vf.tetoPGBL)}/ano) e potencialmente economizar no IR.`;
    }
    return `Declaração completa identificada. Não foi apurada economia fiscal com os dados informados — verifique se o aporte no PGBL foi preenchido e se a renda bruta anual de ${formatCurrency(vf.rendaAnual)} está correta na calculadora tributária.`;
  })();

  return { lf, aa, ps, fiscal };
}
