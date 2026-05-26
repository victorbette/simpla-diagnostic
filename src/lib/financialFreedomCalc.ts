import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";

export type LifeGoalTipo = "despesa" | "aporte";
export interface LifeGoal {
  id: string; nome: string; valor: number; idadeRealizacao: number;
  parcelado?: boolean; numeroParcelas?: number; ativo?: boolean;
  tipo?: LifeGoalTipo; categoriaId?: string;
}
export interface SimulationParams {
  idadeAtual: number; idadeAposentadoria: number; expectativaVida: number;
  patrimonioInicial: number; aporteMensal: number; rendaDesejada: number;
  rentabilidadeAnual: number; inflacaoAnual: number;
  rentabilidadeDecumulacaoMensal?: number; objetivos?: LifeGoal[];
}
export interface ProjectionPoint {
  idade: number; patrimonio: number; fase: "acumulacao" | "decumulacao";
  objetivoRealizado?: string; valorObjetivo?: number;
}
export interface SimulationResult {
  patrimonioAposentadoria: number; rendaSustentavel: number; gapRenda: number;
  liberdadeAlcancada: boolean; taxaReal: number; projecao: ProjectionPoint[];
  idadePatrimonioZero: number | null; aporteAjustado: number;
  projecaoSemObjetivos?: ProjectionPoint[];
}
export function calcularTaxaReal(taxaNominal: number, inflacao: number): number {
  return ((1 + taxaNominal) / (1 + inflacao)) - 1;
}
export function taxaAnualParaMensal(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}
export function calcularRendaSustentavel(saldo: number, taxaMensal: number, meses: number): number {
  if (saldo <= 0 || meses <= 0) return 0;
  if (taxaMensal === 0) return saldo / meses;
  return (saldo * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -meses));
}
export function calcularAporteNecessario(patrimonioAlvo: number, patrimonioInicial: number, taxaMensal: number, meses: number): number {
  if (meses <= 0) return 0;
  if (taxaMensal === 0) return (patrimonioAlvo - patrimonioInicial) / meses;
  const fator = Math.pow(1 + taxaMensal, meses);
  return Math.max(0, ((patrimonioAlvo - patrimonioInicial * fator) * taxaMensal) / (fator - 1));
}
export function simularLiberdadeFinanceira(params: SimulationParams): SimulationResult {
  const { idadeAtual, idadeAposentadoria, expectativaVida, patrimonioInicial,
    aporteMensal, rendaDesejada, rentabilidadeAnual, inflacaoAnual,
    rentabilidadeDecumulacaoMensal, objetivos = [] } = params;
  const taxaReal = calcularTaxaReal(rentabilidadeAnual, inflacaoAnual);
  const taxaMensalAcumulacao = taxaAnualParaMensal(taxaReal);
  const taxaMensalDecumulacao = rentabilidadeDecumulacaoMensal ?? taxaMensalAcumulacao;
  const mesesAposentadoria = (expectativaVida - idadeAposentadoria) * 12;
  const projecao: ProjectionPoint[] = [];
  const projecaoSemObjetivos: ProjectionPoint[] = [];
  let saldoAtual = patrimonioInicial;
  let saldoSemObjetivos = patrimonioInicial;
  const objetivosAVistaPorIdade = new Map<number, LifeGoal[]>();
  const parcelasAtivas = new Map<number, { nome: string; valorParcela: number; sinal: number }[]>();
  objetivos.forEach(obj => {
    const sinal = obj.tipo === "aporte" ? 1 : -1;
    if (obj.parcelado && obj.numeroParcelas && obj.numeroParcelas > 1) {
      const mesInicio = (obj.idadeRealizacao - idadeAtual) * 12;
      const valorParcela = obj.valor / obj.numeroParcelas;
      for (let p = 0; p < obj.numeroParcelas; p++) {
        const mesAtual = mesInicio + p;
        const lista = parcelasAtivas.get(mesAtual) || [];
        lista.push({ nome: obj.nome, valorParcela, sinal });
        parcelasAtivas.set(mesAtual, lista);
      }
    } else {
      const lista = objetivosAVistaPorIdade.get(obj.idadeRealizacao) || [];
      lista.push(obj);
      objetivosAVistaPorIdade.set(obj.idadeRealizacao, lista);
    }
  });
  projecao.push({ idade: idadeAtual, patrimonio: saldoAtual, fase: "acumulacao" });
  projecaoSemObjetivos.push({ idade: idadeAtual, patrimonio: saldoSemObjetivos, fase: "acumulacao" });
  let mesContador = 0;
  for (let ano = idadeAtual + 1; ano <= idadeAposentadoria; ano++) {
    for (let mes = 0; mes < 12; mes++) {
      mesContador++;
      saldoAtual = saldoAtual * (1 + taxaMensalAcumulacao) + aporteMensal;
      saldoSemObjetivos = saldoSemObjetivos * (1 + taxaMensalAcumulacao) + aporteMensal;
      const parcelas = parcelasAtivas.get(mesContador) || [];
      parcelas.forEach(p => { saldoAtual = Math.max(0, saldoAtual + p.sinal * p.valorParcela); });
    }
    const objetivosAno = objetivosAVistaPorIdade.get(ano) || [];
    let valorObjetivosAno = 0;
    const nomesObjetivosAno: string[] = [];
    objetivosAno.forEach(obj => {
      const sinal = obj.tipo === "aporte" ? 1 : -1;
      saldoAtual = Math.max(0, saldoAtual + sinal * obj.valor);
      valorObjetivosAno += sinal * obj.valor;
      nomesObjetivosAno.push(obj.nome);
    });
    projecao.push({ idade: ano, patrimonio: saldoAtual, fase: "acumulacao",
      objetivoRealizado: nomesObjetivosAno.length > 0 ? nomesObjetivosAno.join(", ") : undefined,
      valorObjetivo: valorObjetivosAno !== 0 ? valorObjetivosAno : undefined });
    projecaoSemObjetivos.push({ idade: ano, patrimonio: saldoSemObjetivos, fase: "acumulacao" });
  }
  const patrimonioAposentadoria = saldoAtual;
  const rendaSustentavel = calcularRendaSustentavel(patrimonioAposentadoria, taxaMensalDecumulacao, mesesAposentadoria);
  let idadePatrimonioZero: number | null = null;
  for (let ano = idadeAposentadoria + 1; ano <= expectativaVida; ano++) {
    for (let mes = 0; mes < 12; mes++) {
      saldoAtual = saldoAtual * (1 + taxaMensalDecumulacao) - rendaDesejada;
      saldoSemObjetivos = saldoSemObjetivos * (1 + taxaMensalDecumulacao) - rendaDesejada;
    }
    if (saldoAtual <= 0 && idadePatrimonioZero === null) idadePatrimonioZero = ano;
    projecao.push({ idade: ano, patrimonio: Math.max(0, saldoAtual), fase: "decumulacao" });
    projecaoSemObjetivos.push({ idade: ano, patrimonio: Math.max(0, saldoSemObjetivos), fase: "decumulacao" });
  }
  return {
    patrimonioAposentadoria, rendaSustentavel, gapRenda: rendaSustentavel - rendaDesejada,
    liberdadeAlcancada: rendaSustentavel >= rendaDesejada, taxaReal, projecao,
    idadePatrimonioZero, aporteAjustado: aporteMensal,
    projecaoSemObjetivos: objetivos.length > 0 ? projecaoSemObjetivos : undefined,
  };
}

// ─── Monthly IF projection engine ─────────────────────────────────────────────

/** One data point per month in the projection */
export interface PontoProjecao {
  mes: number;        // absolute month index from start (0-based)
  ano: number;        // calendar year
  mesDoAno: number;   // 1-12
  idade: number;      // decimal age, e.g. 43.5
  patrimonio: number;
  fase: "acumulacao" | "decumulacao";
}

export interface ProjecaoIFParams {
  idadeAtual: number;
  idadeMeta: number;
  idadeMaxima: number;
  patrimonioInicial: number;
  aporteMensal: number;
  rendaMensalDesejada: number;
  /** Real annual return rate as decimal — e.g. 0.06 for 6% a.a. real */
  taxaRetornoAnual: number;
  /** Birth year — used to assign calendar year/month to each data point */
  anoNascimento: number;
  /** Birth month 1-12 — projection starts on this month */
  mesNascimento: number;
  objetivos?: ObjetivoVida[];
}

export interface ProjecaoIFResult {
  projecao: PontoProjecao[];
  curvaIdeal: number[];
  patrimonioNaIF: number;
  /** PV of annuity: rendaMensal for (idadeMaxima - idadeMeta) × 12 months at 4% a.a. real */
  patrimonioNecessario: number;
  /** PMT: monthly withdrawal that exhausts patrimonioNaIF over (idadeMaxima - idadeMeta) × 12 months */
  rendaSustentavel: number;
  /** rendaMensalDesejada − rendaSustentavel (positive = falta renda) */
  gapRenda: number;
  ifAlcancada: boolean;
  aporteNecessario: number;
  aporteNecessarioSemObjetivos: number;
}

/** PV of annuity */
function pvAnuidade(rendaMensal: number, taxaMensalReal: number, meses: number): number {
  if (meses <= 0) return 0;
  if (Math.abs(taxaMensalReal) < 0.0001) return rendaMensal * meses;
  return rendaMensal * (1 - Math.pow(1 + taxaMensalReal, -meses)) / taxaMensalReal;
}

/** PMT: monthly withdrawal sustainable from patrimônio over n months */
function pmtMensal(patrimonio: number, taxaMensalReal: number, meses: number): number {
  if (meses <= 0) return 0;
  if (Math.abs(taxaMensalReal) < 0.0001) return patrimonio / meses;
  return patrimonio * taxaMensalReal / (1 - Math.pow(1 + taxaMensalReal, -meses));
}

/** Fixed 4% a.a. real for the withdrawal phase — conservative standard */
const TAXA_RETIRADA_ANUAL = 0.04;
const TAXA_RETIRADA_MENSAL = Math.pow(1 + TAXA_RETIRADA_ANUAL, 1 / 12) - 1; // ≈ 0.3274% a.m.

const EMPTY_RESULT: ProjecaoIFResult = {
  projecao: [], curvaIdeal: [], patrimonioNaIF: 0, patrimonioNecessario: 0,
  rendaSustentavel: 0, gapRenda: 0, ifAlcancada: false,
  aporteNecessario: 0, aporteNecessarioSemObjetivos: 0,
};

export function calcularProjecaoIF(params: ProjecaoIFParams): ProjecaoIFResult {
  const idadeAtual      = Number(params.idadeAtual)      || 0;
  const idadeMeta       = Number(params.idadeMeta)       || 60;
  const idadeMaxima     = Number(params.idadeMaxima)     || 90;
  const patrimonioInicial = Number(params.patrimonioInicial) || 0;
  const aporteMensal    = Number(params.aporteMensal)    || 0;
  const rendaMensalDesejada = Number(params.rendaMensalDesejada) || 0;
  const taxaRetornoAnual = Number(params.taxaRetornoAnual) || 0;
  const anoNascimento   = Number(params.anoNascimento)   || (new Date().getFullYear() - idadeAtual);
  const mesNascimento   = Number(params.mesNascimento)   || 1;
  const objetivos       = params.objetivos ?? [];

  if (idadeMeta <= idadeAtual || idadeMaxima <= idadeMeta) return EMPTY_RESULT;

  const taxaMensalReal = Math.pow(1 + taxaRetornoAnual, 1 / 12) - 1;

  // Anchor projection to today — month 0 is the current calendar month
  const hoje = new Date();
  const anoInicio = hoje.getFullYear();
  const mesInicio = hoje.getMonth() + 1; // 1-12
  // Exact decimal age today (e.g. born Mar/1983, today May/2026 → 43.17)
  const idadeExataHoje = (anoInicio - anoNascimento) + (mesInicio - mesNascimento) / 12;

  const objByMesAno = new Map<string, number>();
  for (const obj of objetivos) {
    const sinal = OBJETIVO_META[obj.tipo].tipo === "aporte" ? 1 : -1;
    const key = `${obj.ano}-${obj.mes}`;
    objByMesAno.set(key, (objByMesAno.get(key) ?? 0) + sinal * obj.valorBRL);
  }

  const mesInicioRetirada = (idadeMeta - idadeAtual) * 12;
  const totalMeses = (idadeMaxima - idadeAtual) * 12;

  const projecao: PontoProjecao[] = [];
  let patrimonio = patrimonioInicial;
  let anoAtual = anoInicio;
  let mesAtual = mesInicio;

  projecao.push({
    mes: 0,
    ano: anoAtual,
    mesDoAno: mesAtual,
    idade: Math.round(idadeExataHoje * 10) / 10,
    patrimonio: Math.round(patrimonio),
    fase: "acumulacao",
  });

  for (let m = 1; m <= totalMeses; m++) {
    mesAtual++;
    if (mesAtual > 12) { mesAtual = 1; anoAtual++; }

    const acumulando = m <= mesInicioRetirada;

    if (acumulando) {
      patrimonio = patrimonio * (1 + taxaMensalReal) + aporteMensal;
    } else {
      patrimonio = patrimonio * (1 + TAXA_RETIRADA_MENSAL) - rendaMensalDesejada;
    }

    const effect = objByMesAno.get(`${anoAtual}-${mesAtual}`) ?? 0;
    if (effect !== 0) patrimonio += effect;
    patrimonio = Math.max(0, patrimonio);

    projecao.push({
      mes: m,
      ano: anoAtual,
      mesDoAno: mesAtual,
      idade: Math.round((idadeExataHoje + m / 12) * 10) / 10,
      patrimonio: Math.round(patrimonio),
      fase: acumulando ? "acumulacao" : "decumulacao",
    });
  }

  const patrimonioNaIF = projecao[mesInicioRetirada]?.patrimonio ?? 0;
  const mesesRetirada = (idadeMaxima - idadeMeta) * 12;
  const patrimonioNecessario = Math.round(pvAnuidade(rendaMensalDesejada, TAXA_RETIRADA_MENSAL, mesesRetirada));
  const rendaSustentavel = Math.round(pmtMensal(patrimonioNaIF, TAXA_RETIRADA_MENSAL, mesesRetirada) * 100) / 100;
  const gapRenda = rendaMensalDesejada - rendaSustentavel;
  const ifAlcancada = rendaSustentavel >= rendaMensalDesejada;

  // Closed-form aporte without objectives (baseline)
  const n = mesInicioRetirada;
  const r = taxaMensalReal;
  let aporteNecessarioSemObjetivos = 0;
  if (n > 0) {
    if (r === 0) {
      aporteNecessarioSemObjetivos = Math.max(0, (patrimonioNecessario - patrimonioInicial) / n);
    } else {
      const fator = Math.pow(1 + r, n);
      aporteNecessarioSemObjetivos = Math.max(
        0,
        ((patrimonioNecessario - patrimonioInicial * fator) * r) / (fator - 1),
      );
    }
  }

  // Lightweight simulation to IF date only — used by binary search
  function simularNaIF(aporte: number): number {
    let p = patrimonioInicial;
    let anoS = anoInicio;
    let mesS = mesInicio;
    for (let m = 1; m <= mesInicioRetirada; m++) {
      mesS++;
      if (mesS > 12) { mesS = 1; anoS++; }
      p = p * (1 + taxaMensalReal) + aporte;
      const effect = objByMesAno.get(`${anoS}-${mesS}`) ?? 0;
      if (effect !== 0) p += effect;
      p = Math.max(0, p);
    }
    return p;
  }

  // Binary search for aporte with objectives
  let aporteNecessario = aporteNecessarioSemObjetivos;
  if (objetivos.length > 0 && n > 0) {
    let low = 0;
    let high = patrimonioNecessario;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (simularNaIF(mid) >= patrimonioNecessario) high = mid;
      else low = mid;
    }
    aporteNecessario = Math.ceil(high);
  }

  // Ideal curve: same start as real curve, uses aporteNecessarioSemObjetivos, no objectives
  const curvaIdeal: number[] = [];
  let patIdeal = patrimonioInicial;
  curvaIdeal.push(Math.round(patIdeal)); // index 0 = today, same as projecao[0]
  for (let i = 1; i < projecao.length; i++) {
    const fase = projecao[i].fase;
    if (fase === "acumulacao") {
      patIdeal = patIdeal * (1 + taxaMensalReal) + aporteNecessarioSemObjetivos;
    } else {
      patIdeal = patIdeal * (1 + TAXA_RETIRADA_MENSAL) - rendaMensalDesejada;
    }
    patIdeal = Math.max(0, patIdeal);
    curvaIdeal.push(Math.round(patIdeal));
  }

  return {
    projecao,
    curvaIdeal,
    patrimonioNaIF,
    patrimonioNecessario,
    rendaSustentavel,
    gapRenda,
    ifAlcancada,
    aporteNecessario,
    aporteNecessarioSemObjetivos,
  };
}
