export type CardId =
  | 'resgate_longo'
  | 'resgate_rapido'
  | 'acoes'
  | 'fiis'
  | 'exterior'
  | 'cripto';

export interface Ativo {
  id: string;
  card: CardId;
  nome: string;
  segmento: string;
  vencimento?: string;
  valorBRL: number;
  quantidade?: number;    // cotas/ações (RV only)
  cotacaoAtual?: number;  // preço unitário — BRL para BR, USD para exterior/cripto
}

export interface PlanoAcaoItem {
  id: string;
  card: CardId;
  nomeAtivo: string;
  segmento: string;
  acao: 'manter' | 'aportar' | 'resgatar_parcial' | 'resgatar_total' | 'novo';
  valorAtualBRL: number;
  valorMetaBRL: number;
  movimentacaoBRL: number;
  observacao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  valorResgateBRL?: number;
}

export interface CarteiraResultado {
  patrimonio: number;
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  aporteDisponivel?: number;
}

export const CARD_META = {
  resgate_longo:  { label: 'Resgate Longo',       sub: 'Pós-fixado · Inflação · Prefixado', cor: '#1E40AF', corBg: '#EFF6FF', icone: 'ti-building-bank',      segmentos: ['Pós-fixado','Inflação','Prefixado','Fundos RF','Fundos MM','COE'], temVencimento: true  },
  resgate_rapido: { label: 'Resgate Rápido',       sub: 'Liquidez imediata',                 cor: '#2563EB', corBg: '#DBEAFE', icone: 'ti-coins',              segmentos: ['Pós-fixado'],                                                    temVencimento: true  },
  acoes:          { label: 'Ações',                sub: 'Renda variável brasileira',          cor: '#15803D', corBg: '#DCFCE7', icone: 'ti-trending-up',        segmentos: [],                                                               temVencimento: false },
  fiis:           { label: 'Fundos Imobiliários',  sub: 'FIIs listados na B3',               cor: '#059669', corBg: '#D1FAE5', icone: 'ti-building',           segmentos: [],                                                               temVencimento: false },
  exterior:       { label: 'Exterior',             sub: 'Renda Variável · Renda Fixa',       cor: '#B45309', corBg: '#FEF3C7', icone: 'ti-world',              segmentos: ['Renda Variável','Renda Fixa'],                                   temVencimento: false },
  cripto:         { label: 'Cripto',               sub: 'Criptoativos',                      cor: '#1D4ED8', corBg: '#EFF6FF', icone: 'ti-currency-bitcoin',   segmentos: [],                                                               temVencimento: false },
} as const;

export const CARD_ORDER: CardId[] = ['resgate_longo','resgate_rapido','acoes','fiis','exterior','cripto'];

export const ALOCACAO_PADRAO: Record<string, Record<CardId, number>> = {
  conservador:          { resgate_longo: 42, resgate_rapido: 50, acoes: 2, fiis: 2, exterior: 4,    cripto: 0   },
  conservador_moderado: { resgate_longo: 43, resgate_rapido: 35, acoes: 7, fiis: 6, exterior: 9,    cripto: 0   },
  moderado:             { resgate_longo: 41, resgate_rapido: 25, acoes: 13,fiis: 7, exterior: 13,   cripto: 1   },
  arrojado:             { resgate_longo: 37, resgate_rapido: 15, acoes: 20,fiis: 9, exterior: 17.5, cripto: 1.5 },
};
