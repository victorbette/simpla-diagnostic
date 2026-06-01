import type { DadosCliente, PlanejamentoSucessorio } from "@/types/financialPlanning";

export interface PerfilHolding {
  recomendada: boolean;
  score: number;
  motivos: string[];
  alertas: string[];
}

type DadosHolding = Pick<
  DadosCliente,
  | "patrimonioTotalEstimado"
  | "tipoTrabalho"
  | "possuiImovelRenda"
  | "possuiImoveis"
  | "quantidadeImoveis"
  | "filhos"
> & { temEmpresa?: boolean };

type SucessorioHolding = Pick<
  PlanejamentoSucessorio,
  "possuiHolding" | "maisDeUmaEmpresa" | "possuiSocios"
>;

export function calcularPerfilHolding(
  dc: DadosHolding,
  ps: SucessorioHolding,
): PerfilHolding {
  if (ps.possuiHolding) {
    return {
      recomendada: false,
      score: 100,
      motivos: ["Cliente já possui holding constituída"],
      alertas: ["Verificar se a estrutura atual está atualizada"],
    };
  }

  let pontos = 0;
  const motivos: string[] = [];
  const alertas: string[] = [];

  const patrimonioTotal = dc.patrimonioTotalEstimado ?? 0;

  if (patrimonioTotal >= 1_000_000) {
    pontos += 25;
    motivos.push("Patrimônio relevante (acima de R$ 1M)");
  } else if (patrimonioTotal >= 500_000) {
    pontos += 10;
    alertas.push("Patrimônio pode crescer e justificar holding futura");
  }

  if (dc.tipoTrabalho === "empresario") {
    pontos += 25;
    motivos.push("Empresário — proteção patrimonial essencial");
  } else if (dc.tipoTrabalho === "autonomo") {
    pontos += 15;
    motivos.push("Profissional liberal — blindagem jurídica recomendada");
  }

  if (dc.temEmpresa) {
    pontos += 15;
    motivos.push("Possui empresa (CNPJ)");
  }

  if (ps.maisDeUmaEmpresa) {
    pontos += 15;
    motivos.push("Mais de uma empresa — gestão centralizada via holding");
  }

  if (dc.possuiImovelRenda) {
    pontos += 10;
    motivos.push("Imóveis geradores de renda para proteger");
  }

  if (dc.possuiImoveis) {
    const qtd = Number(dc.quantidadeImoveis) || 0;
    if (qtd >= 3) {
      pontos += 20;
      motivos.push(`${qtd} imóveis próprios — holding patrimonial altamente recomendada`);
    } else if (qtd === 2) {
      pontos += 15;
      motivos.push("2 imóveis próprios — proteção e sucessão via holding");
    } else if (qtd === 1) {
      pontos += 5;
      alertas.push("1 imóvel — holding pode ser avaliada se patrimônio crescer");
    }
  }

  if ((dc.filhos ?? []).length > 0) {
    pontos += 10;
    motivos.push("Tem herdeiros — planejamento sucessório relevante");
  }

  if (ps.possuiSocios) {
    pontos += 10;
    motivos.push("Possui sócios — blindagem e governança necessárias");
  }

  const score = Math.min(100, pontos);
  const recomendada = score >= 40;

  if (!dc.temEmpresa && !dc.possuiImovelRenda && !dc.possuiImoveis) {
    alertas.push("Sem empresa ou imóveis — holding pode não ser necessária agora");
  }
  if (patrimonioTotal < 500_000) {
    alertas.push("Patrimônio ainda baixo — reavaliar no futuro");
  }

  return { recomendada, score, motivos, alertas };
}
