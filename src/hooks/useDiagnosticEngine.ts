export type RiskLevel = "low" | "medium" | "high";

export interface DiagnosticAnswers {
  // Liquidez
  emergencyMonths: number;
  emergencyAccessible: boolean;
  hasShortTermGoal: boolean;
  // Sucessão
  hasWill: boolean;
  hasHolding: boolean;
  hasLifeInsuranceForSuccession: boolean;
  // Estratégia
  diversificationLevel: "none" | "low" | "medium" | "high";
  hasInternationalAssets: boolean;
  hasAlternativeAssets: boolean;
  reviewsPortfolioRegularly: boolean;
  // Câmbio
  hasFxProtection: boolean;
  fxExposureLevel: "none" | "low" | "medium" | "high";
  // Inflação
  hasRealAssets: boolean;
  hasIPCALinkedAssets: boolean;
  inflationProtectionAdequate: boolean;
  // Objetivos
  hasDocumentedGoals: boolean;
  goalsHaveDeadline: boolean;
  goalsHaveDedicatedAccount: boolean;
  // Liberdade financeira
  monthlyPassiveIncome: number;
  targetPassiveIncome: number;
  fireTargetAge: number;
  currentAge: number;
  totalInvestedAssets: number;
  // Notas
  assessorNotes: string;
}

export const initialAnswers: DiagnosticAnswers = {
  emergencyMonths: 0,
  emergencyAccessible: false,
  hasShortTermGoal: false,
  hasWill: false,
  hasHolding: false,
  hasLifeInsuranceForSuccession: false,
  diversificationLevel: "none",
  hasInternationalAssets: false,
  hasAlternativeAssets: false,
  reviewsPortfolioRegularly: false,
  hasFxProtection: false,
  fxExposureLevel: "none",
  hasRealAssets: false,
  hasIPCALinkedAssets: false,
  inflationProtectionAdequate: false,
  hasDocumentedGoals: false,
  goalsHaveDeadline: false,
  goalsHaveDedicatedAccount: false,
  monthlyPassiveIncome: 0,
  targetPassiveIncome: 0,
  fireTargetAge: 60,
  currentAge: 35,
  totalInvestedAssets: 0,
  assessorNotes: "",
};

export interface CategoryResult {
  id: string;
  label: string;
  description: string;
  icon: string;
  score: number;
  riskLevel: RiskLevel;
  weight: number;
  findings: string[];
  recommendations: string[];
}

export interface DiagnosticResult {
  overallScore: number;
  overallRisk: RiskLevel;
  categories: CategoryResult[];
  createdAt: string;
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 70) return "low";
  if (score >= 40) return "medium";
  return "high";
}

function scoreLiquidez(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  if (a.emergencyMonths >= 6) { pts += 50; findings.push("Reserva de emergência adequada (≥6 meses)."); }
  else if (a.emergencyMonths >= 3) { pts += 25; findings.push("Reserva parcial (3–5 meses)."); recommendations.push("Ampliar reserva para ao menos 6 meses de despesas."); }
  else { findings.push("Reserva de emergência insuficiente."); recommendations.push("Constituir reserva de emergência como prioridade imediata."); }
  if (a.emergencyAccessible) { pts += 30; findings.push("Reserva em ativo de liquidez diária."); }
  else { findings.push("Reserva não está em ativo de fácil resgate."); recommendations.push("Migrar reserva para ativo com liquidez D+0 ou D+1."); }
  if (a.hasShortTermGoal && a.emergencyMonths < 3) { pts -= 20; recommendations.push("Separar reserva de curto prazo do fundo de emergência."); }
  return { score: clamp(pts), findings, recommendations };
}

function scoreSucessao(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  if (a.hasWill) { pts += 35; findings.push("Testamento formalizado."); }
  else { findings.push("Sem testamento."); recommendations.push("Elaborar testamento com auxílio jurídico especializado."); }
  if (a.hasHolding) { pts += 40; findings.push("Holding patrimonial constituída."); }
  else { findings.push("Sem estrutura de holding."); recommendations.push("Avaliar constituição de holding para planejamento sucessório eficiente."); }
  if (a.hasLifeInsuranceForSuccession) { pts += 25; findings.push("Seguro de vida com finalidade sucessória."); }
  else { recommendations.push("Considerar seguro de vida como ferramenta de sucessão."); }
  return { score: clamp(pts), findings, recommendations };
}

function scoreEstrategia(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  const divMap = { none: 0, low: 20, medium: 40, high: 50 };
  pts += divMap[a.diversificationLevel];
  if (a.diversificationLevel === "high") findings.push("Carteira bem diversificada.");
  else if (a.diversificationLevel === "medium") findings.push("Diversificação moderada.");
  else { findings.push("Carteira pouco diversificada."); recommendations.push("Ampliar diversificação entre classes de ativos."); }
  if (a.hasInternationalAssets) { pts += 20; findings.push("Exposição internacional presente."); }
  else { recommendations.push("Considerar alocação em ativos internacionais."); }
  if (a.hasAlternativeAssets) { pts += 15; findings.push("Ativos alternativos na carteira."); }
  if (a.reviewsPortfolioRegularly) { pts += 15; findings.push("Revisão periódica com assessor."); }
  else { recommendations.push("Estabelecer ciclo regular de revisão de carteira."); }
  return { score: clamp(pts), findings, recommendations };
}

function scoreCambio(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  const expMap = { none: 100, low: 70, medium: 40, high: 10 };
  if (a.fxExposureLevel === "none") { pts = 100; findings.push("Sem exposição cambial identificada."); }
  else {
    findings.push(`Exposição cambial ${a.fxExposureLevel === "low" ? "baixa" : a.fxExposureLevel === "medium" ? "média" : "alta"}.`);
    pts = a.hasFxProtection ? Math.min(expMap[a.fxExposureLevel] + 30, 100) : expMap[a.fxExposureLevel];
    if (a.hasFxProtection) findings.push("Possui proteção cambial ativa.");
    else recommendations.push("Implementar proteção cambial proporcional à exposição.");
  }
  return { score: clamp(pts), findings, recommendations };
}

function scoreInflacao(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  if (a.hasRealAssets) { pts += 35; findings.push("Possui ativos reais (imóveis, ouro, commodities)."); }
  else { recommendations.push("Considerar alocação em ativos reais para proteção inflacionária."); }
  if (a.hasIPCALinkedAssets) { pts += 40; findings.push("Possui ativos indexados ao IPCA."); }
  else { recommendations.push("Incluir títulos IPCA+ na carteira."); }
  if (a.inflationProtectionAdequate) { pts += 25; findings.push("Proteção inflacionária considerada adequada."); }
  else { recommendations.push("Revisar adequação da proteção inflacionária da carteira."); }
  return { score: clamp(pts), findings, recommendations };
}

function scoreObjetivos(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  if (a.hasDocumentedGoals) { pts += 40; findings.push("Objetivos financeiros documentados."); }
  else { findings.push("Sem objetivos financeiros formalizados."); recommendations.push("Documentar objetivos com valor e prazo definidos."); }
  if (a.goalsHaveDeadline) { pts += 30; findings.push("Metas com prazo definido."); }
  else { recommendations.push("Definir prazos claros para cada objetivo financeiro."); }
  if (a.goalsHaveDedicatedAccount) { pts += 30; findings.push("Investimentos separados por objetivo."); }
  else { recommendations.push("Segregar investimentos por objetivo para maior controle."); }
  return { score: clamp(pts), findings, recommendations };
}

function scoreLiberdade(a: DiagnosticAnswers) {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let pts = 0;
  const { monthlyPassiveIncome, targetPassiveIncome, fireTargetAge, currentAge, totalInvestedAssets } = a;
  if (targetPassiveIncome > 0) {
    const incomeProgress = Math.min((monthlyPassiveIncome / targetPassiveIncome) * 100, 100);
    pts += incomeProgress * 0.5;
    findings.push(`Renda passiva: ${Math.round(incomeProgress)}% da meta.`);
    if (incomeProgress < 30) recommendations.push("Acelerar construção de renda passiva.");
  } else {
    findings.push("Meta de renda passiva não definida.");
    recommendations.push("Definir valor de renda passiva necessária para independência financeira.");
  }
  if (totalInvestedAssets > 0 && targetPassiveIncome > 0) {
    const requiredAssets = (targetPassiveIncome * 12) / 0.04;
    const assetProgress = Math.min((totalInvestedAssets / requiredAssets) * 100, 100);
    pts += assetProgress * 0.5;
    findings.push(`Patrimônio: ${Math.round(assetProgress)}% do necessário para IF.`);
    const yearsLeft = Math.max(0, fireTargetAge - currentAge);
    if (assetProgress < 30) recommendations.push("Aumentar taxa de investimento para atingir IF no prazo.");
    if (yearsLeft < 5 && assetProgress < 80) recommendations.push("Prazo curto — avaliar revisão da meta ou aceleração da estratégia.");
  } else {
    findings.push("Patrimônio investido não informado.");
    recommendations.push("Informar patrimônio investido total para cálculo de liberdade financeira.");
  }
  return { score: clamp(pts), findings, recommendations };
}

export function calculateDiagnostic(answers: DiagnosticAnswers): DiagnosticResult {
  const categoryDefs = [
    { id: "liquidez", label: "Liquidez", description: "Reserva de emergência e acesso rápido a recursos", icon: "Droplets", weight: 1, fn: () => scoreLiquidez(answers) },
    { id: "sucessao", label: "Sucessão", description: "Planejamento hereditário e estrutura patrimonial", icon: "GitBranch", weight: 1, fn: () => scoreSucessao(answers) },
    { id: "estrategia", label: "Estratégia", description: "Diversificação e gestão ativa da carteira", icon: "BarChart3", weight: 1, fn: () => scoreEstrategia(answers) },
    { id: "cambio", label: "Câmbio", description: "Proteção contra variação cambial", icon: "DollarSign", weight: 1, fn: () => scoreCambio(answers) },
    { id: "inflacao", label: "Inflação", description: "Proteção do poder de compra no longo prazo", icon: "TrendingUp", weight: 1, fn: () => scoreInflacao(answers) },
    { id: "objetivos", label: "Objetivos de vida", description: "Metas financeiras com prazo e destino definidos", icon: "Target", weight: 1, fn: () => scoreObjetivos(answers) },
    { id: "liberdade", label: "Liberdade financeira", description: "Progresso em direção à independência financeira", icon: "Flame", weight: 1, fn: () => scoreLiberdade(answers) },
  ];

  const categories: CategoryResult[] = categoryDefs.map((def) => {
    const { score, findings, recommendations } = def.fn();
    return { id: def.id, label: def.label, description: def.description, icon: def.icon, score, riskLevel: riskFromScore(score), weight: def.weight, findings, recommendations };
  });

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const overallScore = clamp(Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight));

  return { overallScore, overallRisk: riskFromScore(overallScore), categories, createdAt: new Date().toISOString() };
}
