/** Taxa usada no Diagnóstico Inicial (score + texto comparativo): IPCA+5% */
export const TAXA_DIAGNOSTICO_INICIAL = 0.05;

/** Taxa usada na aba LF e no gráfico/cards do relatório LF: IPCA+6% */
export const TAXA_LF_PADRAO = 0.06;

export const taxaMensalDe = (taxaAnual: number): number =>
  Math.pow(1 + taxaAnual, 1 / 12) - 1;
