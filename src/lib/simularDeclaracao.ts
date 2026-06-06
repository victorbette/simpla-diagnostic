import { calcularIRAnual, DEDUCAO_DEPENDENTE } from "./tax";

export interface DeclaracaoInput {
  rendaBruta: number;
  irrf: number;
  despesas: number;
  dependentes: number;
  inss: number;
}

export interface DeclaracaoResult {
  baseSemPGBL: number;
  irSemPGBL: number;
  resultadoSem: number;
  aliqEfetivaSem: number;
  tetoPGBL: number;
  baseComPGBL: number;
  irComPGBL: number;
  resultadoCom: number;
  aliqEfetivaCom: number;
  economia: number;
}

export function simularDeclaracaoIRPF(i: DeclaracaoInput): DeclaracaoResult {
  const deducaoDep = Math.max(0, i.dependentes) * DEDUCAO_DEPENDENTE;

  const baseSemPGBL = Math.max(0, i.rendaBruta - i.despesas - deducaoDep - i.inss);
  const irSemPGBL = calcularIRAnual(baseSemPGBL);
  const resultadoSem = irSemPGBL - i.irrf;
  const aliqEfetivaSem = i.rendaBruta > 0 ? (irSemPGBL / i.rendaBruta) * 100 : 0;

  const tetoPGBL = i.rendaBruta * 0.12;
  const baseComPGBL = Math.max(0, baseSemPGBL - tetoPGBL);
  const irComPGBL = calcularIRAnual(baseComPGBL);
  const resultadoCom = irComPGBL - i.irrf;
  const aliqEfetivaCom = i.rendaBruta > 0 ? (irComPGBL / i.rendaBruta) * 100 : 0;

  const economia = Math.max(0, irSemPGBL - irComPGBL);

  return {
    baseSemPGBL, irSemPGBL, resultadoSem, aliqEfetivaSem,
    tetoPGBL, baseComPGBL, irComPGBL, resultadoCom,
    aliqEfetivaCom, economia,
  };
}
