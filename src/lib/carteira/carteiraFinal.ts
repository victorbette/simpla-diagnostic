import type { Ativo, CardId } from "@/lib/carteira/types";
import type { PlanoAcaoItem } from "@/types/estrategiaResultados";

/**
 * Monta a carteira final ativo a ativo a partir do plano de ação: aplica
 * aportes/resgates sobre os valores atuais e descarta resgates totais.
 * Usada na Etapa 2 (Seção Asset Allocation) e no documento impresso
 * ("Como sua carteira deverá ficar").
 */
export function montarCarteiraFinal(
  planoAcao: PlanoAcaoItem[],
  ativosRecomendados: Ativo[],
): Ativo[] {
  return (planoAcao ?? [])
    .map((item) => {
      if (!item.card) return null;
      const acao = item.acao ?? item.tipo ?? "";
      let valorFinal = 0;
      switch (acao) {
        case "novo":
        case "aportar":
          valorFinal = (item.valorAtualBRL ?? 0) + (item.movimentacaoEditada ?? item.movimentacaoBRL ?? 0);
          break;
        case "manter":
          valorFinal = item.valorAtualBRL ?? 0;
          break;
        case "resgatar_parcial": {
          const resgate = item.valorResgateBRL !== undefined
            ? item.valorResgateBRL
            : Math.abs(item.movimentacaoBRL ?? 0);
          valorFinal = Math.max(0, (item.valorAtualBRL ?? 0) - resgate);
          break;
        }
        case "resgatar_total":
          return null;
        default:
          valorFinal = item.valorAtualBRL ?? 0;
      }
      if (valorFinal <= 0) return null;
      const cardId = item.card as CardId;
      const base = (ativosRecomendados ?? []).find((a) => a.nome === item.nomeAtivo && a.card === cardId);
      return {
        id: base?.id ?? `${cardId}-${item.nomeAtivo}`,
        card: cardId,
        nome: item.nomeAtivo,
        segmento: item.segmento ?? base?.segmento ?? "",
        vencimento: base?.vencimento,
        valorBRL: valorFinal,
      } satisfies Ativo;
    })
    .filter(Boolean) as Ativo[];
}
