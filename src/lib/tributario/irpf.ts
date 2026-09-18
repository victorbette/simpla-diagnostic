/**
 * Tabela progressiva anual do IRPF e o redutor de 2026.
 *
 * Fonte única de verdade para o cálculo de IR do Planejamento Tributário.
 * Conferida contra uma declaração de ajuste anual real com recibo entregue
 * (exercício 2026, ano-calendário 2025): Desconto Simplificado R$ 16.754,34,
 * Base R$ 141.844,48, Imposto R$ 28.153,45, Alíquota 17,75% — todos bateram.
 */

export const IRPF_ANO = 2026

/** Dedução anual por dependente na declaração completa. */
export const DEDUCAO_DEPENDENTE_ANUAL = 2275.08

/** Desconto padrão da declaração simplificada (20% da renda, limitado a este teto anual). */
export const DESCONTO_SIMPLIFICADO_ANUAL = 16754.34

/**
 * Limite anual de dedução com despesas de instrução por pessoa — titular OU cada
 * dependente, individualmente. Despesas médicas não têm teto.
 */
export const LIMITE_DESPESA_INSTRUCAO_ANUAL_POR_PESSOA = 3561.5

export function calcularDescontoSimplificado(rendaBruta: number): number {
  return Math.min(Math.max(0, rendaBruta) * 0.2, DESCONTO_SIMPLIFICADO_ANUAL)
}

export interface FaixaIrpf {
  limite: number
  aliquota: number
  deducao: number
}

/** Tabela anual 2026 — base de cálculo → alíquota e parcela a deduzir. */
export const TABELA_IRPF_ANUAL_2026: readonly FaixaIrpf[] = [
  { limite: 28467.2,   aliquota: 0,     deducao: 0        },
  { limite: 33919.8,   aliquota: 0.075, deducao: 2135.04  },
  { limite: 45012.6,   aliquota: 0.15,  deducao: 4679.03  },
  { limite: 55976.16,  aliquota: 0.225, deducao: 8054.97  },
  { limite: Infinity,  aliquota: 0.275, deducao: 10853.78 },
]

/** Renda bruta anual até a qual o redutor de 2026 zera o imposto. */
export const REDUTOR_2026_ISENCAO_ATE = 60000

/** Renda bruta anual a partir da qual o redutor de 2026 deixa de existir. */
export const REDUTOR_2026_FIM = 88200

/**
 * Redutor de 2026: isenção total até R$ 60 mil de renda bruta, redução linear
 * até R$ 88,2 mil, imposto integral acima disso.
 */
export function calcularRedutorAnual2026(rendaBruta: number, irCalculado: number): number {
  if (rendaBruta <= REDUTOR_2026_ISENCAO_ATE) return 0
  if (rendaBruta <= REDUTOR_2026_FIM) {
    const proporcao = (REDUTOR_2026_FIM - rendaBruta) / (REDUTOR_2026_FIM - REDUTOR_2026_ISENCAO_ATE)
    const redutor = irCalculado * proporcao
    return Math.max(0, irCalculado - redutor)
  }
  return irCalculado
}

/**
 * Imposto anual sobre a base de cálculo. Quando `rendaBruta` é informada,
 * aplica o redutor de 2026.
 */
export function calcularIrAnual(baseCalculo: number, rendaBruta?: number): number {
  if (baseCalculo <= 0) return 0
  let ir = 0
  for (const faixa of TABELA_IRPF_ANUAL_2026) {
    if (baseCalculo <= faixa.limite) {
      ir = Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao)
      break
    }
  }
  if (rendaBruta !== undefined) {
    ir = calcularRedutorAnual2026(rendaBruta, ir)
  }
  return ir
}

/** Alíquota efetiva em pontos percentuais (imposto ÷ base × 100). */
export function aliquotaEfetiva(ir: number, base: number): number {
  if (base <= 0) return 0
  return (ir / base) * 100
}
