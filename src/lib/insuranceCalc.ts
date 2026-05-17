export interface Debt { id: string; name: string; value: number; }
export interface Asset { id: string; name: string; value: number; }
export interface Child { id: string; name: string; currentAge: number; independenceAge: number; monthlyCost: number; }
export interface Policy { id: string; name: string; value: number; }
export interface LivingPolicy { id: string; name: string; type: "disability" | "criticalIllness" | "accidentalDeath"; value: number; }
export interface LivingBenefits {
  adaptationCost: number;
  familyMonthlyCost: number;
  extraTreatmentReserve: number;
  useDoubledCapital: boolean;
  manualAccidentalDeathValue: number;
  accidentalDeathExtraEnabled: boolean;
}
export interface InsuranceData {
  selectedState: string;
  itcmdRate: number;
  funeralExpenses: number;
  lawyerFeeRate: number;
  debts: Debt[];
  assets: Asset[];
  children: Child[];
  familyExpenses: number;
  spouseIncome: number;
  coveragePeriod: number;
  policies: Policy[];
  livingPolicies: LivingPolicy[];
  livingBenefits: LivingBenefits;
  hasPrivatePension: boolean;
  privatePensionBalance: number;
}
export const initialLivingBenefits: LivingBenefits = {
  adaptationCost: 0, familyMonthlyCost: 0, extraTreatmentReserve: 0,
  useDoubledCapital: false, manualAccidentalDeathValue: 0, accidentalDeathExtraEnabled: false,
};
export const initialInsuranceData: InsuranceData = {
  selectedState: "", itcmdRate: 4, funeralExpenses: 15000, lawyerFeeRate: 6,
  debts: [], assets: [], children: [], familyExpenses: 0, spouseIncome: 0,
  coveragePeriod: 10, policies: [], livingPolicies: [],
  livingBenefits: { ...initialLivingBenefits }, hasPrivatePension: false, privatePensionBalance: 0,
};
export function generateId(): string { return Math.random().toString(36).substring(2, 9); }
export function calcularSeguro(data: InsuranceData) {
  const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0);
  const totalDebts = data.debts.reduce((sum, d) => sum + d.value, 0);
  const inventoryCost = totalAssets * ((data.itcmdRate + data.lawyerFeeRate) / 100);
  const immediateTotal = inventoryCost + data.funeralExpenses + totalDebts;
  const educationTotal = data.children.reduce((sum, c) => {
    const years = Math.max(0, c.independenceAge - c.currentAge);
    return sum + years * 12 * c.monthlyCost;
  }, 0);
  const lifestyleGap = Math.max(0, data.familyExpenses - data.spouseIncome);
  const lifestyleTotal = lifestyleGap * 12 * data.coveragePeriod;
  const ongoingTotal = educationTotal + lifestyleTotal;
  const lb = data.livingBenefits;
  const disabilityTotal = lb.familyMonthlyCost * 60 + lb.adaptationCost;
  const criticalIllnessTotal = lb.familyMonthlyCost * 12 + lb.extraTreatmentReserve;
  const accidentalDeathExtra = lb.accidentalDeathExtraEnabled ? educationTotal : 0;
  const grossNeed = immediateTotal + ongoingTotal + accidentalDeathExtra;
  const pensionOffset = data.hasPrivatePension ? Math.max(0, data.privatePensionBalance) : 0;
  const totalNeed = Math.max(0, grossNeed - pensionOffset);
  const disabilityCoverage = data.livingPolicies.filter(p => p.type === "disability").reduce((sum, p) => sum + p.value, 0);
  const criticalIllnessCoverage = data.livingPolicies.filter(p => p.type === "criticalIllness").reduce((sum, p) => sum + p.value, 0);
  const accidentalDeathCoverage = data.livingPolicies.filter(p => p.type === "accidentalDeath").reduce((sum, p) => sum + p.value, 0);
  const totalCoverage = data.policies.reduce((sum, p) => sum + p.value, 0) + accidentalDeathCoverage;
  const gap = Math.max(0, totalNeed - totalCoverage);
  return {
    totalAssets, totalDebts, inventoryCost, immediateTotal,
    educationTotal, lifestyleTotal, ongoingTotal, grossNeed, pensionOffset,
    totalNeed, totalCoverage, gap,
    disabilityTotal, criticalIllnessTotal, accidentalDeathTotal: accidentalDeathExtra,
    disabilityCoverage, criticalIllnessCoverage, accidentalDeathCoverage,
    disabilityGap: Math.max(0, disabilityTotal - disabilityCoverage),
    criticalIllnessGap: Math.max(0, criticalIllnessTotal - criticalIllnessCoverage),
    accidentalDeathGap: 0,
  };
}
