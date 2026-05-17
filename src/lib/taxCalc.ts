export const DEDUCAO_DEPENDENTE = 2275.08;
const faixasAnuais = [
  { limite: 28559.70, aliquota: 0, deduzir: 0 },
  { limite: 33919.80, aliquota: 0.075, deduzir: 2141.98 },
  { limite: 45012.60, aliquota: 0.15, deduzir: 4685.96 },
  { limite: 55976.16, aliquota: 0.225, deduzir: 8061.91 },
  { limite: Infinity, aliquota: 0.275, deduzir: 10860.71 },
];
export function calcularIRAnual(baseCalculo: number): number {
  if (baseCalculo <= 0) return 0;
  for (const f of faixasAnuais) {
    if (baseCalculo <= f.limite) return Math.max(0, baseCalculo * f.aliquota - f.deduzir);
  }
  return 0;
}
const faixasMensais = [
  { limite: 2259.20, aliquota: 0, deduzir: 0 },
  { limite: 2826.65, aliquota: 0.075, deduzir: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deduzir: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deduzir: 662.77 },
  { limite: Infinity, aliquota: 0.275, deduzir: 896.00 },
];
export function calcularIRMensal(baseMensal: number): number {
  if (baseMensal <= 0) return 0;
  for (const f of faixasMensais) {
    if (baseMensal <= f.limite) return Math.max(0, baseMensal * f.aliquota - f.deduzir);
  }
  return 0;
}
export function getAliquotaRegressiva(anos: number): number {
  if (anos < 2) return 35;
  if (anos < 4) return 30;
  if (anos < 6) return 25;
  if (anos < 8) return 20;
  if (anos < 10) return 15;
  return 10;
}
export function calcularBeneficioPGBL(params: {
  rendaMensalBruta: number;
  aportePGBLMensal: number;
  numeroDependentes: number;
  tipoDeclaracao: "completa" | "simplificada";
}) {
  const { rendaMensalBruta, aportePGBLMensal, numeroDependentes, tipoDeclaracao } = params;
  const rendaAnual = rendaMensalBruta * 12;
  const tetoPGBLAnual = rendaAnual * 0.12;
  const aporteAnual = aportePGBLMensal * 12;
  const aporteEfetivo = Math.min(aporteAnual, tetoPGBLAnual);
  const deducaoDependentes = numeroDependentes * DEDUCAO_DEPENDENTE;
  const baseComPGBL = Math.max(0, rendaAnual - aporteEfetivo - deducaoDependentes);
  const baseSemPGBL = Math.max(0, rendaAnual - deducaoDependentes);
  const irComPGBL = tipoDeclaracao === "completa" ? calcularIRAnual(baseComPGBL) : rendaAnual * 0.2;
  const irSemPGBL = tipoDeclaracao === "completa" ? calcularIRAnual(baseSemPGBL) : rendaAnual * 0.2;
  const economiaAnual = Math.max(0, irSemPGBL - irComPGBL);
  const economiaMensal = economiaAnual / 12;
  const espacoDisponivelMensal = Math.max(0, (tetoPGBLAnual - aporteAnual) / 12);
  return {
    rendaAnual, tetoPGBLAnual, aporteEfetivo, aporteAnual,
    irComPGBL, irSemPGBL, economiaAnual, economiaMensal,
    espacoDisponivelMensal, deducaoDependentes,
    aproveitandoTeto: aporteAnual >= tetoPGBLAnual,
  };
}
