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
