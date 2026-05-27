import { ClipboardCheck, Sunset, Shield, Receipt, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import { ALOCACAO_PADRAO } from "@/lib/carteira/types";
import type { FinancialPlan, AtivoAtual } from "@/types/financialPlanning";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface FinancialPlanDashboardProps {
  plan: FinancialPlan;
  clientName: string;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onPrint: (type: "advisor" | "client") => void;
  onAvancarEstrategia: () => void;
  allStepsDone?: boolean;
  ultimoSalvo?: Date | null;
}

// ─── ITCMD por estado ──────────────────────────────────────────────────────────

function calcularAliquotaITCMD(estado: string): number {
  const aliquotas: Record<string, number> = {
    AC: 0.04, AL: 0.04, AP: 0.04, AM: 0.02,
    BA: 0.08, CE: 0.08, DF: 0.06, ES: 0.04,
    GO: 0.04, MA: 0.04, MT: 0.04, MS: 0.06,
    MG: 0.05, PA: 0.04, PB: 0.04, PR: 0.04,
    PE: 0.08, PI: 0.04, RJ: 0.08, RN: 0.03,
    RS: 0.06, RO: 0.04, RR: 0.04, SC: 0.08,
    SP: 0.04, SE: 0.08, TO: 0.02,
  };
  return aliquotas[estado?.toUpperCase()] ?? 0.04;
}

// ─── AA helpers ────────────────────────────────────────────────────────────────

// Grupos consolidados para comparar AtivoAtual (que usa rendaFixa/rvGlobal)
// com ALOCACAO_PADRAO (que usa resgate_longo/resgate_rapido/exterior)
type GruposAA = {
  "Renda Fixa": number;
  "Ações": number;
  "FIIs": number;
  "Internacional": number;
  "Cripto": number;
};

const GRUPOS_AA_COLORS: Record<keyof GruposAA, string> = {
  "Renda Fixa":    "#1E40AF",
  "Ações":         "#15803D",
  "FIIs":          "#059669",
  "Internacional": "#B45309",
  "Cripto":        "#1D4ED8",
};

function getMetaAA(perfil: string): GruposAA | null {
  const m = ALOCACAO_PADRAO[perfil];
  if (!m) return null;
  return {
    "Renda Fixa":    m.resgate_longo + m.resgate_rapido,
    "Ações":         m.acoes,
    "FIIs":          m.fiis,
    "Internacional": m.exterior,
    "Cripto":        m.cripto,
  };
}

function getAtualAA(a: AtivoAtual): GruposAA | null {
  const total = a.total || (a.rendaFixa + a.acoes + a.fiis + a.rvGlobal + a.rfGlobal + a.cripto);
  if (!total) return null;
  return {
    "Renda Fixa":    (a.rendaFixa / total) * 100,
    "Ações":         (a.acoes / total) * 100,
    "FIIs":          (a.fiis / total) * 100,
    "Internacional": ((a.rvGlobal + a.rfGlobal) / total) * 100,
    "Cripto":        (a.cripto / total) * 100,
  };
}

// ─── Gauge semicircular ────────────────────────────────────────────────────────

function GaugeHeader({ score, color }: { score: number; color: string }) {
  const r = 36, cx = 44, cy = 44;
  const circ = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <svg width="88" height="50" viewBox="0 0 88 50">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
    </svg>
  );
}

function GaugeCard({ score, color, semDados }: { score: number; color: string; semDados?: boolean }) {
  const r = 36, cx = 44, cy = 44;
  const circ = Math.PI * r;
  const filled = semDados ? 0 : (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <svg viewBox="0 0 88 52" style={{ width: "100%", height: 80 }} preserveAspectRatio="xMidYMid meet">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      {!semDados && filled > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
      )}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="20" fontWeight="700" fill={semDados ? "#9CA3AF" : color}>
        {semDados ? "—" : score}
      </text>
      <text x={cx} y={cy - 12} dy="14" textAnchor="middle" fontSize="9" fill="#9CA3AF">/100</text>
    </svg>
  );
}

// ─── Score / level helpers ─────────────────────────────────────────────────────

function nivelScore(s: number): { label: string; cor: string; bg: string } {
  if (s >= 70) return { label: "Adequado", cor: "#15803D", bg: "#DCFCE7" };
  if (s >= 40) return { label: "Atenção",  cor: "#B45309", bg: "#FEF3C7" };
  return            { label: "Risco",    cor: "#B91C1C", bg: "#FEE2E2" };
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const n = nivelScore(score);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: n.bg, color: n.cor }}>
      {n.label}
    </span>
  );
}

function CardHeader({ Icon, title, score, color }: {
  Icon: React.ElementType; title: string; score: number; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <Icon style={{ width: 20, height: 20, color }} />
      <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</p>
      <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 4, backgroundColor: "#F0F7FF", color: "#111827" }}>{score}/100</span>
      <ScoreBadge score={score} />
    </div>
  );
}

function MetricGrid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color ?? "#111827", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: ok ? "#DCFCE7" : "#FEE2E2", color: ok ? "#15803D" : "#B91C1C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {ok ? "✓" : "✗"}
      </span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", margin: 0 }}>{label}</p>
        {detail && <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>{detail}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  onAvancarEstrategia,
}: FinancialPlanDashboardProps) {
  const dc       = plan.dadosCliente;
  const pif      = plan.planejamentoIF;
  const protecao = plan.protecao;
  const suc      = plan.sucessorio;
  const fiscal   = plan.fiscal;

  // ── "—" helper — mostra traço em vez de R$ 0,00 ─────────────────────────────
  const fmt0 = (v: number | undefined) => (v && v > 0 ? formatCurrency(v) : "—");

  // ── Renda total ──────────────────────────────────────────────────────────────
  const rendaMensal      = Number(dc.rendaMensal) || 0;
  const rendaImovel      = dc.possuiImovelRenda ? (Number(dc.rendaImovelMensal) || 0) : 0;
  const rendaMensalTotal = rendaMensal + rendaImovel;
  const rendaAnualTotal  = rendaMensalTotal * 12;

  // ── Patrimônio ───────────────────────────────────────────────────────────────
  const patrimonioFinanceiro = Number(dc.patrimonioFinanceiroEstimado) || 0;
  const patrimonioTotal      = Number(dc.patrimonioTotalEstimado) || 0;

  // ── Aporte ───────────────────────────────────────────────────────────────────
  const aporteMensal = Number(dc.aportesMensalMedio) || 0;

  // ── Idade ────────────────────────────────────────────────────────────────────
  const idadeAtual = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  // ── IF ───────────────────────────────────────────────────────────────────────
  const idadeMeta     = Number(pif.idadeMeta) || 60;
  const rendaDesejada = Number(pif.rendaMensalDesejada) || 0;

  const TAXA_RET_MENSAL    = Math.pow(1.04, 1 / 12) - 1;
  const mesesRet           = Math.max(0, (90 - idadeMeta) * 12);
  const patrimonioNecessario = mesesRet > 0 && rendaDesejada > 0
    ? rendaDesejada * (1 - Math.pow(1 + TAXA_RET_MENSAL, -mesesRet)) / TAXA_RET_MENSAL
    : 0;

  const taxaRealMensal  = Math.pow(1.067, 1 / 12) - 1;
  const mesesAcumulacao = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const projecaoIF = mesesAcumulacao > 0
    ? patrimonioFinanceiro * Math.pow(1 + taxaRealMensal, mesesAcumulacao)
      + aporteMensal * (Math.pow(1 + taxaRealMensal, mesesAcumulacao) - 1) / taxaRealMensal
    : patrimonioFinanceiro;
  const gapIF = patrimonioNecessario - projecaoIF;

  // ── Proteção ─────────────────────────────────────────────────────────────────
  const numeroDependentes   = Number(protecao.dependentes) || 0;
  const anosDepend          = Math.max(1, numeroDependentes > 0 ? 15 : 10);
  const valorSeguroVida     = Number(protecao.capitalSeguradoVida) || 0;
  const valorSeguroInvalidez = Number(protecao.capitalSeguradoInvalidez) || 0;
  const capitalAtual        = valorSeguroVida + valorSeguroInvalidez;
  const capitalNecessario   = rendaMensalTotal * 12 * anosDepend;
  const gapProtecao         = capitalNecessario - capitalAtual;

  // ── Fiscal ───────────────────────────────────────────────────────────────────
  const rendaAnualFiscal = Number(fiscal.rendaBrutaAnual) || rendaAnualTotal;
  const tetoPGBL         = rendaAnualFiscal * 0.12;
  const saldoPrevidencia = Number(dc.saldoPrevidencia) || 0;
  const pgblAtual        = dc.possuiPrevidencia ? saldoPrevidencia : 0;
  const espacoPGBL       = Math.max(0, tetoPGBL - pgblAtual);

  // ── Sucessório ───────────────────────────────────────────────────────────────
  const estado          = dc.estado || "SP";
  const aliquota        = calcularAliquotaITCMD(estado);
  const itcmdEstimado   = patrimonioTotal * aliquota;
  const custoInventario = patrimonioTotal * 0.10;

  // ── Asset Allocation ─────────────────────────────────────────────────────────
  const totalCarteira = plan.ativosAtuais.total ||
    (plan.ativosAtuais.rendaFixa + plan.ativosAtuais.acoes + plan.ativosAtuais.fiis +
     plan.ativosAtuais.rvGlobal + plan.ativosAtuais.rfGlobal + plan.ativosAtuais.cripto);

  const metaAA   = dc.suitabilityPerfil ? getMetaAA(dc.suitabilityPerfil) : null;
  const atualAA  = totalCarteira > 0 ? getAtualAA(plan.ativosAtuais) : null;
  const classesComValor = atualAA
    ? (Object.values(atualAA) as number[]).filter((v) => v > 0).length
    : 0;
  const desvioMedio = metaAA && atualAA
    ? (Object.keys(metaAA) as (keyof GruposAA)[]).reduce(
        (s, k) => s + Math.abs((atualAA[k] ?? 0) - metaAA[k]), 0
      ) / Object.keys(metaAA).length
    : null;

  // ── Scores ───────────────────────────────────────────────────────────────────

  const scoreAA = (() => {
    if (dc.comecandoDoZero) return 50;
    if (!dc.suitabilityPerfil) return 0;
    if (!metaAA) return 30;
    if (!atualAA) return 20;
    const dev = desvioMedio ?? 100;
    return Math.max(0, Math.min(100, Math.round(100 - dev * 3)));
  })();

  const scoreIF = (() => {
    if (!rendaDesejada || patrimonioNecessario === 0) return 0;
    return Math.min(100, Math.round((projecaoIF / patrimonioNecessario) * 100));
  })();

  const scoreProtecao = (() => {
    if (capitalNecessario === 0) return 50;
    if (capitalAtual === 0) return 0;
    return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
  })();

  const scoreFiscal = (() => {
    let s = 0;
    if (fiscal.tipoDeclaracao && fiscal.tipoDeclaracao !== "nao_sei") s += 30;
    if (dc.possuiPrevidencia) s += 40;
    if (tetoPGBL > 0 && espacoPGBL < tetoPGBL * 0.3) s += 30;
    return s;
  })();

  const scoreSucessorio = (() => {
    let s = 0;
    if (suc.possuiTestamento) s += 35;
    if (suc.possuiHolding) s += 35;
    if (suc.seguroComBeneficiario || suc.previdenciaComBeneficiario) s += 30;
    return s;
  })();

  // ── Perfil / data ────────────────────────────────────────────────────────────
  const perfil = dc.suitabilityPerfil ?? plan.suitability?.perfil ?? null;
  const hoje   = new Date().toLocaleDateString("pt-BR");

  // ── "Sem dados" flags ────────────────────────────────────────────────────────
  const semDadosAA         = !dc.comecandoDoZero && !dc.suitabilityPerfil;
  const semDadosIF         = rendaDesejada === 0;
  const semDadosProtecao   = rendaMensalTotal === 0;
  const semDadosFiscal     = rendaAnualFiscal === 0;
  const semDadosSucessorio = patrimonioTotal === 0;

  const scoreProtecaoSucessorio = Math.round((scoreProtecao + scoreSucessorio) / 2);
  const semDadosPS = semDadosProtecao && semDadosSucessorio;

  const scoreGeral = Math.round((scoreAA + scoreIF + scoreProtecaoSucessorio + scoreFiscal) / 4);
  const nivelGeral = nivelScore(scoreGeral);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", padding: "24px 32px", boxSizing: "border-box" }}>

      {/* ── BLOCO 1: Banner ───────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ClipboardCheck style={{ width: 20, height: 20, color: "#2563EB", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>Diagnóstico inicial gerado automaticamente</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Revise os resultados e avance para a Estratégia Inicial</p>
          </div>
        </div>
        <button
          onClick={onAvancarEstrategia}
          style={{ backgroundColor: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
        >
          Montar Estratégia Inicial →
        </button>
      </div>

      {/* ── BLOCO 2: Header com Score Geral ───────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{clientName}</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 10px" }}>Diagnóstico · {hoje}</p>
            {perfil && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF" }}>
                Perfil: {PERFIL_LABELS[perfil]}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Score Geral</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "center" }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: "#111827", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{scoreGeral}</span>
                <span style={{ fontSize: 16, color: "#9CA3AF" }}>/100</span>
              </div>
              <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: nivelGeral.bg, color: nivelGeral.cor }}>
                  {nivelGeral.label}
                </span>
              </div>
            </div>
            <GaugeHeader score={scoreGeral} color={nivelGeral.cor} />
          </div>
        </div>
      </div>

      {/* ── BLOCO 3: 4 Cards de Score ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {([
          { Icon: PieChart, label: "Asset Allocation",      score: scoreAA,                 color: "#2563EB", semDados: semDadosAA },
          { Icon: Sunset,   label: "Aposentadoria / IF",    score: scoreIF,                 color: "#059669", semDados: semDadosIF },
          { Icon: Shield,   label: "Proteção e Sucessório", score: scoreProtecaoSucessorio, color: "#B91C1C", semDados: semDadosPS },
          { Icon: Receipt,  label: "Planejamento Fiscal",   score: scoreFiscal,             color: "#B45309", semDados: semDadosFiscal },
        ] as const).map(({ Icon, label, score, color, semDados }) => {
          const nivel = nivelScore(score);
          return (
            <div key={label} style={{ backgroundColor: "white", borderRadius: 12, padding: 20, borderTop: `3px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Icon style={{ width: 24, height: 24, color }} />
              <GaugeCard score={score} color={color} semDados={semDados} />
              <p style={{ fontSize: 13, color: "#374151", textAlign: "center", margin: 0, fontWeight: 500 }}>{label}</p>
              {semDados ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F3F4F6", color: "#6B7280" }}>Sem dados</span>
                  <p style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", margin: 0 }}>Complete a coleta de dados</p>
                </>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: nivel.bg, color: nivel.cor }}>
                  {nivel.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── BLOCO 4A: Card Asset Allocation ───────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #2563EB" }}>
        <CardHeader Icon={PieChart} title="Asset Allocation" score={scoreAA} color="#2563EB" />

        {semDadosAA ? (
          <div style={{ textAlign: "center", padding: "24px 16px", backgroundColor: "#F8FAFF", borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Defina o perfil de risco na Coleta de Dados para ver o diagnóstico de Asset Allocation</p>
          </div>
        ) : dc.comecandoDoZero ? (
          <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "16px 20px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF", marginBottom: 8, display: "inline-block" }}>Iniciante</span>
            <p style={{ fontSize: 13, color: "#374151", margin: "8px 0 4px" }}>Cliente está iniciando a jornada de investimentos.</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
              Perfil definido: <strong>{perfil ? PERFIL_LABELS[perfil] : "Não definido"}</strong>
            </p>
          </div>
        ) : !atualAA || totalCarteira === 0 ? (
          <div>
            <MetricGrid cols={2}>
              <Metric label="Patrimônio Financeiro" value={fmt0(patrimonioFinanceiro)} />
              <Metric label="Perfil" value={perfil ? PERFIL_LABELS[perfil] : "—"} />
            </MetricGrid>
            <div style={{ textAlign: "center", padding: "20px 16px", backgroundColor: "#F8FAFF", borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Carteira não montada ainda. Complete a seção Investimentos para ver o diagnóstico.</p>
            </div>
          </div>
        ) : (
          <>
            <MetricGrid cols={2}>
              <Metric label="Patrimônio Financeiro" value={fmt0(patrimonioFinanceiro)} />
              <Metric label="Perfil" value={perfil ? PERFIL_LABELS[perfil] : "—"} />
              <Metric label="Classes na carteira" value={String(classesComValor)} />
              <Metric label="Desvio da meta" value={desvioMedio !== null ? `${desvioMedio.toFixed(1)}%` : "—"} color={desvioMedio !== null && desvioMedio > 10 ? "#B91C1C" : "#15803D"} />
            </MetricGrid>

            {/* Tabela de alocação */}
            <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", backgroundColor: "#F8FAFF", padding: "8px 14px", borderBottom: "1px solid #E5E7EB" }}>
                {["Classe", "% Atual", "% Meta", "Dif."].map((h) => (
                  <p key={h} style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", margin: 0 }}>{h}</p>
                ))}
              </div>
              {(Object.keys(atualAA) as (keyof GruposAA)[]).map((grupo) => {
                const a = atualAA[grupo] ?? 0;
                const m = metaAA ? (metaAA[grupo] ?? 0) : 0;
                const dif = a - m;
                return (
                  <div key={grupo} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "9px 14px", borderBottom: "1px solid #F3F4F6", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: GRUPOS_AA_COLORS[grupo], flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#111827" }}>{grupo}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{a.toFixed(1)}%</span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{m.toFixed(1)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: dif > 2 ? "#15803D" : dif < -2 ? "#B91C1C" : "#9CA3AF" }}>
                      {dif >= 0 ? "+" : ""}{dif.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── BLOCO 4B: Card Aposentadoria / IF ─────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #059669" }}>
        <CardHeader Icon={Sunset} title="Aposentadoria / IF" score={scoreIF} color="#059669" />
        {semDadosIF ? (
          <div style={{ textAlign: "center", padding: "24px 16px", backgroundColor: "#F8FAFF", borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Preencha a Renda Desejada na IF para ver o diagnóstico</p>
          </div>
        ) : (
          <>
            <MetricGrid cols={2}>
              <Metric label="Patrimônio Necessário" value={fmt0(patrimonioNecessario)} />
              <Metric label="Projeção com Aportes"  value={fmt0(projecaoIF)} />
              <Metric label="Gap Patrimonial"       value={formatCurrency(Math.abs(gapIF))} color={gapIF <= 0 ? "#15803D" : "#B91C1C"} />
              <Metric label="Aporte Atual"          value={aporteMensal > 0 ? `${formatCurrency(aporteMensal)}/mês` : "—"} />
            </MetricGrid>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
              Para se aposentar aos {idadeMeta} anos com renda de {formatCurrency(rendaDesejada)}/mês,
              são necessários {formatCurrency(patrimonioNecessario)}.
            </p>
          </>
        )}
      </div>

      {/* ── BLOCO 4C: Card Proteção e Sucessório ──────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #B91C1C" }}>
        <CardHeader Icon={Shield} title="Proteção e Sucessório" score={scoreProtecaoSucessorio} color="#B91C1C" />

        {semDadosPS ? (
          <div style={{ textAlign: "center", padding: "24px 16px", backgroundColor: "#F8FAFF", borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Preencha a Renda Mensal e o Patrimônio Total para ver o diagnóstico</p>
          </div>
        ) : (
          <>
            {/* Sub-seção: Proteção */}
            {semDadosProtecao ? (
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "#F8FAFF", borderRadius: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Preencha a Renda Mensal para ver o diagnóstico de proteção</p>
              </div>
            ) : (
              <>
                <MetricGrid cols={3}>
                  <Metric label="Capital Necessário" value={fmt0(capitalNecessario)} />
                  <Metric label="Capital Atual"       value={capitalAtual > 0 ? formatCurrency(capitalAtual) : "—"} />
                  <Metric label="Gap de Cobertura"    value={formatCurrency(Math.abs(gapProtecao))} color={gapProtecao <= 0 ? "#15803D" : "#B91C1C"} />
                </MetricGrid>
                <div style={{ marginBottom: 8 }}>
                  <CheckRow ok={protecao.possuiSeguroVida} label="Seguro de vida"
                    detail={protecao.possuiSeguroVida ? formatCurrency(valorSeguroVida) : "Não possui"} />
                  <CheckRow ok={protecao.possuiSeguroInvalidez} label="Seguro de invalidez"
                    detail={protecao.possuiSeguroInvalidez ? formatCurrency(valorSeguroInvalidez) : "Não possui"} />
                  <CheckRow ok={protecao.possuiPlanoSaude} label="Plano de saúde" />
                  <CheckRow ok={!!protecao.temOutroSeguro} label="Outro seguro"
                    detail={protecao.temOutroSeguro && protecao.descricaoOutroSeguro ? protecao.descricaoOutroSeguro : undefined} />
                </div>
              </>
            )}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                Planejamento Sucessório
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </div>

            {/* Sub-seção: Sucessório */}
            {semDadosSucessorio ? (
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "#F8FAFF", borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Informe o Patrimônio Total para ver os cálculos sucessórios</p>
              </div>
            ) : (
              <>
                <MetricGrid cols={2}>
                  <Metric label="Patrimônio Total"    value={fmt0(patrimonioTotal)} />
                  <Metric label="ITCMD Estimado"      value={fmt0(itcmdEstimado)}   color="#B91C1C" />
                  <Metric label="Custo do Inventário" value={fmt0(custoInventario)} color="#B91C1C" />
                  <Metric label="Estado"              value={dc.estado || "—"} />
                </MetricGrid>
                <div style={{ marginBottom: 12 }}>
                  <CheckRow ok={suc.possuiTestamento}           label="Testamento" />
                  <CheckRow ok={suc.possuiHolding}              label="Holding familiar" />
                  <CheckRow ok={suc.doacoesVida}                label="Doações em vida" />
                  <CheckRow ok={suc.seguroComBeneficiario}      label="Seguro com beneficiário" />
                  <CheckRow ok={suc.previdenciaComBeneficiario} label="Previdência com beneficiário" />
                </div>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                  ITCMD estimado de {formatCurrency(itcmdEstimado)} mais custo de inventário
                  de {formatCurrency(custoInventario)}, totalizando{" "}
                  {formatCurrency(itcmdEstimado + custoInventario)} sobre o patrimônio em caso de falecimento.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* ── BLOCO 4D: Card Fiscal ──────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #B45309" }}>
        <CardHeader Icon={Receipt} title="Planejamento Fiscal" score={scoreFiscal} color="#B45309" />
        <MetricGrid cols={2}>
          <Metric label="Renda Anual Bruta"      value={fmt0(rendaAnualFiscal)} />
          <Metric label="Teto PGBL (12%)"        value={fmt0(tetoPGBL)} />
          <Metric label="Espaço Disponível PGBL" value={fmt0(espacoPGBL)} color={espacoPGBL > 0 ? "#B45309" : "#15803D"} />
          <Metric label="Tipo Declaração"
            value={
              fiscal.tipoDeclaracao === "completa"     ? "Declaração completa"     :
              fiscal.tipoDeclaracao === "simplificada" ? "Declaração simplificada" : "—"
            }
          />
        </MetricGrid>
        <div>
          <CheckRow ok={fiscal.temEmpresa} label="Tem empresa (CNPJ)" />
          <CheckRow
            ok={!!dc.possuiPrevidencia}
            label="Possui previdência privada"
            detail={dc.possuiPrevidencia
              ? `${dc.tipoPrevidencia?.toUpperCase() ?? ""}${dc.tipoPrevidencia ? " · " : ""}Saldo: ${fmt0(saldoPrevidencia)}`
              : undefined
            }
          />
          <CheckRow
            ok={fiscal.temRendimentosIsentos}
            label="Rendimentos isentos"
            detail={fiscal.temRendimentosIsentos && fiscal.tiposRendimentosIsentos?.length
              ? fiscal.tiposRendimentosIsentos.join(", ")
              : undefined
            }
          />
        </div>
      </div>

    </div>
  );
}
