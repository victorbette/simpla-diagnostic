import type { Ativo, CardId } from "@/lib/carteira/types";
import type { PlanoAcaoItem } from "@/types/estrategiaResultados";

/**
 * Monta a carteira final ativo a ativo a partir do plano de ação: aplica
 * aportes/resgates sobre os valores atuais e descarta resgates totais.
 * Usada na Etapa 2 (Seção Gestão de Ativos) e no documento impresso
 * ("Como sua carteira deverá ficar").
 */
export function montarCarteiraFinal(
  planoAcao: PlanoAcaoItem[],
  ativosRecomendados: Ativo[],
  ativosAtuais?: Ativo[],
): Ativo[] {
  return (planoAcao ?? []).flatMap((item) => {
    if (!item.card) return [];
    const acao = item.acao ?? item.tipo ?? "";

    if (acao === "portabilidade") {
      const dest = item.portabilidadeDestino;
      if (!dest?.nome || (dest.valor ?? 0) <= 0) return [];
      return [{
        id: `previdencia-portab-${item.id}`,
        card: "previdencia" as CardId,
        nome: dest.nome,
        segmento: dest.tipo || "VGBL",
        valorBRL: dest.valor,
      } satisfies Ativo];
    }

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
        return [];
      default:
        valorFinal = item.valorAtualBRL ?? 0;
    }
    if (valorFinal <= 0) return [];
    const cardId = item.card as CardId;
    const base = (ativosRecomendados ?? []).find((a) => a.nome === item.nomeAtivo && a.card === cardId);
    const atual = (ativosAtuais ?? []).find((a) => a.nome === item.nomeAtivo && a.card === cardId);
    return [{
      id: base?.id ?? `${cardId}-${item.nomeAtivo}`,
      card: cardId,
      nome: item.nomeAtivo,
      segmento: item.segmento ?? base?.segmento ?? "",
      vencimento: item.vencimento?.trim() ? item.vencimento : (atual?.vencimento?.trim() ? atual.vencimento : base?.vencimento),
      valorBRL: valorFinal,
    } satisfies Ativo];
  });
}
