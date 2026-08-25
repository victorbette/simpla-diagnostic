export type QualidadeAtivo = "muito_atrativo" | "atrativo" | "moderado" | "pouco_atrativo" | "nada_atrativo";

export interface AtivoInvestimento {
  id: string;
  label: string;
  classe: "renda_fixa" | "renda_variavel" | "exterior" | "cripto" | "alternativos";
  qualidade: QualidadeAtivo;
  icone: string;
  cor: string;
}

export interface NivelAtratividade {
  label: string;
  cor: string;
  bg: string;
  border: string;
  estrelas: number;
}

export const NIVEIS_ATRATIVIDADE: Record<QualidadeAtivo, NivelAtratividade> = {
  muito_atrativo: { label: "Muito Atrativo",        cor: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", estrelas: 5 },
  atrativo:       { label: "Atrativo",               cor: "#16A34A", bg: "#ECFDF5", border: "#A7F3D0", estrelas: 4 },
  moderado:       { label: "Atratividade Moderada",  cor: "#B45309", bg: "#FEF3C7", border: "#FCD34D", estrelas: 3 },
  pouco_atrativo: { label: "Pouco Atrativo",         cor: "#C2410C", bg: "#FFF7ED", border: "#FDBA74", estrelas: 2 },
  nada_atrativo:  { label: "Nada Atrativo",          cor: "#B91C1C", bg: "#FFF5F5", border: "#FCA5A5", estrelas: 1 },
};

export const ATIVOS_INVESTIMENTO: AtivoInvestimento[] = [
  // ─── RENDA FIXA ────────────────────────────────────────────────────
  { id: "tesouro_selic",  label: "Tesouro Selic",            classe: "renda_fixa",    qualidade: "muito_atrativo", icone: "ti-building-bank", cor: "#15803D" },
  { id: "ipca_curto",     label: "IPCA Curto (até 5 anos)",  classe: "renda_fixa",    qualidade: "atrativo",       icone: "ti-building-bank", cor: "#16A34A" },
  { id: "ipca_longo",     label: "IPCA Longo (+ de 5 anos)", classe: "renda_fixa",    qualidade: "pouco_atrativo", icone: "ti-building-bank", cor: "#C2410C" },
  { id: "prefixado",      label: "Prefixado",                 classe: "renda_fixa",    qualidade: "nada_atrativo",  icone: "ti-building-bank", cor: "#B91C1C" },
  { id: "fundo_rf",       label: "Fundos de Investimento",    classe: "renda_fixa",    qualidade: "atrativo",       icone: "ti-chart-bar",     cor: "#16A34A" },
  { id: "cdb",            label: "CDB",                       classe: "renda_fixa",    qualidade: "moderado",       icone: "ti-building",      cor: "#B45309" },
  { id: "lci_lca",        label: "LCI / LCA",                 classe: "renda_fixa",    qualidade: "moderado",       icone: "ti-building",      cor: "#B45309" },
  { id: "cri_cra",        label: "CRI / CRA",                 classe: "renda_fixa",    qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "debentures",     label: "Debêntures",                classe: "renda_fixa",    qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "poupanca",       label: "Poupança",                  classe: "renda_fixa",    qualidade: "nada_atrativo",  icone: "ti-piggy-bank",    cor: "#B91C1C" },

  // ─── RENDA VARIÁVEL ─────────────────────────────────────────────────
  { id: "acoes",          label: "Ações (Blue Chips)",         classe: "renda_variavel", qualidade: "moderado",       icone: "ti-trending-up",   cor: "#B45309" },
  { id: "small_caps",     label: "Small Caps",                 classe: "renda_variavel", qualidade: "pouco_atrativo", icone: "ti-trending-up",   cor: "#C2410C" },
  { id: "fiis",           label: "FIIs (Papel)",               classe: "renda_variavel", qualidade: "moderado",       icone: "ti-building",      cor: "#B45309" },
  { id: "fii_tijolo",     label: "FIIs (Tijolo)",              classe: "renda_variavel", qualidade: "pouco_atrativo", icone: "ti-building",      cor: "#C2410C" },
  { id: "etfs",           label: "ETFs",                       classe: "renda_variavel", qualidade: "atrativo",       icone: "ti-chart-bar",     cor: "#16A34A" },
  { id: "fundo_acoes",    label: "Fundos de Ações",            classe: "renda_variavel", qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "fiagro",         label: "Fiagro",                     classe: "renda_variavel", qualidade: "moderado",       icone: "ti-plant",         cor: "#B45309" },

  // ─── EXTERIOR ──────────────────────────────────────────────────────
  { id: "renda_fixa_eua", label: "Renda Fixa EUA",            classe: "exterior",       qualidade: "atrativo",       icone: "ti-world",         cor: "#16A34A" },
  { id: "stocks",         label: "Stocks",                     classe: "exterior",       qualidade: "moderado",       icone: "ti-trending-up",   cor: "#B45309" },
  { id: "reits",          label: "REITs",                      classe: "exterior",       qualidade: "pouco_atrativo", icone: "ti-building",      cor: "#C2410C" },
  { id: "outros_paises",  label: "Outros Países",              classe: "exterior",       qualidade: "nada_atrativo",  icone: "ti-world-off",     cor: "#B91C1C" },

  // ─── CRIPTO ────────────────────────────────────────────────────────
  { id: "cripto",         label: "Bitcoin / Criptomoedas",    classe: "cripto",         qualidade: "moderado",       icone: "ti-currency-bitcoin", cor: "#B45309" },

  // ─── ALTERNATIVOS ───────────────────────────────────────────────────
  { id: "fundo_multimercado",  label: "Fundos Multimercado",    classe: "alternativos",  qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "fundo_cetipado",      label: "Fundos Cetipados",       classe: "alternativos",  qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "fundo_alternativo",   label: "Fundos Alternativos",    classe: "alternativos",  qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "produto_estruturado", label: "Produtos Estruturados",  classe: "alternativos",  qualidade: "pouco_atrativo", icone: "ti-alert-circle",  cor: "#C2410C" },
  { id: "coe",                 label: "COE",                    classe: "alternativos",  qualidade: "nada_atrativo",  icone: "ti-alert-circle",  cor: "#B91C1C" },
];

export const CLASSES_INVESTIMENTO: {
  classe: AtivoInvestimento["classe"];
  label: string;
  cor: string;
}[] = [
  { classe: "renda_fixa",    label: "Renda Fixa",     cor: "#1E40AF" },
  { classe: "renda_variavel", label: "Renda Variável", cor: "#15803D" },
  { classe: "exterior",      label: "Exterior",        cor: "#B45309" },
  { classe: "cripto",        label: "Cripto",          cor: "#6D28D9" },
  { classe: "alternativos",  label: "Alternativos",    cor: "#B91C1C" },
];
