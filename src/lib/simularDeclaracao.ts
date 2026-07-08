import { calcularIRAnual, DEDUCAO_DEPENDENTE } from "./tax";

export interface DeclaracaoInput {
  rendaBruta: number;
  irrf: number;
  despesas: number;
  dependentes: number;
  inss: number;
  aporteAnual?: number; // se informado, usa esse valor (cap no teto); senão usa o teto completo
}

export interface DeclaracaoResult {
  baseSemPGBL: number;
  irSemPGBL: number;
  resultadoSem: number;
  aliqEfetivaSem: number;
  tetoPGBL: number;
  aporteEfetivo: number; // deducão PGBL realmente usada no cálculo
  baseComPGBL: number;
  irComPGBL: number;
  resultadoCom: number;
  aliqEfetivaCom: number;
  economia: number;
}

export function simularDeclaracaoIRPF(i: DeclaracaoInput): DeclaracaoResult {
  const deducaoDep = Math.max(0, i.dependentes) * DEDUCAO_DEPENDENTE;

  const baseSemPGBL = Math.max(0, i.rendaBruta - i.despesas - deducaoDep - i.inss);
  const irSemPGBL = calcularIRAnual(baseSemPGBL, i.rendaBruta);
  const resultadoSem = irSemPGBL - i.irrf;
  const aliqEfetivaSem = i.rendaBruta > 0 ? (irSemPGBL / i.rendaBruta) * 100 : 0;

  const tetoPGBL = i.rendaBruta * 0.12;
  const aporteEfetivo =
    i.aporteAnual !== undefined && i.aporteAnual > 0
      ? Math.min(i.aporteAnual, tetoPGBL)
      : tetoPGBL;

  const baseComPGBL = Math.max(0, baseSemPGBL - aporteEfetivo);
  const irComPGBL = calcularIRAnual(baseComPGBL, i.rendaBruta);
  const resultadoCom = irComPGBL - i.irrf;
  const aliqEfetivaCom = i.rendaBruta > 0 ? (irComPGBL / i.rendaBruta) * 100 : 0;

  const economia = Math.max(0, irSemPGBL - irComPGBL);

  return {
    baseSemPGBL, irSemPGBL, resultadoSem, aliqEfetivaSem,
    tetoPGBL, aporteEfetivo,
    baseComPGBL, irComPGBL, resultadoCom, aliqEfetivaCom,
    economia,
  };
}

// Taxa nominal conservadora: IPCA ~4% + retorno real ~5% = 9% a.a.
const TAXA_ANUAL = 0.09;
const TAXA_MENSAL = Math.pow(1 + TAXA_ANUAL, 1 / 12) - 1;

export interface PontoProjecao {
  ano: number;
  idade: number;
  semPGBL: number;
  comPGBL: number;
}

export function calcularProjecaoPatrimonio(params: {
  aporteAnualPGBL: number;
  economiaAnual: number;
  nAnos: number;
  idadeAtual: number;
  saldoInicial?: number;
}): PontoProjecao[] {
  const { aporteAnualPGBL, economiaAnual, nAnos, idadeAtual, saldoInicial = 0 } = params;

  const pontos: PontoProjecao[] = [];
  let saldoSemPGBL = saldoInicial;
  let saldoComPGBL = saldoInicial;

  const aporteMensal = aporteAnualPGBL / 12;
  const restituicaoMensal = economiaAnual / 12;

  for (let ano = 0; ano <= nAnos; ano++) {
    pontos.push({
      ano,
      idade: idadeAtual + ano,
      semPGBL: Math.round(saldoSemPGBL),
      comPGBL: Math.round(saldoComPGBL),
    });
    for (let mes = 0; mes < 12; mes++) {
      saldoSemPGBL = saldoSemPGBL * (1 + TAXA_MENSAL) + aporteMensal;
      saldoComPGBL = saldoComPGBL * (1 + TAXA_MENSAL) + aporteMensal + restituicaoMensal;
    }
  }

  return pontos;
}
