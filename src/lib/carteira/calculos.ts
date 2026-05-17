import type { Ativo, ItemPlanoAcao, MacroResumo } from "./types";
import type { SimplaCardId } from "./segmentos";
import { SIMPLA_CARDS, getCard } from "./segmentos";

export function calcularValorBRL(ativo: Ativo, usdBrl = 5): number {
  const inputTipo = getCard(ativo.card).inputTipo;
  switch (inputTipo) {
    case "posicao_brl":
      return Number(ativo.posicaoBRL) || 0;
    case "qtde_cotacao_brl":
      return (Number(ativo.quantidade) || 0) * (Number(ativo.cotacaoBRL) || 0);
    case "qtde_cotacao_usd":
      return (Number(ativo.quantidade) || 0) * (Number(ativo.cotacaoUSD) || 0) * usdBrl;
    default:
      return 0;
  }
}

export function calcularPatrimonio(ativos: Ativo[], usdBrl = 5): number {
  return ativos.reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
}

export function atualizarPcts(ativos: Ativo[], usdBrl = 5): Ativo[] {
  const total = calcularPatrimonio(ativos, usdBrl);
  return ativos.map((a) => {
    const valorBRL = calcularValorBRL(a, usdBrl);
    return {
      ...a,
      valorBRL,
      pctCarteira: total > 0 ? Math.round((valorBRL / total) * 1000) / 10 : 0,
    };
  });
}

export function derivarMacroResumo(ativos: Ativo[], usdBrl = 5): MacroResumo {
  const total = calcularPatrimonio(ativos, usdBrl);
  if (total <= 0) return { rendaFixa: 0, rendaVariavelBrasil: 0, internacional: 0, multimercados: 0, cripto: 0 };

  function pctCards(cards: SimplaCardId[]): number {
    const sum = ativos
      .filter((a) => cards.includes(a.card))
      .reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
    return Math.round((sum / total) * 1000) / 10;
  }

  return {
    rendaFixa: pctCards(["resgate_rapido", "resgate_longo"]),
    rendaVariavelBrasil: pctCards(["acoes", "fiis"]),
    internacional: pctCards(["exterior"]),
    multimercados: 0, // multimercados is separate in v2
    cripto: pctCards(["cripto"]),
  };
}

type Perfil = "conservador" | "conservador_moderado" | "moderado" | "arrojado";

export const ALOCACAO_PADRAO: Record<Perfil, Record<SimplaCardId, number>> = {
  conservador: {
    resgate_rapido: 50, resgate_longo: 42, acoes: 2, fiis: 2, exterior: 4, cripto: 0,
  },
  conservador_moderado: {
    resgate_rapido: 35, resgate_longo: 43, acoes: 7, fiis: 6, exterior: 9, cripto: 0,
  },
  moderado: {
    resgate_rapido: 25, resgate_longo: 41, acoes: 13, fiis: 7, exterior: 13, cripto: 1,
  },
  arrojado: {
    resgate_rapido: 15, resgate_longo: 37, acoes: 20, fiis: 9, exterior: 17.5, cripto: 1.5,
  },
};

export function alocacaoPadraoPorPerfil(perfil: string): Record<SimplaCardId, number> {
  return ALOCACAO_PADRAO[perfil as Perfil] ?? {
    resgate_rapido: 0, resgate_longo: 0, acoes: 0, fiis: 0, exterior: 0, cripto: 0,
  };
}

let _idSeq = 0;
export function genId(): string {
  return `${Date.now().toString(36)}_${(++_idSeq).toString(36)}`;
}

export function ativosIniciais(perfil: string | null, patrimonio: number): Ativo[] {
  const padrao = perfil ? alocacaoPadraoPorPerfil(perfil) : null;
  return SIMPLA_CARDS.filter((c) => !padrao || padrao[c.id] > 0).map((c) => ({
    id: genId(),
    card: c.id,
    segmento: c.segmentoPadrao,
    nome: c.label,
    valorBRL: padrao ? (padrao[c.id] / 100) * patrimonio : 0,
    pctCarteira: 0,
    pctMeta: padrao ? padrao[c.id] : 0,
    valorMetaBRL: padrao ? (padrao[c.id] / 100) * patrimonio : 0,
  }));
}

export function gerarPlanoAcao(
  ativosAtuais: Ativo[],
  ativosRecomendados: Ativo[],
  patrimonio: number,
  usdBrl = 5,
): ItemPlanoAcao[] {
  const plano: ItemPlanoAcao[] = [];

  for (const rec of ativosRecomendados) {
    const atual = ativosAtuais.find(
      (a) => a.nome.trim().toLowerCase() === rec.nome.trim().toLowerCase()
    );
    const valorAtualBRL = atual ? calcularValorBRL(atual, usdBrl) : 0;
    const valorMetaBRL = ((rec.pctMeta ?? 0) / 100) * patrimonio;
    const mov = Math.round((valorMetaBRL - valorAtualBRL) * 100) / 100;

    let tipo: ItemPlanoAcao["tipo"] = "manter";
    if (!atual) tipo = "novo_ativo";
    else if (mov > 100) tipo = "aportar";
    else if (mov < -100) {
      tipo = Math.abs(mov) >= valorAtualBRL * 0.95 ? "resgatar_total" : "resgatar_parcial";
    }

    const abs = Math.abs(mov);
    const prioridade: ItemPlanoAcao["prioridade"] =
      abs > patrimonio * 0.1 ? "alta" : abs > patrimonio * 0.03 ? "media" : "baixa";

    plano.push({
      id: genId(),
      card: rec.card,
      segmento: rec.segmento,
      nomeAtivo: rec.nome,
      tipo,
      valorAtualBRL,
      valorMetaBRL,
      movimentacaoBRL: mov,
      observacao: "",
      prioridade,
    });
  }

  for (const atual of ativosAtuais) {
    const naMeta = ativosRecomendados.find(
      (r) => r.nome.trim().toLowerCase() === atual.nome.trim().toLowerCase()
    );
    if (!naMeta) {
      const vBRL = calcularValorBRL(atual, usdBrl);
      plano.push({
        id: genId(),
        card: atual.card,
        segmento: atual.segmento,
        nomeAtivo: atual.nome,
        tipo: "resgatar_total",
        valorAtualBRL: vBRL,
        valorMetaBRL: 0,
        movimentacaoBRL: -vBRL,
        observacao: "",
        prioridade: vBRL > patrimonio * 0.03 ? "media" : "baixa",
      });
    }
  }

  return plano;
}

// Re-export for convenience
export { SIMPLA_CARDS, getCard };

export const formatBRL = (n: number): string =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export const formatPct = (n: number, casas = 1): string =>
  `${(Number(n) || 0).toFixed(casas).replace(".", ",")}%`;
