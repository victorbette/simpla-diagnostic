export type MacroClassKey =
  | "rf_pos"
  | "rf_inflacao"
  | "multi"
  | "rv"
  | "internacional"
  | "cripto";

export interface MacroClasse {
  key: MacroClassKey;
  label: string;
  color: string;
}

export const MACRO_CLASSES: MacroClasse[] = [
  { key: "rf_pos",        label: "RF Pós / Liquidez",  color: "#2563EB" },
  { key: "rf_inflacao",   label: "RF Inflação",        color: "#1E293B" },
  { key: "multi",         label: "Multimercados",      color: "#0EA5E9" },
  { key: "rv",            label: "Renda Variável BR",  color: "#10B981" },
  { key: "internacional", label: "Internacional",      color: "#F59E0B" },
  { key: "cripto",        label: "Cripto",             color: "#8B5CF6" },
];

export type MacroAlocacao = Record<MacroClassKey, number>;

export const macroVazia = (): MacroAlocacao => ({
  rf_pos: 0, rf_inflacao: 0, multi: 0, rv: 0, internacional: 0, cripto: 0,
});

export interface AtivoItem {
  id: string;
  klass: MacroClassKey;
  subclasse: string;
  nome: string;
  segmento?: string;
  vencimento?: string;
  cotacaoBRL?: number;
  cotacaoUSD?: number;
  quantidade?: number;
  posicaoBRL?: number;
  pctAtual: number;
  pctMeta: number;
}

export interface PlanoAcaoItem {
  ativoId: string;
  nomeAtivo: string;
  klass: MacroClassKey;
  acao: "manter" | "aportar" | "resgatar_parcial" | "resgatar_total" | "novo";
  valorAtualBRL: number;
  valorMetaBRL: number;
  movimentacaoBRL: number;
  observacao: string;
}

export interface CarteiraResultado {
  patrimonio: number;
  ativosAtuais: AtivoItem[];
  ativosMeta: AtivoItem[];
  macroAtual: MacroAlocacao;
  macroMeta: MacroAlocacao;
  planoAcao: PlanoAcaoItem[];
  observacoes: string;
}
