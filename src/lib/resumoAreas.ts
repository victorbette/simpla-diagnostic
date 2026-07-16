/* Scores por área e frases-resumo do diagnóstico — lógica compartilhada entre
 * o FinancialPlanDashboard (tela) e o documento "Estratégia Pronta" (página
 * Ponto de Partida). Área sem análise recebe score 0 ("Não analisado") e é
 * excluída da média do score geral. */
import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import { CARD_ORDER } from "@/lib/carteira/types";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

export interface ScoresAreas {
  lf: number;
  aa: number;
  ps: number;
  fiscal: number;
  /** null quando nenhuma área foi analisada */
  geral: number | null;
  temDados: { lf: boolean; aa: boolean; ps: boolean; fiscal: boolean };
}

export function calcularScoresAreas(resultados: ResultadosEstrategia): ScoresAreas {
  const ifSalvo       = resultados.if;
  const seguroSalvo   = resultados.seguro;
  const fiscalSalvo   = resultados.fiscal;
  const carteiraSalva = resultados.carteira;

  const lf = (() => {
    if (!ifSalvo) return 0;
    const { patrimonioNecessario, patrimonioAposentadoria } = ifSalvo;
    if (!patrimonioNecessario) return 0;
    if (patrimonioAposentadoria >= patrimonioNecessario) return 100;
    return Math.round((patrimonioAposentadoria / patrimonioNecessario) * 100);
  })();

  const ps = seguroSalvo?.scoreProtecao ?? 0;

  const fiscal = (() => {
    if (!fiscalSalvo) return 0;
    const { economiaAnual, tetoPGBLAnual, aporteAnual } = fiscalSalvo;
    if (tetoPGBLAnual === 0) return 50;
    if (economiaAnual > 0) {
      const aproveitamento = Math.min(aporteAnual / tetoPGBLAnual, 1) * 100;
      return Math.round(aproveitamento);
    }
    return 20;
  })();

  const aa = (() => {
    if (!carteiraSalva) return 0;
    const { macroAtual, macroMeta } = carteiraSalva;
    if (!macroAtual || !macroMeta || Object.keys(macroAtual).length === 0) return 0;
    const desvios = CARD_ORDER.map((id) => Math.abs((macroAtual[id] ?? 0) - (macroMeta[id] ?? 0)));
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    return Math.max(0, Math.round(100 - desvioMedio * 3));
  })();

  const scoresAtivos = [
    ifSalvo       ? lf     : null,
    carteiraSalva ? aa     : null,
    seguroSalvo   ? ps     : null,
    fiscalSalvo   ? fiscal : null,
  ].filter((s): s is number => s !== null);

  const geral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  return {
    lf, aa, ps, fiscal, geral,
    temDados: { lf: !!ifSalvo, aa: !!carteiraSalva, ps: !!seguroSalvo, fiscal: !!fiscalSalvo },
  };
}

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
      return "Simulação de liberdade financeira ainda não realizada. Acesse a aba Liberdade Financeira para configurar sua projeção patrimonial.";
    }
    const { patrimonioAposentadoria: projecao, patrimonioNecessario: meta, rendaMensalDesejada: renda, idadeMeta: idadeAlvo } = ifSalvo;
    if (projecao >= meta) {
      return `Com o aporte atual, sua projeção de patrimônio aos ${idadeAlvo} anos é de ${formatCurrency(projecao)}, superando o patrimônio necessário de ${formatCurrency(meta)} para sustentar uma renda de ${formatCurrency(renda)}/mês. Sua meta de liberdade financeira está no caminho certo.`;
    }
    return `Sua projeção de patrimônio aos ${idadeAlvo} anos é de ${formatCurrency(projecao)}, abaixo do necessário ${formatCurrency(meta)} para uma renda mensal de ${formatCurrency(renda)}. Para alcançar a meta de liberdade financeira, é necessário aumentar aportes ou ajustar a estratégia de investimentos.`;
  })();

  const aa = (() => {
    if (!carteiraSalva) {
      return "Análise de carteira ainda não realizada. Acesse a aba Asset Allocation para registrar seus investimentos e definir a alocação ideal.";
    }
    const { patrimonio, macroAtual, macroMeta } = carteiraSalva;
    const desvios = CARD_ORDER.map((id) => Math.abs((macroAtual[id] ?? 0) - (macroMeta[id] ?? 0)));
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    const alinhado = desvioMedio < 5;
    const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
    return `Patrimônio financeiro atual de ${formatCurrency(patrimonio)}, com perfil ${perfilLabel}. A alocação proposta segue o padrão Simpla Invest para o seu perfil. ${alinhado ? "Carteira alinhada com a meta." : "Há desvios na alocação atual que podem ser corrigidos com o plano de ação definido."}`;
  })();

  const ps = (() => {
    if (!seguroSalvo) {
      return "Análise de proteção ainda não realizada. Acesse a aba Proteção e Sucessório para mapear suas necessidades de cobertura.";
    }
    const capitalNecessario = seguroSalvo.capitalNecessario ?? seguroSalvo.totalNeed ?? 0;
    const capitalAtual = seguroSalvo.capitalAtual ?? seguroSalvo.totalCoverage ?? 0;
    const gap = seguroSalvo.gap ?? Math.max(0, capitalNecessario - capitalAtual);
    if (capitalAtual >= capitalNecessario) {
      return `Sua cobertura de ${formatCurrency(capitalAtual)} é adequada para proteger sua família. O capital necessário estimado é de ${formatCurrency(capitalNecessario)}.`;
    }
    return `Foi identificado um gap de proteção de ${formatCurrency(gap)}. Sua cobertura atual de ${formatCurrency(capitalAtual)} é inferior ao capital necessário de ${formatCurrency(capitalNecessario)} para proteger sua família.`;
  })();

  const fiscal = (() => {
    if (!fiscalSalvo) {
      return "Análise tributária ainda não realizada. Acesse a aba Planejamento Tributário para simular o diferimento fiscal via PGBL.";
    }
    const { economiaAnual, tetoPGBLAnual } = fiscalSalvo;
    if (economiaAnual > 0) {
      return `Com a estratégia PGBL simulada, a economia fiscal estimada é de ${formatCurrency(economiaAnual)}/ano (${formatCurrency(economiaAnual / 12)}/mês). O teto disponível para dedução é de ${formatCurrency(tetoPGBLAnual)}/ano.`;
    }
    return "Não foi identificada oportunidade de diferimento fiscal com os dados informados. Verifique o tipo de declaração e a renda na calculadora tributária.";
  })();

  return { lf, aa, ps, fiscal };
}
