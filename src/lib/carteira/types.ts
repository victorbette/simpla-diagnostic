export type CardId =
  | 'resgate_longo'
  | 'resgate_rapido'
  | 'acoes'
  | 'fiis'
  | 'exterior'
  | 'cripto'
  | 'alternativos'
  | 'previdencia';

export interface Ativo {
  id: string;
  card: CardId;
  nome: string;
  segmento: string;
  vencimento?: string;
  valorBRL: number;
  quantidade?: number;    // cotas/ações (RV only)
  cotacaoAtual?: number;  // preço unitário — BRL para BR, USD para exterior/cripto
  adicionadoManualmente?: boolean;
  observacao?: string;
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
  movimentacaoEditada?: number;
  vencimento?: string;
  observacao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  valorResgateBRL?: number;
  adicionadoManualmente?: boolean;
}

export interface CarteiraResultado {
  patrimonio: number;
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  aporteDisponivel?: number;
  custoVidaMensal?: number;
  notasConsultor?: string;
}

export const CARD_META = {
  resgate_longo:  { label: 'Resgate Longo',       sub: 'Pós-fixado · Inflação · Prefixado', cor: '#1E40AF', corBg: '#EFF6FF', icone: 'ti-building-bank',      segmentos: ['Pós-fixado','Inflação','Prefixado','Fundos RF','Fundos MM','COE'], temVencimento: true  },
  resgate_rapido: { label: 'Resgate Rápido',       sub: 'Liquidez imediata',                 cor: '#2563EB', corBg: '#DBEAFE', icone: 'ti-coins',              segmentos: ['Pós-fixado'],                                                    temVencimento: true  },
  acoes:          { label: 'Ações',                sub: 'Renda variável brasileira',          cor: '#15803D', corBg: '#DCFCE7', icone: 'ti-trending-up',        segmentos: [],                                                               temVencimento: false },
  fiis:           { label: 'Fundos Imobiliários',  sub: 'FIIs listados na B3',               cor: '#059669', corBg: '#D1FAE5', icone: 'ti-building',           segmentos: [],                                                               temVencimento: false },
  exterior:       { label: 'Exterior',             sub: 'Renda Variável · Renda Fixa',       cor: '#B45309', corBg: '#FEF3C7', icone: 'ti-world',              segmentos: ['Renda Variável','Renda Fixa'],                                   temVencimento: false },
  cripto:         { label: 'Cripto',               sub: 'Criptoativos',                      cor: '#1D4ED8', corBg: '#EFF6FF', icone: 'ti-currency-bitcoin',   segmentos: [],                                                               temVencimento: false },
  alternativos:   { label: 'Alternativos',         sub: 'Hedge funds · Private equity · COE', cor: '#7C3AED', corBg: '#F3E8FF', icone: 'ti-chart-infographic',  segmentos: ['Hedge Fund','Multimercado','Private Equity','COE','Estruturado'], temVencimento: false },
  previdencia:    { label: 'Previdência Privada',  sub: 'PGBL · VGBL',                       cor: '#0284C7', corBg: '#E0F2FE', icone: 'ti-piggy-bank',          segmentos: ['PGBL','VGBL'],                                                    temVencimento: false },
} as const;

export const CARD_ORDER: CardId[] = ['resgate_longo','resgate_rapido','acoes','fiis','exterior','cripto','alternativos','previdencia'];

/** Agrupamento macro (Renda Fixa / Renda Variável) → subclasses por CardId */
export const HIERARQUIA_CLASSES: ReadonlyArray<{
  id: string;
  label: string;
  cor: string;
  corBg: string;
  icone: string;
  subclasses: ReadonlyArray<{ cardId: CardId; label: string }>;
}> = [
  {
    id: 'renda_fixa', label: 'Renda Fixa', cor: '#1E40AF', corBg: '#EFF6FF', icone: 'ti-building-bank',
    subclasses: [
      { cardId: 'resgate_longo',  label: 'Resgate Longo' },
      { cardId: 'resgate_rapido', label: 'Resgate Rápido' },
    ],
  },
  {
    id: 'renda_variavel', label: 'Renda Variável', cor: '#15803D', corBg: '#F0FDF4', icone: 'ti-trending-up',
    subclasses: [
      { cardId: 'acoes',    label: 'Ações' },
      { cardId: 'fiis',     label: 'Fundos Imobiliários' },
      { cardId: 'exterior', label: 'Exterior' },
      { cardId: 'cripto',   label: 'Cripto' },
    ],
  },
  {
    id: 'alternativos', label: 'Alternativos', cor: '#7C3AED', corBg: '#F3E8FF', icone: 'ti-chart-infographic',
    subclasses: [
      { cardId: 'alternativos', label: 'Alternativos' },
    ],
  },
  {
    id: 'previdencia_privada', label: 'Previdência Privada', cor: '#0284C7', corBg: '#E0F2FE', icone: 'ti-piggy-bank',
    subclasses: [
      { cardId: 'previdencia', label: 'Previdência Privada' },
    ],
  },
];

export const SEGMENTOS_POR_CLASSE: Partial<Record<CardId, string[]>> = {
  acoes:   ['Bancos','Seguradora','Agronegócio','Commodities','Educação','Construção Civil','Saúde','Shopping','Telecomunicação','Energia','Diverso'],
  fiis:    ['Papel','Galpões Log.','Híbrido','Lajes Corp.','Shopping','Fiagro','Recebíveis','FOF'],
  exterior: ['ETF RV','ETF RF','Stocks','REITs','Bonds','Mutual Funds'],
};

export const ALOCACAO_PADRAO: Record<string, Record<CardId, number>> = {
  conservador:          { resgate_longo: 42, resgate_rapido: 50, acoes: 2, fiis: 2, exterior: 4,    cripto: 0,   alternativos: 0, previdencia: 0 },
  conservador_moderado: { resgate_longo: 43, resgate_rapido: 35, acoes: 7, fiis: 6, exterior: 9,    cripto: 0,   alternativos: 0, previdencia: 0 },
  moderado:             { resgate_longo: 41, resgate_rapido: 25, acoes: 13,fiis: 7, exterior: 13,   cripto: 1,   alternativos: 0, previdencia: 0 },
  arrojado:             { resgate_longo: 37, resgate_rapido: 15, acoes: 20,fiis: 9, exterior: 17.5, cripto: 1.5, alternativos: 0, previdencia: 0 },
};
