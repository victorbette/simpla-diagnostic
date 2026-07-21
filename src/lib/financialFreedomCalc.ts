import type { ObjetivoVida } from "@/types/objetivos";

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
  curvaIdeal: (number | null)[];
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
  /** Exact month index of the IF transition — aligned to the idadeMeta birthday */
  mesInicioRetirada: number;
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

/** Fixed real rates (already inflation-adjusted) — all calcs run in IPCA-adjusted terms */
export const TAXA_ACUM_ANUAL  = 0.045; // IPCA+4.5% a.a. — accumulation phase (fixed rate)
export const TAXA_ACUM_MENSAL = Math.pow(1 + TAXA_ACUM_ANUAL, 1 / 12) - 1;
export const TAXA_RET_ANUAL   = 0.04; // IPCA+4% a.a. — withdrawal phase
export const TAXA_RET_MENSAL  = Math.pow(1 + TAXA_RET_ANUAL,  1 / 12) - 1;
const IDADE_FIM_AMARELA = 90; // ideal curve and patrimonioNecessario horizon

const EMPTY_RESULT: ProjecaoIFResult = {
  projecao: [], curvaIdeal: [], patrimonioNaIF: 0, patrimonioNecessario: 0,
  rendaSustentavel: 0, gapRenda: 0, ifAlcancada: false,
  aporteNecessario: 0, aporteNecessarioSemObjetivos: 0, mesInicioRetirada: 0,
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
    const sinal = obj.tipo === "aportes_financeiros" ? 1 : -1;
    const key = `${obj.ano}-${obj.mes}`;
    objByMesAno.set(key, (objByMesAno.get(key) ?? 0) + sinal * obj.valorBRL);
  }

  // Use exact decimal age so the transition lands on the idadeMeta birthday month
  const mesInicioRetirada = Math.round((idadeMeta - idadeExataHoje) * 12);
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
      // Apply objectives BEFORE growth (spec requirement)
      const effect = objByMesAno.get(`${anoAtual}-${mesAtual}`) ?? 0;
      if (effect !== 0) {
        patrimonio += effect;
        patrimonio = Math.max(0, patrimonio);
      }
      patrimonio = patrimonio * (1 + taxaMensalReal) + aporteMensal;
    } else {
      patrimonio = patrimonio * (1 + TAXA_RET_MENSAL) - rendaMensalDesejada;
      patrimonio = Math.max(0, patrimonio);
    }

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
  // patrimonioNecessario calibrated for ideal 90-year horizon
  const mesesRetirada = Math.max(0, (IDADE_FIM_AMARELA - idadeMeta) * 12);
  const patrimonioNecessario = mesesRetirada > 0
    ? Math.round(pvAnuidade(rendaMensalDesejada, TAXA_RET_MENSAL, mesesRetirada))
    : 0;
  const rendaSustentavel = Math.round(pmtMensal(patrimonioNaIF, TAXA_RET_MENSAL, mesesRetirada) * 100) / 100;
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

  // Ideal curve: starts at patrimonioInicial, accumulates without objectives,
  // withdraws from patrimonioNecessario at 4% a.a., stops at IDADE_FIM_AMARELA
  const totalMesesIdeal = Math.min(Math.round((IDADE_FIM_AMARELA - idadeExataHoje) * 12), projecao.length - 1);
  const curvaIdeal: (number | null)[] = [];
  let patIdeal = patrimonioInicial;
  curvaIdeal.push(Math.round(patIdeal)); // i=0: same starting point as blue line
  for (let i = 1; i < projecao.length; i++) {
    if (i > totalMesesIdeal) {
      curvaIdeal.push(null); // no data beyond age 90
    } else if (i < mesInicioRetirada) {
      // Accumulation: no objectives, use aporteNecessarioSemObjetivos
      patIdeal = patIdeal * (1 + taxaMensalReal) + aporteNecessarioSemObjetivos;
      curvaIdeal.push(Math.round(patIdeal));
    } else if (i === mesInicioRetirada) {
      // IF transition point: pin to patrimonioNecessario for clean handoff
      patIdeal = patrimonioNecessario;
      curvaIdeal.push(patrimonioNecessario);
    } else {
      // Withdrawal: 4% a.a., guaranteed to reach 0 at IDADE_FIM_AMARELA
      patIdeal = patIdeal * (1 + TAXA_RET_MENSAL) - rendaMensalDesejada;
      patIdeal = Math.max(0, patIdeal);
      curvaIdeal.push(Math.round(patIdeal));
    }
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
    mesInicioRetirada,
  };
}

// ─── Sensitivity / simplified calc helpers ────────────────────────────────────

export function calcularPatrimonioNecessario(
  rendaMensalDesejada: number,
  idadeAposentadoria: number,
): number {
  const meses = Math.max(0, (IDADE_FIM_AMARELA - idadeAposentadoria) * 12);
  return pvAnuidade(rendaMensalDesejada, TAXA_RET_MENSAL, meses);
}

export function calcularPatrimonioPerpetuidade(rendaMensalDesejada: number): number {
  if (!rendaMensalDesejada || rendaMensalDesejada <= 0 || !isFinite(rendaMensalDesejada)) return 0;
  return rendaMensalDesejada * 12 / 0.04;
}

/**
 * Closed-form FV projection using TAXA_ACUM_MENSAL and integer age difference.
 * n = Math.round((idadeAlvo - idadeAtual) * 12) — no fractional-age drift.
 */
export function calcularProjecao(params: {
  patrimonioAtual: number;
  aporteMensal: number;
  idadeAtual: number;
  idadeAlvo: number;
}): number {
  const { patrimonioAtual, aporteMensal, idadeAtual, idadeAlvo } = params;
  const n = Math.max(0, Math.round((idadeAlvo - idadeAtual) * 12));
  if (n === 0) return patrimonioAtual;
  if (!isFinite(n) || n > 2400) return patrimonioAtual;
  const f = Math.pow(1 + TAXA_ACUM_MENSAL, n);
  if (!isFinite(f)) return patrimonioAtual;
  return patrimonioAtual * f + aporteMensal * (f - 1) / TAXA_ACUM_MENSAL;
}

// Simulates patrimônio month-by-month applying objectives at their calendar month/year.
// Signs: aportes_financeiros = positive; all others = negative (expense).
function projetarComObjetivos(p: {
  patrimonioAtual: number;
  aporteMensal: number;
  idadeAtual: number;
  idadeAlvo: number;
  objetivos: ObjetivoVida[];
  taxaMensal: number;
}): number {
  const hoje = new Date();
  let anoIter = hoje.getFullYear();
  let mesIter = hoje.getMonth() + 1; // 1-12
  const nMeses = Math.max(0, Math.round((p.idadeAlvo - p.idadeAtual) * 12));
  if (!isFinite(nMeses)) return p.patrimonioAtual;
  let patrimonio = p.patrimonioAtual;
  for (let m = 0; m < nMeses; m++) {
    mesIter++;
    if (mesIter > 12) { mesIter = 1; anoIter++; }
    patrimonio = patrimonio * (1 + p.taxaMensal) + p.aporteMensal;
    for (const obj of p.objetivos) {
      if (obj.ano === anoIter && obj.mes === mesIter) {
        const sinal = obj.tipo === "aportes_financeiros" ? 1 : -1;
        patrimonio = Math.max(0, patrimonio + sinal * obj.valorBRL);
      }
    }
  }
  return patrimonio;
}

export function calcularProjecaoComAporte(p: {
  patrimonioAtual: number;
  aporteMensal: number;
  idadeAtual: number;
  idadeAlvo: number;
  taxaMensalReal?: number;
}): number {
  const r = p.taxaMensalReal ?? TAXA_ACUM_MENSAL;
  const meses = Math.max(0, Math.round((p.idadeAlvo - p.idadeAtual) * 12));
  if (meses <= 0 || !isFinite(meses)) return p.patrimonioAtual;
  if (Math.abs(r) < 1e-10) return p.patrimonioAtual + p.aporteMensal * meses;
  const f = Math.pow(1 + r, meses);
  return p.patrimonioAtual * f + p.aporteMensal * (f - 1) / r;
}

export function calcularAporteMensalNecessario(p: {
  patrimonioAtual: number;
  patrimonioAlvo: number;
  idadeAtual: number;
  idadeAlvo: number;
  taxaMensalReal?: number;
  objetivos?: ObjetivoVida[];
}): number {
  const r = p.taxaMensalReal ?? TAXA_ACUM_MENSAL;
  const meses = Math.max(1, Math.round((p.idadeAlvo - p.idadeAtual) * 12));
  if (!isFinite(meses) || meses <= 0) return 0;
  if (p.objetivos && p.objetivos.length > 0) {
    // Binary search: hi = patrimonioAlvo guarantees reaching the target in month 1
    let lo = 0, hi = p.patrimonioAlvo;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (projetarComObjetivos({ patrimonioAtual: p.patrimonioAtual, aporteMensal: mid, idadeAtual: p.idadeAtual, idadeAlvo: p.idadeAlvo, objetivos: p.objetivos, taxaMensal: r }) >= p.patrimonioAlvo) hi = mid;
      else lo = mid;
    }
    return Math.max(0, hi);
  }
  if (Math.abs(r) < 1e-10) return Math.max(0, (p.patrimonioAlvo - p.patrimonioAtual) / meses);
  const f = Math.pow(1 + r, meses);
  return Math.max(0, ((p.patrimonioAlvo - p.patrimonioAtual * f) * r) / (f - 1));
}

export function calcularTaxaNecessaria(p: {
  patrimonioAtual: number;
  aporteMensal: number;
  patrimonioAlvo: number;
  idadeAtual: number;
  idadeAlvo: number;
  objetivos?: ObjetivoVida[];
}): number {
  const TAXA_MINIMA_ANUAL = 0.03; // IPCA+3% a.a. — piso da taxa necessária
  const meses = Math.round((p.idadeAlvo - p.idadeAtual) * 12);
  if (meses <= 0 || !isFinite(meses) || p.patrimonioAlvo <= 0 || !isFinite(p.patrimonioAlvo)) return TAXA_MINIMA_ANUAL;
  function fv(ta: number): number {
    const tm = Math.pow(1 + ta, 1 / 12) - 1;
    if (p.objetivos && p.objetivos.length > 0) {
      return projetarComObjetivos({ patrimonioAtual: p.patrimonioAtual, aporteMensal: p.aporteMensal, idadeAtual: p.idadeAtual, idadeAlvo: p.idadeAlvo, objetivos: p.objetivos, taxaMensal: tm });
    }
    if (Math.abs(tm) < 1e-10) return p.patrimonioAtual + p.aporteMensal * meses;
    const f = Math.pow(1 + tm, meses);
    return p.patrimonioAtual * f + p.aporteMensal * (f - 1) / tm;
  }
  if (fv(0) >= p.patrimonioAlvo) return TAXA_MINIMA_ANUAL;
  let lo = 0, hi = 5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (fv(mid) >= p.patrimonioAlvo) hi = mid;
    else lo = mid;
  }
  return Math.max(hi, TAXA_MINIMA_ANUAL);
}

export function calcularIdadeComAporte(p: {
  patrimonioAtual: number;
  aporteMensal: number;
  patrimonioAlvo: number;
  idadeAtual: number;
  taxaMensalReal?: number;
  objetivos?: ObjetivoVida[];
}): number {
  const r = p.taxaMensalReal ?? TAXA_ACUM_MENSAL;
  if (p.patrimonioAtual >= p.patrimonioAlvo) return p.idadeAtual;
  if (p.objetivos && p.objetivos.length > 0) {
    const hoje = new Date();
    let anoIter = hoje.getFullYear();
    let mesIter = hoje.getMonth() + 1;
    let pat = p.patrimonioAtual;
    for (let m = 1; m <= 600; m++) {
      mesIter++;
      if (mesIter > 12) { mesIter = 1; anoIter++; }
      pat = pat * (1 + r) + p.aporteMensal;
      for (const obj of p.objetivos) {
        if (obj.ano === anoIter && obj.mes === mesIter) {
          const sinal = obj.tipo === "aportes_financeiros" ? 1 : -1;
          pat = Math.max(0, pat + sinal * obj.valorBRL);
        }
      }
      if (pat >= p.patrimonioAlvo) return p.idadeAtual + m / 12;
    }
    return p.idadeAtual + 50;
  }
  let pat = p.patrimonioAtual;
  for (let m = 1; m <= 600; m++) {
    pat = pat * (1 + r) + p.aporteMensal;
    if (pat >= p.patrimonioAlvo) return p.idadeAtual + m / 12;
  }
  return p.idadeAtual + 50;
}

export function calcularProjecaoComTaxa(p: {
  patrimonioAtual: number;
  aporteMensal: number;
  idadeAtual: number;
  idadeAlvo: number;
  taxaMensal: number;
}): number {
  const meses = Math.round((p.idadeAlvo - p.idadeAtual) * 12);
  if (meses <= 0) return p.patrimonioAtual;
  if (Math.abs(p.taxaMensal) < 1e-10) return p.patrimonioAtual + p.aporteMensal * meses;
  const f = Math.pow(1 + p.taxaMensal, meses);
  return p.patrimonioAtual * f + p.aporteMensal * (f - 1) / p.taxaMensal;
}
