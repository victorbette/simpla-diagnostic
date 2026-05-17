import type { SimplaCardId } from "./segmentos";

export type { SimplaCardId };

export interface Ativo {
  id: string;
  card: SimplaCardId;
  segmento: string;
  nome: string;
  vencimento?: string;
  posicaoBRL?: number;
  cotacaoBRL?: number;
  cotacaoUSD?: number;
  quantidade?: number;
  valorBRL: number;
  pctCarteira: number;
  pctMeta?: number;
  valorMetaBRL?: number;
}

export interface ItemPlanoAcao {
  id: string;
  card: SimplaCardId;
  nomeAtivo: string;
  segmento: string;
  tipo: "manter" | "aportar" | "resgatar_parcial" | "resgatar_total" | "novo_ativo";
  valorAtualBRL: number;
  valorMetaBRL: number;
  movimentacaoBRL: number;
  observacao: string;
  prioridade: "alta" | "media" | "baixa";
}

export interface CarteiraResultado {
  clientId: string;
  patrimonio: number;
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  planoAcao: ItemPlanoAcao[];
  notaConsultor: string;
  dataElaboracao: string;
  usdBrl: number;
}

export interface MacroResumo {
  rendaFixa: number;
  rendaVariavelBrasil: number;
  internacional: number;
  multimercados: number;
  cripto: number;
}
