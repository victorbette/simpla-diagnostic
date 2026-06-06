// Tabelas oficiais Receita Federal 2026

const TABELA_MENSAL = [
  { limite: 2428.80,  aliquota: 0,     deducao: 0      },
  { limite: 2826.65,  aliquota: 0.075, deducao: 182.16 },
  { limite: 3751.05,  aliquota: 0.15,  deducao: 394.16 },
  { limite: 4664.68,  aliquota: 0.225, deducao: 675.49 },
  { limite: Infinity, aliquota: 0.275, deducao: 908.73 },
];

const TABELA_ANUAL = [
  { limite: 29145.60,  aliquota: 0,     deducao: 0        },
  { limite: 33919.80,  aliquota: 0.075, deducao: 2185.92  },
  { limite: 45012.60,  aliquota: 0.15,  deducao: 4729.91  },
  { limite: 55976.16,  aliquota: 0.225, deducao: 8105.85  },
  { limite: Infinity,  aliquota: 0.275, deducao: 10904.66 },
];

// INSS 2025 — tabela progressiva (cada faixa aplica sobre a parcela do salário)
const TABELA_INSS = [
  { from: 0,       to: 1518.00, rate: 0.075 },
  { from: 1518.00, to: 2793.88, rate: 0.09  },
  { from: 2793.88, to: 4190.83, rate: 0.12  },
  { from: 4190.83, to: 8157.41, rate: 0.14  },
];

export const TETO_INSS_MENSAL          = 908.86;
export const DEDUCAO_DEPENDENTE_MENSAL = 189.59;
export const DEDUCAO_DEPENDENTE_ANUAL  = 2275.08;
export const DESCONTO_SIMPLIFICADO_MENSAL = 607.20;
export const DESCONTO_SIMPLIFICADO_ANUAL  = 16754.34;
export const LIMITE_INSTRUCAO_ANUAL       = 3561.50;

export function calcularINSSMensalCLT(rendaMensal: number): number {
  if (rendaMensal <= 0) return 0;
  let total = 0;
  for (const { from, to, rate } of TABELA_INSS) {
    if (rendaMensal <= from) break;
    total += (Math.min(rendaMensal, to) - from) * rate;
  }
  return Math.min(total, TETO_INSS_MENSAL);
}

export function calcularIR(
  base: number,
  tabela: typeof TABELA_ANUAL,
): { ir: number; aliquotaEfetiva: number; faixa: number } {
  if (base <= 0) return { ir: 0, aliquotaEfetiva: 0, faixa: 0 };
  const idx = tabela.findIndex(f => base <= f.limite);
  const t = tabela[idx === -1 ? tabela.length - 1 : idx];
  const ir = Math.max(0, base * t.aliquota - t.deducao);
  return { ir, aliquotaEfetiva: base > 0 ? (ir / base) * 100 : 0, faixa: idx === -1 ? tabela.length - 1 : idx };
}

export function calcularIR_mensal(base: number) { return calcularIR(base, TABELA_MENSAL); }
export function calcularIR_anual(base: number)  { return calcularIR(base, TABELA_ANUAL);  }

export function calcularBase(params: {
  rendaAnualBruta: number;
  tipoDeclaracao: 'completa' | 'simplificada';
  numeroDependentes: number;
  despesasInstrucao: number;
  contribuicaoINSS: number;
  aportePGBL?: number;
}): number {
  const { rendaAnualBruta, tipoDeclaracao, numeroDependentes,
          despesasInstrucao, contribuicaoINSS, aportePGBL = 0 } = params;

  if (tipoDeclaracao === 'simplificada') {
    return Math.max(0, rendaAnualBruta - DESCONTO_SIMPLIFICADO_ANUAL - aportePGBL);
  }

  const deducaoDependentes = numeroDependentes * DEDUCAO_DEPENDENTE_ANUAL;
  const deducaoInstrucao   = Math.min(despesasInstrucao, LIMITE_INSTRUCAO_ANUAL * (numeroDependentes + 1));

  return Math.max(0, rendaAnualBruta - deducaoDependentes - deducaoInstrucao - contribuicaoINSS - aportePGBL);
}

export interface ResultadoPGBL {
  baseCalculo_sem:     number;
  IR_sem:              number;
  aliquotaEfetiva_sem: number;
  limitePGBL:          number;
  aporteEfetivo:       number;
  baseCalculo_com:     number;
  IR_com:              number;
  aliquotaEfetiva_com: number;
  economiaAnual:       number;
  economiaMensal:      number;
  nAnos:               number;
  economiaAcumulada:   number;
  saldoPGBL_bruto:     number;
  IR_resgate:          number;
  saldoPGBL_liquido:   number;
  totalIR_sem:         number;
  totalIR_com:         number;
  ganhoFiscalTotal:    number;
  // backward-compat aliases for SecaoFiscal.tsx → ResultadoFiscal mapping
  rendaAnual:             number;
  tetoPGBLAnual:          number;
  aporteAnual:            number;
  irSemPGBL:              number;
  irComPGBL:              number;
  espacoDisponivelMensal: number;
  aproveitandoTeto:       boolean;
}

export function calcularPGBL(params: {
  rendaMensalBruta:   number;
  tipoDeclaracao:     'completa' | 'simplificada';
  numeroDependentes:  number;
  despesasInstrucao:  number;
  contribuicaoINSS:   number;   // annual
  aporteAnualPGBL:    number;
  rentabilidadeAnual: number;   // decimal, e.g. 0.08
  nAnos:              number;
}): ResultadoPGBL {
  const { rendaMensalBruta, tipoDeclaracao, numeroDependentes,
          despesasInstrucao, contribuicaoINSS, aporteAnualPGBL,
          rentabilidadeAnual, nAnos } = params;

  const rendaAnualBruta = rendaMensalBruta * 12;
  const limitePGBL      = rendaAnualBruta * 0.12;
  const aporteEfetivo   = Math.min(aporteAnualPGBL, limitePGBL);

  const baseArgs = { rendaAnualBruta, tipoDeclaracao, numeroDependentes, despesasInstrucao, contribuicaoINSS };

  const base_sem = calcularBase(baseArgs);
  const { ir: IR_sem, aliquotaEfetiva: ae_sem } = calcularIR_anual(base_sem);

  const base_com = calcularBase({ ...baseArgs, aportePGBL: aporteEfetivo });
  const { ir: IR_com, aliquotaEfetiva: ae_com } = calcularIR_anual(base_com);

  const economiaAnual  = Math.max(0, IR_sem - IR_com);
  const economiaMensal = economiaAnual / 12;

  let saldoPGBL = 0;
  let economiaAcumulada = 0;
  const n = Math.max(0, Math.round(nAnos));
  for (let i = 0; i < n; i++) {
    saldoPGBL = saldoPGBL * (1 + rentabilidadeAnual) + aporteEfetivo;
    economiaAcumulada += economiaAnual;
  }

  const IR_resgate        = saldoPGBL * 0.15;
  const saldoPGBL_liquido = saldoPGBL - IR_resgate;
  const totalIR_sem       = IR_sem * n;
  const totalIR_com       = IR_com * n + IR_resgate;
  const ganhoFiscalTotal  = Math.max(0, totalIR_sem - totalIR_com);

  return {
    baseCalculo_sem: base_sem, IR_sem, aliquotaEfetiva_sem: ae_sem,
    limitePGBL, aporteEfetivo,
    baseCalculo_com: base_com, IR_com, aliquotaEfetiva_com: ae_com,
    economiaAnual, economiaMensal,
    nAnos: n, economiaAcumulada,
    saldoPGBL_bruto: saldoPGBL, IR_resgate, saldoPGBL_liquido,
    totalIR_sem, totalIR_com, ganhoFiscalTotal,
    // backward-compat
    rendaAnual:             rendaAnualBruta,
    tetoPGBLAnual:          limitePGBL,
    aporteAnual:            aporteEfetivo,
    irSemPGBL:              IR_sem,
    irComPGBL:              IR_com,
    espacoDisponivelMensal: Math.max(0, (limitePGBL - aporteEfetivo) / 12),
    aproveitandoTeto:       aporteAnualPGBL >= limitePGBL && limitePGBL > 0,
  };
}
