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

    const dc   = (plan.dados_cliente  as Record<string, unknown>) ?? {};
    const prot = (plan.protecao       as Record<string, unknown>) ?? {};
    const suc  = (plan.sucessorio     as Record<string, unknown>) ?? {};
    const est  = (plan.estrategia_inicial as Record<string, unknown>) ?? {};

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

    const capitalVida     = Number(prot.capitalSeguradoVida)     || 0;
    const capitalInvalidez = Number(prot.capitalSeguradoInvalidez) || 0;
    const capitalNecessario = rendaMensal * 12 * 15;
    const capitalAtual      = capitalVida + capitalInvalidez;
    const gapProtecao       = capitalNecessario - capitalAtual;

    if (gapProtecao > 50000 && numFilhos > 0) {
      push({
        id: `${cliente.id}_gap_protecao`,
        tipo: "seguros",
        titulo: "Gap de proteção identificado",
        descricao: `Cobertura insuficiente de ${fmtBRL(gapProtecao)}. ${numFilhos} dependente(s) sem cobertura adequada de renda.`,
        prioridade: gapProtecao > 500000 ? "alta" : "media",
        origem: "Coleta de Dados › Proteção",
      });
    }

    if (!prot.possuiSeguroVida && numFilhos > 0) {
      push({
        id: `${cliente.id}_sem_seguro_vida`,
        tipo: "seguros",
        titulo: "Sem seguro de vida",
        descricao: `${numFilhos} dependente(s) sem cobertura de renda em caso de falecimento ou invalidez.`,
        prioridade: "alta",
        origem: "Coleta de Dados › Proteção",
      });
    }

    if (!prot.possuiSeguroInvalidez && rendaMensal > 5000) {
      push({
        id: `${cliente.id}_sem_seguro_invalidez`,
        tipo: "seguros",
        titulo: "Sem seguro de invalidez",
        descricao: `Renda de ${fmtBRL(rendaMensal)}/mês sem proteção contra invalidez.`,
        prioridade: "media",
        origem: "Coleta de Dados › Proteção",
      });
    }

    const profissao = String(dc.profissao ?? "").toLowerCase();
    const precisaRC = ["médico", "medico", "dentista", "advogado", "consultor"].some((p) =>
      profissao.includes(p)
    );
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

    const qtdImoveis = Number(dc.quantidadeImoveis) || 0;
    if (qtdImoveis >= 2 && !suc.possuiHolding) {
      push({
        id: `${cliente.id}_holding_imoveis`,
        tipo: "imoveis",
        titulo: "Holding patrimonial para imóveis",
        descricao: `${qtdImoveis} imóveis próprios sem estrutura de holding. Oportunidade de proteção e planejamento sucessório.`,
        prioridade: "alta",
        origem: "Coleta de Dados › Situação Financeira",
      });
    }

    const ifData      = (est.if as Record<string, unknown>) ?? {};
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

    if (gastoCartao >= 10000) {
      push({
        id: `${cliente.id}_gestao_milhas`,
        tipo: "viagens",
        titulo: "Gestão de milhas aéreas",
        descricao: `Gasto de ${fmtBRL(gastoCartao)}/mês no cartão. Potencial de ${Math.round((gastoCartao * 12) / 100)}k+ milhas/ano com programa otimizado.`,
        prioridade: gastoCartao >= 25000 ? "alta" : "media",
        origem: "Coleta de Dados › Situação Financeira",
      });
    }

    if (dc.fazViagensInternacionais && !prot.temOutroSeguro) {
      push({
        id: `${cliente.id}_seguro_viagem`,
        tipo: "viagens",
        titulo: "Seguro viagem internacional",
        descricao: `${Number(dc.viagensInternacionaisQtdAnual) || 1} viagem(ns) internacionais/ano sem seguro. Exposição a custos médicos no exterior.`,
        prioridade: "media",
        origem: "Coleta de Dados › Situação Financeira",
      });
    }

    const viagensObj = objetivosIF.filter((o) => o.tipo === "viagem");
    if (viagensObj.length > 0 && gastoCartao >= 5000) {
      push({
        id: `${cliente.id}_objetivo_viagem`,
        tipo: "viagens",
        titulo: "Projetos de viagem mapeados",
        descricao: `${viagensObj.length} viagem(ns) planejada(s) na estratégia. Gasto de ${fmtBRL(gastoCartao)}/mês no cartão — potencial de acúmulo de milhas para custeio.`,
        prioridade: "media",
        origem: "Simulador de Liberdade Financeira",
      });
    }
  }

  return ops;
}
