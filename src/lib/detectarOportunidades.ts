import type { Client } from "@/hooks/useClientStore";

export interface Oportunidade {
  id: string;
  tipo: "seguros" | "imoveis" | "viagens";
  clienteId: string;
  clienteNome: string;
  clientePerfil?: string;
  titulo: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  automatica: boolean;
  origem: string;
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function detectarOportunidades(
  clientes: Client[],
  plans: Record<string, Record<string, unknown>>
): Oportunidade[] {
  const ops: Oportunidade[] = [];

  for (const cliente of clientes) {
    const plan = plans[cliente.id];
    if (!plan) continue;

    const dc  = (plan.dados_cliente  as Record<string, unknown>) ?? {};
    const est = (plan.estrategia_inicial as Record<string, unknown>) ?? {};

    const filhos    = (dc.filhos as unknown[]) ?? [];
    const numFilhos = filhos.length || (Number(dc.numeroFilhos) || 0);
    const rendaMensal =
      (Number(dc.rendaMensal) || 0) +
      (dc.possuiImovelRenda ? Number(dc.rendaImovelMensal) || 0 : 0);
    const gastoCartao = Number(dc.gastoCartaoMensal) || 0;
    const perfil      = cliente.planSuitabilityPerfil ?? undefined;

    function push(
      op: Omit<Oportunidade, "clienteId" | "clienteNome" | "clientePerfil" | "automatica">
    ) {
      ops.push({ ...op, clienteId: cliente.id, clienteNome: cliente.nome, clientePerfil: perfil, automatica: true });
    }

    // ── SEGUROS ──────────────────────────────────────────────────────────────
    // Fonte: resultado salvo pela Ferramenta de Análise de Proteção e Sucessão.
    // Oportunidades de seguro só são geradas se a ferramenta foi executada.

    const seguroResult      = (est.seguro as Record<string, unknown>) ?? {};
    const capitalNecessario  = Number(seguroResult.totalNeed)     || 0;
    const capitalAtual       = Number(seguroResult.totalCoverage) || 0;
    const gap                = Math.max(0, capitalNecessario - capitalAtual);
    const ferramentaExecutada = capitalNecessario > 0;

    if (ferramentaExecutada) {
      if (gap > 0) {
        push({
          id: `${cliente.id}_gap_protecao`,
          tipo: "seguros",
          titulo: "Cobertura de proteção insuficiente",
          descricao: `Análise de proteção identificou gap de ${fmtBRL(gap)} na cobertura. Capital necessário: ${fmtBRL(capitalNecessario)} · Capital atual: ${fmtBRL(capitalAtual)}.`,
          prioridade: gap > 500000 ? "alta" : "media",
          origem: "Análise de Proteção e Sucessão",
        });
      }

      if (!seguroResult.temSeguroVida && numFilhos > 0) {
        push({
          id: `${cliente.id}_sem_seguro_vida`,
          tipo: "seguros",
          titulo: "Sem seguro de vida",
          descricao: `${numFilhos} dependente(s) sem cobertura de renda. Capital necessário: ${fmtBRL(capitalNecessario)}.`,
          prioridade: "alta",
          origem: "Análise de Proteção e Sucessão",
        });
      }

      if (!seguroResult.temSeguroInvalidez) {
        push({
          id: `${cliente.id}_sem_seguro_invalidez`,
          tipo: "seguros",
          titulo: "Sem seguro de invalidez",
          descricao: `Análise de proteção identificou ausência de cobertura para invalidez permanente.`,
          prioridade: "media",
          origem: "Análise de Proteção e Sucessão",
        });
      }
    }

    // RC Profissional — baseado na profissão da coleta, independente da ferramenta
    const profissao = String(dc.profissao ?? "").toLowerCase();
    const precisaRC = [
      "médico", "medico", "médica", "medica",
      "dentista", "advogado", "advogada", "consultor", "consultora",
    ].some((p) => profissao.includes(p));
    if (precisaRC) {
      push({
        id: `${cliente.id}_seguro_rc`,
        tipo: "seguros",
        titulo: "Seguro RC Profissional",
        descricao: `${String(dc.profissao ?? "")} — profissional com exposição a processos por erros profissionais.`,
        prioridade: "media",
        origem: "Coleta de Dados › Dados Pessoais",
      });
    }

    // ── IMÓVEIS ───────────────────────────────────────────────────────────────

    if (rendaMensal > 10000 && !dc.possuiImoveis) {
      push({
        id: `${cliente.id}_aquisicao_imovel`,
        tipo: "imoveis",
        titulo: "Potencial de aquisição imobiliária",
        descricao: `Renda de ${fmtBRL(rendaMensal)}/mês com capacidade de crédito imobiliário.`,
        prioridade: rendaMensal > 20000 ? "alta" : "media",
        origem: "Coleta de Dados › Situação Financeira",
      });
    }

    const ifData      = (est["if"] as Record<string, unknown>) ?? {};
    const objetivosIF = (ifData.objetivos as Array<Record<string, unknown>>) ?? [];
    const objImovel   = objetivosIF.find((o) => o.tipo === "casa");
    if (objImovel) {
      push({
        id: `${cliente.id}_objetivo_imovel`,
        tipo: "imoveis",
        titulo: "Objetivo de imóvel mapeado",
        descricao: `${String(objImovel.label ?? "Imóvel")} previsto para ${String(objImovel.mes ?? "")}/${String(objImovel.ano ?? "")} — ${fmtBRL(Number(objImovel.valorBRL) || 0)}. Avaliar crédito ou financiamento.`,
        prioridade: "media",
        origem: "Simulador de Liberdade Financeira",
      });
    }

    // ── VIAGENS E MILHAS ──────────────────────────────────────────────────────

    // Gestão de milhas — ÚNICO critério: gasto familiar >= R$ 25.000/mês no cartão
    if (gastoCartao >= 25000) {
      push({
        id: `${cliente.id}_gestao_milhas`,
        tipo: "viagens",
        titulo: "Gestão de Milhas Aéreas",
        descricao: `Gasto familiar de ${fmtBRL(gastoCartao)}/mês no cartão — perfil qualificado para gestão profissional de milhas aéreas.`,
        prioridade: "alta",
        origem: "Coleta de Dados › Situação Financeira",
      });
    }

    // Objetivos de viagem no Simulador IF — só com gasto >= R$ 25.000 no cartão
    const viagensObj = objetivosIF.filter((o) => o.tipo === "viagem");
    if (viagensObj.length > 0 && gastoCartao >= 25000) {
      push({
        id: `${cliente.id}_objetivo_viagem`,
        tipo: "viagens",
        titulo: "Projetos de Viagem com Potencial de Milhas",
        descricao: `${viagensObj.length} viagem(ns) planejada(s) na estratégia. Com gasto de ${fmtBRL(gastoCartao)}/mês no cartão, possível custeio via milhas acumuladas.`,
        prioridade: "alta",
        origem: "Simulador de Liberdade Financeira",
      });
    }
  }

  return ops;
}
