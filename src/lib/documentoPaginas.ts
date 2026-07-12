/* Ordem canônica das páginas do documento "Estratégia Inicial".
 * Única fonte de verdade para numeração (sumário, rodapés, total).
 */
export const PAG = {
  capa: 1,
  disclaimer: 2,
  sumario: 3,
  perfil: 4,
  divisoriaLf: 5,
  lf: 6,
  divisoriaAa: 7,
  aa: 8,
  divisoriaPs: 9,
  ps: 10,
  divisoriaFiscal: 11,
  fiscal: 12,
  divisoriaAcao: 13,
  proximosPassos: 14,
  maosAObra: 15,
} as const;

export const TOTAL_PAGINAS = PAG.maosAObra;

/** Itens exibidos no sumário (aponta para a página de conteúdo de cada seção) */
export const ITENS_SUMARIO: ReadonlyArray<{ numero: number; label: string; pagina: number; preConteudo?: boolean }> = [
  { numero: 1,  label: "Capa",                  pagina: PAG.capa,           preConteudo: true },
  { numero: 2,  label: "Disclaimer",            pagina: PAG.disclaimer,     preConteudo: true },
  { numero: 3,  label: "Sumário",               pagina: PAG.sumario,        preConteudo: true },
  { numero: 4,  label: "Perfil do Investidor",  pagina: PAG.perfil,         preConteudo: true },
  { numero: 5,  label: "Liberdade Financeira",  pagina: PAG.divisoriaLf },
  { numero: 6,  label: "Asset Allocation",      pagina: PAG.divisoriaAa },
  { numero: 7,  label: "Proteção e Sucessório", pagina: PAG.divisoriaPs },
  { numero: 8,  label: "Planejamento Tributário", pagina: PAG.divisoriaFiscal },
  { numero: 9,  label: "Próximos Passos",       pagina: PAG.divisoriaAcao },
  { numero: 10, label: "Mãos à Obra",           pagina: PAG.maosAObra },
];
