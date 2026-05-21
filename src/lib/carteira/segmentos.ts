export type SimplaCardId =
  | "resgate_rapido"
  | "resgate_longo"
  | "acoes"
  | "fiis"
  | "exterior"
  | "cripto";

export interface SimplaCard {
  id: SimplaCardId;
  label: string;
  grupo: string;
  cor: string;
  segmentos: string[];
  segmentoPadrao: string;
  inputTipo: "posicao_brl" | "qtde_cotacao_brl" | "qtde_cotacao_usd";
}

export const SIMPLA_CARDS: SimplaCard[] = [
  {
    id: "resgate_rapido",
    label: "Resgate Rápido",
    grupo: "Renda Fixa",
    cor: "#2A4F6A",
    segmentos: ["Pós-fixado"],
    segmentoPadrao: "Pós-fixado",
    inputTipo: "posicao_brl",
  },
  {
    id: "resgate_longo",
    label: "Resgate Longo",
    grupo: "Renda Fixa",
    cor: "#000000",
    segmentos: ["Pós-fixado", "Prefixado", "Inflação", "Fundos RF", "Fundos MM", "COE"],
    segmentoPadrao: "Inflação",
    inputTipo: "posicao_brl",
  },
  {
    id: "acoes",
    label: "Ações",
    grupo: "Renda Variável Brasil",
    cor: "#3D6B41",
    segmentos: [],
    segmentoPadrao: "",
    inputTipo: "qtde_cotacao_brl",
  },
  {
    id: "fiis",
    label: "Fundos Imobiliários",
    grupo: "Renda Variável Brasil",
    cor: "#4A6B3D",
    segmentos: [],
    segmentoPadrao: "",
    inputTipo: "qtde_cotacao_brl",
  },
  {
    id: "exterior",
    label: "Exterior",
    grupo: "Internacional",
    cor: "#8A7A45",
    segmentos: ["Renda Variável", "Renda Fixa"],
    segmentoPadrao: "Renda Variável",
    inputTipo: "qtde_cotacao_usd",
  },
  {
    id: "cripto",
    label: "Cripto",
    grupo: "Criptoativos",
    cor: "#BBA866",
    segmentos: [],
    segmentoPadrao: "",
    inputTipo: "qtde_cotacao_brl",
  },
];

export const getCard = (id: SimplaCardId): SimplaCard => {
  const card = SIMPLA_CARDS.find((c) => c.id === id);
  if (!card) {
    console.error(`[getCard] card não encontrado para id: "${id}"`);
    return {
      id: id as SimplaCardId,
      label: id,
      grupo: "Desconhecido",
      cor: "#6B6347",
      segmentos: [],
      segmentoPadrao: "",
      inputTipo: "posicao_brl",
    };
  }
  return card;
};

export const cardsPorGrupo = (): Record<string, SimplaCard[]> => {
  const map: Record<string, SimplaCard[]> = {};
  for (const card of SIMPLA_CARDS) {
    if (!map[card.grupo]) map[card.grupo] = [];
    map[card.grupo].push(card);
  }
  return map;
};

export const segmentoPadrao = (cardId: SimplaCardId): string =>
  getCard(cardId).segmentoPadrao;

export const cardTemSegmentos = (cardId: SimplaCardId): boolean =>
  getCard(cardId).segmentos.length > 0;
