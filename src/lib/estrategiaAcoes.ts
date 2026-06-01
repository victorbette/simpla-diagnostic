import { formatCurrency } from "@/lib/format";
import {
  calcularIF,
  calcularAlocacaoAtual,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
  calcularFiscal,
} from "@/types/financialPlanning";
import { calcularPerfilHolding } from "@/lib/holding";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

export type PrioridadeAcao = "alta" | "media" | "baixa";

export interface AcaoEstrategia {
  id: string;
  texto: string;
  prioridade: PrioridadeAcao;
  area: string;
  areaColor: string;
}

export function gerarAcoes(
  plan: FinancialPlan,
  resultados: ResultadosEstrategia,
): AcaoEstrategia[] {
  const acoes: AcaoEstrategia[] = [];
  const dc = plan.dadosCliente;
  const pp = plan.protecao;
  const ps = plan.sucessorio;
  const pf = plan.fiscal;
  const pi = plan.planejamentoIF;

  // ── ASSET ALLOCATION ────────────────────────────────────────────────────────
  const perfil = dc.suitabilityPerfil;
  if (resultados.carteira) {
    if (perfil && !dc.comecandoDoZero) {
      const alocAtual = calcularAlocacaoAtual(plan.ativosAtuais);
      const meta = ALOCACAO_ALVO[perfil];
      const chaves = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"] as const;
      const temDesvio = chaves.some((k) => Math.abs(alocAtual[k] - meta[k]) > 5);
      if (temDesvio) {
        acoes.push({
          id: "aa_rebalancear",
          texto: "Rebalancear carteira conforme alocação recomendada",
          prioridade: "alta",
          area: "Asset Allocation",
          areaColor: "#000000",
        });
      }
    }
    if (dc.comecandoDoZero) {
      const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "adequado";
      acoes.push({
        id: "aa_montar",
        texto: `Definir carteira inicial seguindo perfil ${perfilLabel}`,
        prioridade: "alta",
        area: "Asset Allocation",
        areaColor: "#000000",
      });
    }
  } else {
    acoes.push({
      id: "aa_mapear",
      texto: "Montar carteira de investimentos detalhada",
      prioridade: "alta",
      area: "Asset Allocation",
      areaColor: "#000000",
    });
  }

  // ── LIBERDADE FINANCEIRA ─────────────────────────────────────────────────────
  if (pi.rendaMensalDesejada > 0) {
    if (resultados.if) {
      if (resultados.if.gapRenda > 0) {
        acoes.push({
          id: "lf_aporte",
          texto:
            `Aumentar aporte mensal de ${formatCurrency(resultados.if.aporteAtual)} ` +
            `para ${formatCurrency(resultados.if.aporteAjustado)} ` +
            `para atingir a IF aos ${pi.idadeMeta} anos`,
          prioridade: "alta",
          area: "Liberdade Financeira",
          areaColor: "#15803D",
        });
      }
      if ((resultados.if.objetivos ?? []).length > 0) {
        acoes.push({
          id: "lf_objetivos",
          texto: "Revisar objetivos de vida e impacto no patrimônio",
          prioridade: "media",
          area: "Liberdade Financeira",
          areaColor: "#15803D",
        });
      }
    } else {
      const simples = calcularIF(pi);
      if (simples.gap > 0) {
        acoes.push({
          id: "lf_aporte",
          texto: `Aumentar aporte mensal para atingir a IF aos ${pi.idadeMeta} anos`,
          prioridade: "alta",
          area: "Liberdade Financeira",
          areaColor: "#15803D",
        });
      }
    }
  }

  // ── PROTEÇÃO E SUCESSÓRIO ────────────────────────────────────────────────────
  if (resultados.seguro && resultados.seguro.gap > 0) {
    acoes.push({
      id: "ps_gap_seguro",
      texto: `Contratar seguro de vida — gap de ${formatCurrency(resultados.seguro.gap)} na cobertura`,
      prioridade: "alta",
      area: "Proteção e Sucessório",
      areaColor: "#B91C1C",
    });
  } else if (!pp.possuiSeguroVida) {
    acoes.push({
      id: "ps_seguro_vida",
      texto: "Analisar necessidade de seguro de vida",
      prioridade: "alta",
      area: "Proteção e Sucessório",
      areaColor: "#B91C1C",
    });
  }

  if (!pp.possuiSeguroInvalidez) {
    acoes.push({
      id: "ps_invalidez",
      texto: "Analisar necessidade de seguro de invalidez",
      prioridade: "media",
      area: "Proteção e Sucessório",
      areaColor: "#B91C1C",
    });
  }

  if (!pp.possuiPlanoSaude) {
    acoes.push({
      id: "ps_saude",
      texto: "Contratar plano de saúde",
      prioridade: "alta",
      area: "Proteção e Sucessório",
      areaColor: "#B91C1C",
    });
  }

  if (!ps.possuiTestamento && (dc.patrimonioTotalEstimado ?? 0) > 500_000) {
    acoes.push({
      id: "ps_testamento",
      texto: "Elaborar testamento para planejamento sucessório",
      prioridade: "media",
      area: "Proteção e Sucessório",
      areaColor: "#B91C1C",
    });
  }

  if (!ps.possuiHolding) {
    const holdingPerfil = calcularPerfilHolding(
      { ...dc, temEmpresa: pf.temEmpresa },
      ps,
    );
    if (holdingPerfil.recomendada) {
      acoes.push({
        id: "ps_holding",
        texto: "Avaliar constituição de holding patrimonial",
        prioridade: "alta",
        area: "Proteção e Sucessório",
        areaColor: "#B91C1C",
      });
    }
  }

  // ── PLANEJAMENTO FISCAL ──────────────────────────────────────────────────────
  let pgblAdicionado = false;

  if (
    resultados.fiscal &&
    resultados.fiscal.espacoDisponivelMensal > 0 &&
    pf.tipoDeclaracao === "completa"
  ) {
    acoes.push({
      id: "fis_pgbl",
      texto: `Abrir/aumentar PGBL — espaço disponível de ${formatCurrency(resultados.fiscal.espacoDisponivelMensal)}/mês`,
      prioridade: "alta",
      area: "Planejamento Fiscal",
      areaColor: "#2563EB",
    });
    pgblAdicionado = true;
  } else if (!resultados.fiscal && pf.tipoDeclaracao === "completa") {
    const rf = calcularFiscal(pf);
    if (rf.espacoPGBL > 0 && !dc.possuiPrevidencia) {
      acoes.push({
        id: "fis_pgbl",
        texto: "Avaliar abertura de PGBL para diferimento fiscal",
        prioridade: "media",
        area: "Planejamento Fiscal",
        areaColor: "#2563EB",
      });
      pgblAdicionado = true;
    }
  }

  if (!pgblAdicionado && pf.tipoDeclaracao === "nao_sei") {
    acoes.push({
      id: "fis_declaracao",
      texto: "Definir modelo de declaração IR (completa ou simplificada)",
      prioridade: "media",
      area: "Planejamento Fiscal",
      areaColor: "#2563EB",
    });
  }

  if (pf.temRendimentosIsentos && pf.tipoDeclaracao === "simplificada") {
    acoes.push({
      id: "fis_migracao",
      texto: "Avaliar migração para declaração completa",
      prioridade: "media",
      area: "Planejamento Fiscal",
      areaColor: "#2563EB",
    });
  }

  if (pf.temEmpresa && !ps.possuiHolding) {
    acoes.push({
      id: "fis_empresa",
      texto: "Verificar eficiência tributária da estrutura empresarial",
      prioridade: "media",
      area: "Planejamento Fiscal",
      areaColor: "#2563EB",
    });
  }

  return acoes;
}
