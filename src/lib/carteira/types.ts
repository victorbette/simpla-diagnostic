export type ClasseAtivo =
  | "rf_rapido"
  | "rf_longo"
  | "rv_acoes"
  | "rv_fiis"
  | "internacional_rv"
  | "internacional_rf"
  | "multi"
  | "cripto";

export interface ClasseMeta {
  key: ClasseAtivo;
  label: string;
  grupo: string;
  cor: string;
  inputTipo: "posicao_brl" | "qtde_cotacao_brl" | "qtde_cotacao_usd";
}

export const CLASSES: ClasseMeta[] = [
  { key: "rf_rapido",        label: "Resgate Rápido",  grupo: "Renda Fixa",            cor: "#2563EB", inputTipo: "posicao_brl" },
  { key: "rf_longo",         label: "Resgate Longo",   grupo: "Renda Fixa",            cor: "#1E293B", inputTipo: "posicao_brl" },
  { key: "rv_acoes",         label: "Ações",           grupo: "Renda Variável Brasil", cor: "#16A34A", inputTipo: "qtde_cotacao_brl" },
  { key: "rv_fiis",          label: "FIIs",            grupo: "Renda Variável Brasil", cor: "#15803D", inputTipo: "qtde_cotacao_brl" },
  { key: "internacional_rv", label: "RV Exterior",     grupo: "Internacional",         cor: "#D97706", inputTipo: "qtde_cotacao_usd" },
  { key: "internacional_rf", label: "RF Exterior",     grupo: "Internacional",         cor: "#B45309", inputTipo: "posicao_brl" },
  { key: "multi",            label: "Multimercados",   grupo: "Multimercados",         cor: "#7C3AED", inputTipo: "posicao_brl" },
  { key: "cripto",           label: "Criptoativos",    grupo: "Criptoativos",          cor: "#EA580C", inputTipo: "qtde_cotacao_brl" },
];

export const GRUPOS = [
  "Renda Fixa",
  "Renda Variável Brasil",
  "Internacional",
  "Multimercados",
  "Criptoativos",
] as const;

export type GrupoAtivo = (typeof GRUPOS)[number];

export const GRUPO_CORES: Record<GrupoAtivo, string> = {
  "Renda Fixa": "#2563EB",
  "Renda Variável Brasil": "#16A34A",
  Internacional: "#D97706",
  Multimercados: "#7C3AED",
  Criptoativos: "#EA580C",
};

export interface Ativo {
  id: string;
  classe: ClasseAtivo;
  nome: string;
  segmento?: string;
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
  classe: ClasseAtivo;
  nomeAtivo: string;
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
