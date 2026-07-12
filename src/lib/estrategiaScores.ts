import {
  calcularIF,
  calcularAlocacaoAtual,
  ALOCACAO_ALVO,
} from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

export interface EstrategiaScores {
  aaScore: number;
  lfScore: number;
  psScore: number;
  fiscalScore: number;
  overall: number;
}

export function calcularScores(
  plan: FinancialPlan,
  resultados: ResultadosEstrategia,
): EstrategiaScores {
  const perfil = plan.dadosCliente.suitabilityPerfil;

  // Asset Allocation
  let aaScore = 50;
  if (resultados.carteira) {
    if (perfil && !plan.dadosCliente.comecandoDoZero) {
      const alocAtual = calcularAlocacaoAtual(plan.ativosAtuais);
      const meta = ALOCACAO_ALVO[perfil];
      const chaves = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"] as const;
      const desvios = chaves.filter((k) => Math.abs(alocAtual[k] - meta[k]) > 5).length;
      aaScore = Math.max(20, 100 - desvios * 15);
    } else {
      aaScore = 72;
    }
  }

  // Liberdade Financeira
  let lfScore = 50;
  if (resultados.if) {
    if (resultados.if.liberdadeAlcancada) {
      lfScore = 100;
    } else {
      const pct =
        resultados.if.patrimonioNecessario > 0
          ? (resultados.if.patrimonioAposentadoria / resultados.if.patrimonioNecessario) * 100
          : 0;
      lfScore = Math.min(90, Math.max(10, Math.round(pct)));
    }
  } else if (plan.planejamentoIF.rendaMensalDesejada > 0) {
    const simples = calcularIF(plan.planejamentoIF);
    lfScore = Math.min(90, Math.max(10, Math.round(simples.percentualIF)));
  }

  // Proteção e Sucessório
  let psScore = 50;
  if (resultados.seguro) {
    psScore = Math.min(100, resultados.seguro.scoreProtecao);
  } else {
    const checks = [
      plan.protecao.possuiSeguroVida,
      plan.protecao.possuiSeguroInvalidez,
      plan.protecao.possuiPlanoSaude,
      plan.sucessorio.possuiTestamento,
    ];
    psScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  // Planejamento Tributário
  let fiscalScore = 50;
  if (resultados.fiscal) {
    fiscalScore = resultados.fiscal.aproveitandoTeto
      ? 95
      : resultados.fiscal.espacoDisponivelMensal === 0
      ? 80
      : 60;
  } else {
    if (plan.fiscal.tipoDeclaracao === "nao_sei") fiscalScore = 40;
    else if (plan.fiscal.tipoDeclaracao === "simplificada") fiscalScore = 65;
    else fiscalScore = 70;
  }

  const overall = Math.round((aaScore + lfScore + psScore + fiscalScore) / 4);
  return { aaScore, lfScore, psScore, fiscalScore, overall };
}

export function nivelScore(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: "Adequado", color: "#15803D", bg: "#DCFCE7" };
  if (score >= 50) return { label: "Atenção", color: "#B45309", bg: "#FEF3C7" };
  return { label: "Risco", color: "#B91C1C", bg: "#FEE2E2" };
}
