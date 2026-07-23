export interface AtivoInvestimento {
  id: string;
  label: string;
  classe: "renda_fixa" | "renda_variavel" | "exterior" | "cripto";
  qualidade: "bom" | "ruim";
  icone: string;
  cor: string;
}

export const ATIVOS_INVESTIMENTO: AtivoInvestimento[] = [
  // ─── RENDA FIXA ────────────────────────────────
  { id: "tesouro",             label: "Tesouro Direto",          classe: "renda_fixa",    qualidade: "bom",  icone: "ti-building-bank",  cor: "#1E40AF" },
  { id: "cdb",                 label: "CDB",                     classe: "renda_fixa",    qualidade: "bom",  icone: "ti-building-bank",  cor: "#1E40AF" },
  { id: "lci_lca",             label: "LCI / LCA",               classe: "renda_fixa",    qualidade: "bom",  icone: "ti-building-bank",  cor: "#1E40AF" },
  { id: "fundo_rf",            label: "Fundos de Renda Fixa",    classe: "renda_fixa",    qualidade: "bom",  icone: "ti-building-bank",  cor: "#1E40AF" },
  { id: "poupanca",            label: "Poupança",                classe: "renda_fixa",    qualidade: "ruim", icone: "ti-piggy-bank",     cor: "#B91C1C" },
  { id: "coe",                 label: "COE",                     classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },
  { id: "fundo_multimercado",  label: "Fundos Multimercado",     classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },
  { id: "fundo_alternativo",   label: "Fundos Alternativos",     classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },
  { id: "fundo_cetipado",      label: "Fundos Cetipados",        classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },
  { id: "produto_estruturado", label: "Produtos Estruturados",   classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },
  { id: "cri_cra",             label: "CRI / CRA",               classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },
  { id: "debentures",          label: "Debêntures",              classe: "renda_fixa",    qualidade: "ruim", icone: "ti-alert-circle",   cor: "#B91C1C" },

  // ─── RENDA VARIÁVEL ─────────────────────────────
  { id: "acoes",               label: "Ações",                   classe: "renda_variavel", qualidade: "bom", icone: "ti-trending-up",    cor: "#15803D" },
  { id: "fiis",                label: "Fundos Imobiliários (FIIs)", classe: "renda_variavel", qualidade: "bom", icone: "ti-building",    cor: "#15803D" },
  { id: "etfs",                label: "ETFs",                    classe: "renda_variavel", qualidade: "bom", icone: "ti-chart-bar",      cor: "#15803D" },
  { id: "fundo_acoes",         label: "Fundos de Ações",         classe: "renda_variavel", qualidade: "ruim", icone: "ti-alert-circle",  cor: "#B91C1C" },
  { id: "fiagro",              label: "Fiagro",                  classe: "renda_variavel", qualidade: "ruim", icone: "ti-alert-circle",  cor: "#B91C1C" },

  // ─── EXTERIOR ───────────────────────────────────
  { id: "exterior",            label: "Investimentos no Exterior", classe: "exterior",     qualidade: "bom", icone: "ti-world",          cor: "#B45309" },

  // ─── CRIPTO ─────────────────────────────────────
  { id: "cripto",              label: "Criptomoedas",            classe: "cripto",         qualidade: "bom", icone: "ti-currency-bitcoin", cor: "#6D28D9" },
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
];
