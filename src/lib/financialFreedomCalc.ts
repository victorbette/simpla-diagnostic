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

// ─── Correct IF projection engine (annuity PV/PMT, compound monthly rate) ────

export interface ObjetivoIF {
  id: string;
  nome: string;
  valor: number;
  idadeRealizacao: number;
  tipo: "despesa" | "aporte";
}

export interface ProjecaoIFParams {
  idadeAtual: number;
  idadeMeta: number;
  /** Life expectancy — projection ends here and determines PV/PMT horizon */
  idadeMaxima: number;
  patrimonioInicial: number;
  aporteMensal: number;
  rendaMensalDesejada: number;
  /** Real annual return rate as decimal — e.g. 0.06 for 6% a.a. real */
  taxaRetornoAnual: number;
  objetivos?: ObjetivoIF[];
}

export interface ProjecaoIFResult {
  projecao: Array<{ idade: number; patrimonio: number; fase: "acumulacao" | "decumulacao" }>;
  patrimonioNaIF: number;
  /** PV of annuity: rendaMensal for (idadeMaxima - idadeMeta) × 12 months at taxaMensalReal */
  patrimonioNecessario: number;
  /** PMT: monthly withdrawal that exhausts patrimonioNaIF over (idadeMaxima - idadeMeta) × 12 months */
  rendaSustentavel: number;
  /** rendaMensalDesejada − rendaSustentavel  (positive = falta renda) */
  gapRenda: number;
  ifAlcancada: boolean;
  /** Monthly contribution to reach patrimonioNecessario accounting for all objectives */
  aporteNecessario: number;
  /** Monthly contribution to reach patrimonioNecessario ignoring objectives (PMT baseline) */
  aporteNecessarioSemObjetivos: number;
}

/** PV of annuity: how much patrimônio is needed to pay rendaMensal for n months at taxaMensalReal */
function pvAnuidade(rendaMensal: number, taxaMensalReal: number, meses: number): number {
  if (meses <= 0) return 0;
  if (Math.abs(taxaMensalReal) < 0.0001) return rendaMensal * meses;
  return rendaMensal * (1 - Math.pow(1 + taxaMensalReal, -meses)) / taxaMensalReal;
}

/** PMT: monthly withdrawal sustainable from patrimônio over n months at taxaMensalReal */
function pmtMensal(patrimonio: number, taxaMensalReal: number, meses: number): number {
  if (meses <= 0) return 0;
  if (Math.abs(taxaMensalReal) < 0.0001) return patrimonio / meses;
  return patrimonio * taxaMensalReal / (1 - Math.pow(1 + taxaMensalReal, -meses));
}

/** Fixed 4% a.a. real for the withdrawal phase — conservative standard */
const TAXA_RETIRADA_ANUAL = 0.04;
const TAXA_RETIRADA_MENSAL = Math.pow(1 + TAXA_RETIRADA_ANUAL, 1 / 12) - 1; // ≈ 0.3274% a.m.

export function calcularProjecaoIF(params: ProjecaoIFParams): ProjecaoIFResult {
  const {
    idadeAtual, idadeMeta, idadeMaxima, patrimonioInicial, aporteMensal,
    rendaMensalDesejada, taxaRetornoAnual, objetivos = [],
  } = params;

  // Accumulation phase rate — defined by the advisor
  const taxaMensalReal = Math.pow(1 + taxaRetornoAnual, 1 / 12) - 1;
  // Withdrawal phase always uses TAXA_RETIRADA_MENSAL (4% a.a. real)

  // Net effect per age: positive = extra inflow, negative = outflow
  // Only objectives strictly after idadeAtual can be applied (loop starts at idadeAtual+1)
  const objsByIdade = new Map<number, number>();
  for (const obj of objetivos) {
    const idade = Math.round(Number(obj.idadeRealizacao));
    const valor = Number(obj.valor);
    if (!isFinite(idade) || !isFinite(valor) || idade <= idadeAtual) continue;
    const sinal = obj.tipo === "aporte" ? 1 : -1;
    objsByIdade.set(
      idade,
      (objsByIdade.get(idade) ?? 0) + sinal * valor,
    );
  }

  const projecao: ProjecaoIFResult["projecao"] = [];
  let patrimonio = patrimonioInicial;

  projecao.push({ idade: idadeAtual, patrimonio: Math.round(patrimonio), fase: "acumulacao" });

  for (let idade = idadeAtual + 1; idade <= idadeMaxima; idade++) {
    const estaAcumulando = idade <= idadeMeta;

    // Simulate 12 months: accumulation uses advisor rate; withdrawal uses 4% a.a. real
    for (let m = 0; m < 12; m++) {
      if (estaAcumulando) {
        patrimonio = patrimonio * (1 + taxaMensalReal) + aporteMensal;
      } else {
        patrimonio = patrimonio * (1 + TAXA_RETIRADA_MENSAL) - rendaMensalDesejada;
      }
    }

    // Apply one-time objective at end of year → visible as sharp drop/rise in chart
    const objEffect = objsByIdade.get(idade) ?? 0;
    if (objEffect !== 0) patrimonio += objEffect;
    patrimonio = Math.max(0, patrimonio);

    projecao.push({
      idade,
      patrimonio: Math.round(patrimonio),
      fase: estaAcumulando ? "acumulacao" : "decumulacao",
    });
  }

  const patrimonioNaIF = projecao.find((p) => p.idade === idadeMeta)?.patrimonio ?? 0;
  const mesesRetirada = (idadeMaxima - idadeMeta) * 12;
  // Both use the fixed 4% withdrawal rate, not the accumulation rate
  const patrimonioNecessario = Math.round(pvAnuidade(rendaMensalDesejada, TAXA_RETIRADA_MENSAL, mesesRetirada));
  const rendaSustentavel = Math.round(pmtMensal(patrimonioNaIF, TAXA_RETIRADA_MENSAL, mesesRetirada) * 100) / 100;
  const gapRenda = rendaMensalDesejada - rendaSustentavel; // positive = falta renda
  const ifAlcancada = rendaSustentavel >= rendaMensalDesejada;

  // Closed-form PMT ignoring objectives (baseline)
  const n = (idadeMeta - idadeAtual) * 12;
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

  // Binary search accounting for objectives — simulates the same accumulation path
  function simularPatrimonioFinal(aporte: number): number {
    let p = patrimonioInicial;
    for (let idade = idadeAtual + 1; idade <= idadeMeta; idade++) {
      for (let m = 0; m < 12; m++) {
        p = p * (1 + taxaMensalReal) + aporte;
      }
      const objEffect = objsByIdade.get(idade) ?? 0;
      if (objEffect !== 0) p += objEffect;
      p = Math.max(0, p);
    }
    return p;
  }

  let aporteNecessario = aporteNecessarioSemObjetivos;
  if (objetivos.length > 0 && n > 0) {
    let low = 0;
    let high = patrimonioNecessario; // generous upper bound — always yields FV > target
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (simularPatrimonioFinal(mid) >= patrimonioNecessario) {
        high = mid;
      } else {
        low = mid;
      }
    }
    aporteNecessario = Math.ceil(high);
  }

  return {
    projecao,
    patrimonioNaIF,
    patrimonioNecessario,
    rendaSustentavel,
    gapRenda,
    ifAlcancada,
    aporteNecessario,
    aporteNecessarioSemObjetivos,
  };
}
