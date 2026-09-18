export type TipoDeclaracao = 'completa' | 'simplificada' | 'comparativo' | 'nao_sei' | ''

export interface PontoProjecaoPgbl {
  ano: number
  idade: number
  semPgbl: number
  comPgbl: number
}

export interface ResultadoPgbl {
  baseSemPgbl: number
  irSemPgbl: number
  aliquotaEfetivaSem: number
  tetoPgbl: number
  aporteEfetivo: number
  baseComPgbl: number
  irComPgbl: number
  aliquotaEfetivaCom: number
  economiaAnual: number
  /** 0–100. */
  aproveitamentoPct: number
  excedenteAnual: number
  espacoDisponivelAnual: number
  mesesRestantes: number
  aporteMensalDisponivel: number
  projecao: PontoProjecaoPgbl[]
  diferencaFinal: number
  /** Deduções usadas na declaração (legais + PGBL no modo completa, desconto padrão na simplificada). */
  deducoesLegais: number
  irRetidoFonte: number
  /** Imposto devido − retido. Positivo = a pagar; negativo = a restituir. */
  saldoSemPgbl: number
  saldoComPgbl: number
}

export interface CenarioComparativoTributario {
  id: 'completa_sem_pgbl' | 'completa_com_pgbl' | 'simplificada'
  label: string
  deducoes: number
  base: number
  imposto: number
  aliquotaEfetiva: number
  saldo: number
}

export interface ResultadoComparativoTributario {
  cenarios: CenarioComparativoTributario[]
  melhorId: CenarioComparativoTributario['id']
  diferencaAnual: number
}
