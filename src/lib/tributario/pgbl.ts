import type {
  CenarioComparativoTributario,
  PontoProjecaoPgbl,
  ResultadoComparativoTributario,
  ResultadoPgbl,
  TipoDeclaracao,
} from './types'
import {
  DEDUCAO_DEPENDENTE_ANUAL,
  LIMITE_DESPESA_INSTRUCAO_ANUAL_POR_PESSOA,
  aliquotaEfetiva,
  calcularDescontoSimplificado,
  calcularIrAnual,
} from './irpf'

/** Fração da renda bruta anual dedutível via PGBL na declaração completa. */
export const TETO_PGBL_FRACAO = 0.12

/**
 * Taxa nominal da projeção: IPCA ~4% + retorno real ~5% = 9% a.a.
 * Conservadora de propósito — a diferença entre as duas trajetórias é o que importa.
 */
export const TAXA_NOMINAL_PROJECAO_PGBL = 0.09

const TAXA_MENSAL_PROJECAO = Math.pow(1 + TAXA_NOMINAL_PROJECAO_PGBL, 1 / 12) - 1

export interface EntradaPgbl {
  hoje: Date
  tipoDeclaracao: TipoDeclaracao
  rendaAnualBruta: number
  inssPago: number
  despesasMedicas: number
  despesasInstrucao: number
  dependentes: number
  aporteAnualPgbl: number
  pensaoAlimenticia: number
  irRetidoFonte: number
  saldoPrevidencia: number
  idadeAtual: number
  idadeMeta: number
}

type SimulacaoDeclaracao = Pick<
  ResultadoPgbl,
  | 'baseSemPgbl'
  | 'irSemPgbl'
  | 'aliquotaEfetivaSem'
  | 'tetoPgbl'
  | 'aporteEfetivo'
  | 'baseComPgbl'
  | 'irComPgbl'
  | 'aliquotaEfetivaCom'
  | 'economiaAnual'
  | 'deducoesLegais'
  | 'irRetidoFonte'
  | 'saldoSemPgbl'
  | 'saldoComPgbl'
>

function deducoesLegaisCompleta(e: Pick<EntradaPgbl, 'inssPago' | 'despesasMedicas' | 'despesasInstrucao' | 'pensaoAlimenticia' | 'dependentes'>): number {
  const dependentes = Math.max(0, Math.trunc(Number(e.dependentes) || 0))
  const inss = Math.max(0, Number(e.inssPago) || 0)
  const despesasMedicas = Math.max(0, Number(e.despesasMedicas) || 0)
  const pensao = Math.max(0, Number(e.pensaoAlimenticia) || 0)
  const tetoInstrucao = LIMITE_DESPESA_INSTRUCAO_ANUAL_POR_PESSOA * (1 + dependentes)
  const despesasInstrucao = Math.min(Math.max(0, Number(e.despesasInstrucao) || 0), tetoInstrucao)
  return inss + despesasMedicas + despesasInstrucao + pensao + dependentes * DEDUCAO_DEPENDENTE_ANUAL
}

/**
 * A declaração com e sem PGBL.
 * - `simplificada`: desconto padrão de 20%, PGBL não deduz.
 * - `comparativo` / `nao_sei` / `''`: tratado como completa para a simulação.
 */
export function simularDeclaracao(e: EntradaPgbl): SimulacaoDeclaracao {
  const rendaBruta = Math.max(0, Number(e.rendaAnualBruta) || 0)
  const aporteInformado = Math.max(0, Number(e.aporteAnualPgbl) || 0)
  const irRetidoFonte = Math.max(0, Number(e.irRetidoFonte) || 0)
  const simplificada = e.tipoDeclaracao === 'simplificada'

  const deducoesLegais = deducoesLegaisCompleta(e)
  const baseSemPgbl = simplificada
    ? Math.max(0, rendaBruta - calcularDescontoSimplificado(rendaBruta))
    : Math.max(0, rendaBruta - deducoesLegais)

  const irSemPgbl = calcularIrAnual(baseSemPgbl, rendaBruta)
  const tetoPgbl = rendaBruta * TETO_PGBL_FRACAO

  const aporteEfetivo = simplificada ? 0 : aporteInformado > 0 ? Math.min(aporteInformado, tetoPgbl) : tetoPgbl

  const baseComPgbl = simplificada ? baseSemPgbl : Math.max(0, baseSemPgbl - aporteEfetivo)
  const irComPgbl = simplificada ? irSemPgbl : calcularIrAnual(baseComPgbl, rendaBruta)

  return {
    baseSemPgbl,
    irSemPgbl,
    aliquotaEfetivaSem: aliquotaEfetiva(irSemPgbl, rendaBruta),
    tetoPgbl,
    aporteEfetivo,
    baseComPgbl,
    irComPgbl,
    aliquotaEfetivaCom: aliquotaEfetiva(irComPgbl, rendaBruta),
    economiaAnual: Math.max(0, irSemPgbl - irComPgbl),
    deducoesLegais: simplificada ? calcularDescontoSimplificado(rendaBruta) : deducoesLegais,
    irRetidoFonte,
    saldoSemPgbl: irSemPgbl - irRetidoFonte,
    saldoComPgbl: irComPgbl - irRetidoFonte,
  }
}

const LABEL_CENARIO: Record<CenarioComparativoTributario['id'], string> = {
  completa_sem_pgbl: 'Completa sem PGBL',
  completa_com_pgbl: 'Completa com PGBL',
  simplificada: 'Simplificada',
}

/**
 * Compara Completa × Simplificada: qual é mais vantajoso, e o PGBL muda a resposta?
 */
export function compararModelosDeclaracao(e: EntradaPgbl): ResultadoComparativoTributario {
  const completa = simularDeclaracao({ ...e, tipoDeclaracao: 'completa' })
  const simplificada = simularDeclaracao({ ...e, tipoDeclaracao: 'simplificada' })

  const cenarios: CenarioComparativoTributario[] = [
    {
      id: 'completa_sem_pgbl',
      label: LABEL_CENARIO.completa_sem_pgbl,
      deducoes: completa.deducoesLegais,
      base: completa.baseSemPgbl,
      imposto: completa.irSemPgbl,
      aliquotaEfetiva: completa.aliquotaEfetivaSem,
      saldo: completa.saldoSemPgbl,
    },
  ]
  if (completa.aporteEfetivo > 0) {
    cenarios.push({
      id: 'completa_com_pgbl',
      label: LABEL_CENARIO.completa_com_pgbl,
      deducoes: completa.deducoesLegais + completa.aporteEfetivo,
      base: completa.baseComPgbl,
      imposto: completa.irComPgbl,
      aliquotaEfetiva: completa.aliquotaEfetivaCom,
      saldo: completa.saldoComPgbl,
    })
  }
  cenarios.push({
    id: 'simplificada',
    label: LABEL_CENARIO.simplificada,
    deducoes: simplificada.deducoesLegais,
    base: simplificada.baseSemPgbl,
    imposto: simplificada.irSemPgbl,
    aliquotaEfetiva: simplificada.aliquotaEfetivaSem,
    saldo: simplificada.saldoSemPgbl,
  })

  const ordenados = [...cenarios].sort((a, b) => a.imposto - b.imposto)
  const melhor = ordenados[0]
  const segundo = ordenados[1]

  return {
    cenarios,
    melhorId: melhor.id,
    diferencaAnual: segundo ? segundo.imposto - melhor.imposto : 0,
  }
}

export function anosDeProjecao(idadeAtual: number, idadeMeta: number): number {
  return idadeAtual > 0 ? Math.max(1, idadeMeta - idadeAtual) : 0
}

export function projetarPatrimonioPgbl(e: EntradaPgbl, economiaAnual: number, aporteEfetivo: number): PontoProjecaoPgbl[] {
  const nAnos = anosDeProjecao(e.idadeAtual, e.idadeMeta)
  const pontos: PontoProjecaoPgbl[] = []
  let saldoSem = Math.max(0, Number(e.saldoPrevidencia) || 0)
  let saldoCom = saldoSem
  const aporteMensal = aporteEfetivo / 12
  const restituicaoMensal = economiaAnual / 12

  for (let ano = 0; ano <= nAnos; ano++) {
    pontos.push({ ano, idade: e.idadeAtual + ano, semPgbl: Math.round(saldoSem), comPgbl: Math.round(saldoCom) })
    for (let mes = 0; mes < 12; mes++) {
      saldoSem = saldoSem * (1 + TAXA_MENSAL_PROJECAO) + aporteMensal
      saldoCom = saldoCom * (1 + TAXA_MENSAL_PROJECAO) + aporteMensal + restituicaoMensal
    }
  }
  return pontos
}

export function mesesRestantesNoAno(hoje: Date): number {
  const mesAtual = hoje.getMonth() + 1
  return Math.max(0, 12 - mesAtual + 1)
}

export function calcularResultadoPgbl(e: EntradaPgbl): ResultadoPgbl {
  const sim = simularDeclaracao(e)
  const aporteInformado = Math.max(0, Number(e.aporteAnualPgbl) || 0)
  const temTeto = sim.tetoPgbl > 0

  const aproveitamentoPct = temTeto ? Math.min(100, Math.round((aporteInformado / sim.tetoPgbl) * 100)) : 0
  const excedenteAnual = temTeto ? Math.max(0, aporteInformado - sim.tetoPgbl) : 0
  const espacoDisponivelAnual = temTeto ? Math.max(0, sim.tetoPgbl - aporteInformado) : 0
  const mesesRestantes = mesesRestantesNoAno(e.hoje)
  const aporteMensalDisponivel =
    mesesRestantes > 0 && espacoDisponivelAnual > 0 ? espacoDisponivelAnual / mesesRestantes : 0

  const projecao =
    temTeto && sim.economiaAnual > 0 ? projetarPatrimonioPgbl(e, sim.economiaAnual, sim.aporteEfetivo) : []
  const ultimo = projecao[projecao.length - 1]
  const diferencaFinal = ultimo ? ultimo.comPgbl - ultimo.semPgbl : 0

  return {
    ...sim,
    aproveitamentoPct,
    excedenteAnual,
    espacoDisponivelAnual,
    mesesRestantes,
    aporteMensalDisponivel,
    projecao,
    diferencaFinal,
  }
}
