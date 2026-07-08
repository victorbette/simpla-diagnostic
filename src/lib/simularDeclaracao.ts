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
