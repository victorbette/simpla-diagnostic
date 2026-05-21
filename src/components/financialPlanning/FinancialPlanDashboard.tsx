import { useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Edit2, Save, Printer, Download, CheckCircle,
  TrendingUp, PieChart as PieIcon, Shield, Receipt, GitBranch,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularIF, calcularProtecao, calcularFiscal, calcularSucessorio,
  calcularAlocacaoAtual, calcularGapAlocacao, ALOCACAO_ALVO, PERFIL_LABELS,
} from "@/types/financialPlanning";
import type { FinancialPlan, MacroalocacaoAlvo, PlanejamentoIF } from "@/types/financialPlanning";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface FinancialPlanDashboardProps {
  plan: FinancialPlan;
  clientName: string;
  onEdit: () => void;
  onSave: () => void;
  onPrint: (type: "advisor" | "client") => void;
  onAvancarEstrategia: () => void;
  allStepsDone?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DARK = "#000000";

const ASSET_LABELS: Record<keyof MacroalocacaoAlvo, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};

const ASSET_COLORS: Record<keyof MacroalocacaoAlvo, string> = {
  rendaFixa: "#3b82f6",
  acoes: "#10b981",
  fiis: "#f59e0b",
  rvGlobal: "#8b5cf6",
  rfGlobal: "#14b8a6",
  cripto: "#f97316",
};

const ASSET_KEYS = Object.keys(ASSET_LABELS) as (keyof MacroalocacaoAlvo)[];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#3D6B41";
  if (score >= 40) return "#8A7A45";
  return "#7A3535";
}

function scoreBadge(score: number, semDados: boolean): { text: string; bg: string; color: string } {
  if (semDados) return { text: "Sem dados", bg: "#F5F3EE", color: "#6B6347" };
  if (score >= 70) return { text: "Adequado", bg: "#EBF2EC", color: "#3D6B41" };
  if (score >= 40) return { text: "Atenção", bg: "#F5F0E0", color: "#8A7A45" };
  return { text: "Risco", bg: "#FEF2F2", color: "#7A3535" };
}

function perfilStyle(perfil: string): { bg: string; color: string } {
  if (perfil === "conservador") return { bg: "#F0FDFA", color: "#0F766E" };
  if (perfil === "moderado" || perfil === "conservador_moderado") return { bg: "#F5F0E0", color: "#8A7A45" };
  return { bg: "#FEF2F2", color: "#7A3535" };
}

function aaScore(gap: MacroalocacaoAlvo | null): number {
  if (!gap) return 50;
  const totalGap = ASSET_KEYS.reduce((s, k) => s + Math.abs(gap[k]), 0);
  return Math.max(0, Math.round(100 - totalGap));
}

function fiscalScore(economiaAtual: number, economiaPotencial: number): number {
  if (economiaPotencial <= 0) return 100;
  return Math.round((economiaAtual / economiaPotencial) * 100);
}

function sucScore(plan: FinancialPlan, pctCusto: number): number {
  let pts = 0;
  if (plan.sucessorio.possuiTestamento) pts += 30;
  if (plan.sucessorio.possuiHolding) pts += 30;
  if (plan.sucessorio.possuiSeguroVidaSucessao) pts += 20;
  if (pctCusto < 5) pts += 20;
  else if (pctCusto < 8) pts += 10;
  return Math.min(100, pts);
}

function formatAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function gerarProjecao(p: PlanejamentoIF, meta: number) {
  const anos = Math.max(1, p.idadeMeta - p.idadeAtual);
  const taxaMensal = p.taxaRetornoAnual / 100 / 12;
  const data: Array<{ idade: string; projecao: number; meta: number }> = [];
  let patrimonio = p.patrimonioAtual;
  for (let i = 0; i <= anos; i++) {
    data.push({ idade: String(p.idadeAtual + i), projecao: Math.round(patrimonio), meta: Math.round(meta) });
    for (let m = 0; m < 12; m++) {
      patrimonio = patrimonio * (1 + taxaMensal) + p.aporteMensal;
    }
  }
  return data;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Gauge({ score, color, semDados }: { score: number; color: string; semDados?: boolean }) {
  const r = 36, cx = 46, cy = 44;
  const circumference = Math.PI * r;
  const filled = semDados ? 0 : (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <svg width="92" height="52" viewBox="0 0 92 52">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E2DCC8" strokeWidth="8" strokeLinecap="round" />
      {!semDados && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} />
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="16" fontWeight="700" fill={semDados ? "#9E9070" : color}>
        {semDados ? "—" : score}
      </text>
    </svg>
  );
}

function ScoreCard({ icon: Icon, label, score, color, semDados }: {
  icon: React.ElementType; label: string; score: number; color: string; semDados?: boolean;
}) {
  const badge = scoreBadge(score, semDados ?? false);
  return (
    <div style={{ backgroundColor: "white", borderRadius: 12, padding: 20, borderTop: `3px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <Icon style={{ width: 22, height: 22, color }} />
      <Gauge score={score} color={color} semDados={semDados} />
      <p style={{ fontSize: 12, color: "#3D3520", textAlign: "center", margin: 0, fontWeight: 500 }}>{label}</p>
      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: badge.bg, color: badge.color }}>
        {badge.text}
      </span>
      {semDados && <p style={{ fontSize: 10, color: "#9E9070", textAlign: "center", margin: 0 }}>Complete a etapa</p>}
    </div>
  );
}

function SectionCard({ title, score, color, semDados, onAprofundar, children }: {
  title: string; score: number; color: string; semDados?: boolean; onAprofundar?: () => void; children: React.ReactNode;
}) {
  const badge = scoreBadge(score, semDados ?? false);
  return (
    <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: 0 }}>{title}</p>
          {!semDados && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 4, backgroundColor: "#F5F3EE", color: "#3D3520" }}>
              {score}/100
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: badge.bg, color: badge.color }}>
            {badge.text}
          </span>
        </div>
        {onAprofundar && (
          <button onClick={onAprofundar} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #E2DCC8", backgroundColor: "transparent", color: "#3D3520", cursor: "pointer", flexShrink: 0 }}>
            Aprofundar →
          </button>
        )}
      </div>
      {semDados ? (
        <div style={{ textAlign: "center", padding: "32px 16px", backgroundColor: "#F5F3EE", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#9E9070" }}>Complete a etapa para ver o diagnóstico</p>
        </div>
      ) : children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 8, borderBottom: "1px solid #F5F3EE", marginBottom: 0 }}>
      <span style={{ color: "#6B6347" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? DARK, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  onEdit,
  onSave,
  onPrint,
  onAvancarEstrategia,
  allStepsDone: _allStepsDone,
}: FinancialPlanDashboardProps) {
  // ── Calculations ──────────────────────────────────────────────────────────
  const ifResult = useMemo(() => calcularIF(plan.planejamentoIF), [plan.planejamentoIF]);
  const protResult = useMemo(() => calcularProtecao(plan.protecao), [plan.protecao]);
  const fiscalResult = useMemo(() => calcularFiscal(plan.fiscal), [plan.fiscal]);
  const sucResult = useMemo(() => calcularSucessorio(plan.sucessorio), [plan.sucessorio]);

  const ativosTotal =
    plan.ativosAtuais.total ||
    plan.ativosAtuais.rendaFixa + plan.ativosAtuais.acoes + plan.ativosAtuais.fiis +
    plan.ativosAtuais.rvGlobal + plan.ativosAtuais.rfGlobal + plan.ativosAtuais.cripto;

  const alocacaoAtual = useMemo(
    () => calcularAlocacaoAtual({ ...plan.ativosAtuais, total: ativosTotal || 1 }),
    [plan.ativosAtuais, ativosTotal]
  );
  const alvo = plan.suitability ? ALOCACAO_ALVO[plan.suitability.perfil] : null;
  const gapAloc = alvo ? calcularGapAlocacao(alocacaoAtual, alvo) : null;

  // ── Scores ────────────────────────────────────────────────────────────────
  const semDadosAA = ativosTotal === 0;
  const semDadosProtecao = plan.protecao.rendaMensal === 0;
  const semDadosFiscal = plan.fiscal.rendaBrutaAnual === 0;
  const semDadosSucessorio = plan.sucessorio.patrimonioTotal === 0;

  const aaS = aaScore(gapAloc);
  const ifS = Math.round(ifResult.percentualIF);
  const protS = Math.round(protResult.percentualCoberto);
  const fiscS = fiscalScore(fiscalResult.economiaFiscalAtual, fiscalResult.economiaFiscalPotencial);
  const sucS = sucScore(plan, sucResult.percentualCusto);

  const overallScore = Math.round(
    (aaS + ifS + protS + (semDadosFiscal ? 0 : fiscS) + (semDadosSucessorio ? 0 : sucS)) /
    (5 - (semDadosFiscal ? 1 : 0) - (semDadosSucessorio ? 1 : 0))
  );
  const overallBadge = scoreBadge(overallScore, false);
  const overallColor = scoreColor(overallScore);

  // ── Chart data ────────────────────────────────────────────────────────────
  const projecaoData = useMemo(
    () => gerarProjecao(plan.planejamentoIF, ifResult.patrimonioNecessario),
    [plan.planejamentoIF, ifResult.patrimonioNecessario]
  );
  const pieData = ASSET_KEYS.filter((k) => alocacaoAtual[k] > 0).map((k) => ({
    name: ASSET_LABELS[k], value: parseFloat(alocacaoAtual[k].toFixed(1)),
    color: ASSET_COLORS[k], valor: plan.ativosAtuais[k],
  }));
  const barData = ASSET_KEYS.map((k) => ({
    name: ASSET_LABELS[k], atual: parseFloat(alocacaoAtual[k].toFixed(1)), alvo: alvo ? alvo[k] : 0,
  }));
  const patrimonioFora = plan.sucessorio.possuiSeguroVidaSucessao ? plan.sucessorio.capitalSeguroVidaSucessao : 0;
  const patrimonioInv = Math.max(0, plan.sucessorio.patrimonioTotal - patrimonioFora);
  const sucPieData = [
    { name: "No inventário", value: patrimonioInv, color: "#ef4444" },
    { name: "Fora do inventário", value: patrimonioFora, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // ── Header ────────────────────────────────────────────────────────────────
  const perfil = plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const pStyle = perfil ? perfilStyle(perfil) : { bg: "#F5F3EE", color: "#6B6347" };
  const pgblPct = fiscalResult.tetoPGBL > 0
    ? Math.min(100, (plan.fiscal.valorPGBLAnual / fiscalResult.tetoPGBL) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── 1. Banner ─────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#EBF2EC", border: "1px solid #3D6B41", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <CheckCircle style={{ width: 20, height: 20, color: "#3D6B41", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#14532D", margin: "0 0 2px" }}>Diagnóstico inicial gerado com sucesso.</p>
            <p style={{ fontSize: 13, color: "#3D6B41", margin: 0 }}>Revise os resultados abaixo e, quando pronto, avance para montar a Estratégia Inicial.</p>
          </div>
        </div>
        <button onClick={onAvancarEstrategia} style={{ backgroundColor: DARK, color: "white", border: "none", borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
          Montar Estratégia Inicial →
        </button>
      </div>

      {/* ── 2. Header card ────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          {/* Left */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: DARK, margin: "0 0 4px" }}>{clientName}</h2>
            <p style={{ fontSize: 13, color: "#6B6347", margin: "0 0 8px" }}>Plano financeiro · {hoje}</p>
            {perfil && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: pStyle.bg, color: pStyle.color }}>
                Perfil: {PERFIL_LABELS[perfil]}
              </span>
            )}
          </div>
          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                { icon: Edit2, label: "Editar", onClick: onEdit },
                { icon: Save, label: "Salvar", onClick: onSave },
                { icon: Printer, label: "PDF Consultor", onClick: () => onPrint("advisor") },
                { icon: Download, label: "PDF Cliente", onClick: () => onPrint("client") },
              ] as const).map(({ icon: Icon, label, onClick }) => (
                <button key={label} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "1px solid #E2DCC8", backgroundColor: "white", color: "#3D3520", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  <Icon style={{ width: 13, height: 13 }} />
                  {label}
                </button>
              ))}
            </div>
            {/* Score */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Score geral</p>
              <p style={{ fontSize: 48, fontWeight: 800, color: DARK, margin: "0 0 4px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{overallScore}</p>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: overallBadge.bg, color: overallBadge.color }}>
                {overallBadge.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Score cards grid ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <ScoreCard icon={PieIcon}    label="Asset Allocation"  score={aaS}   color="#000000" semDados={semDadosAA} />
        <ScoreCard icon={TrendingUp} label="Aposentadoria / IF" score={ifS}  color="#3D6B41" />
        <ScoreCard icon={Shield}     label="Proteção"           score={protS} color="#7A3535" semDados={semDadosProtecao} />
        <ScoreCard icon={Receipt}    label="Planejamento Fiscal" score={fiscS} color="#8A7A45" semDados={semDadosFiscal} />
        <ScoreCard icon={GitBranch}  label="Sucessório"         score={sucS}  color="#2A4F6A" semDados={semDadosSucessorio} />
      </div>

      {/* ── 4. Asset Allocation detail ─────────────────────────────────────── */}
      <SectionCard title="Asset Allocation" score={aaS} color="#000000" semDados={semDadosAA}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <p style={{ fontSize: 12, color: "#6B6347", marginBottom: 8 }}>Alocação atual</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value}% (${formatCurrency((props.payload as { valor?: number }).valor ?? 0)})`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
                  {d.name} {d.value}%
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#6B6347", marginBottom: 8 }}>
              Atual vs. alvo{alvo && plan.suitability ? ` (${PERFIL_LABELS[plan.suitability.perfil]})` : ""}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={64} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="atual" name="Atual" fill="#000000" radius={[0, 2, 2, 0]} />
                <Bar dataKey="alvo" name="Alvo" fill="#DDD6FE" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* ── 5. Aposentadoria / IF detail ────────────────────────────────────── */}
      <SectionCard title="Aposentadoria / IF" score={ifS} color="#3D6B41">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Patrimônio necessário", value: formatCurrency(ifResult.patrimonioNecessario) },
                { label: "Projeção com aportes", value: formatCurrency(ifResult.patrimonioProjetado), color: "#3D6B41" },
                { label: ifResult.gap > 0 ? "Gap (falta)" : "Superávit", value: formatCurrency(Math.abs(ifResult.gap)), color: ifResult.gap > 0 ? "#7A3535" : "#3D6B41" },
                { label: "Renda desejada na IF", value: `${formatCurrency(plan.planejamentoIF.rendaMensalDesejada)}/mês` },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: color ?? DARK, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#6B6347" }}>Progresso rumo à IF</span>
              <span style={{ fontWeight: 600, color: "#3D6B41" }}>{formatNumber(ifResult.percentualIF, 0)}%</span>
            </div>
            <div style={{ height: 8, backgroundColor: "#E2DCC8", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, ifResult.percentualIF)}%`, backgroundColor: "#3D6B41", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#6B6347", marginBottom: 8 }}>Projeção patrimonial por idade</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={projecaoData}>
                <defs>
                  <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3D6B41" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3D6B41" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="idade" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} labelFormatter={(l) => `Idade ${l}`} />
                <ReferenceLine y={ifResult.patrimonioNecessario} stroke="#7A3535" strokeDasharray="4 4" label={{ value: "Meta", position: "right", fontSize: 10, fill: "#7A3535" }} />
                <Area type="monotone" dataKey="projecao" name="Projeção" stroke="#3D6B41" fill="url(#gradIF)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* ── 6. Proteção detail ─────────────────────────────────────────────── */}
      <SectionCard title="Proteção" score={protS} color="#7A3535" semDados={semDadosProtecao}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Capital necessário" value={formatCurrency(protResult.capitalNecessario)} />
            <Row label="Capital segurado atual" value={formatCurrency(protResult.capitalAtual)} />
            <Row label="Gap de cobertura" value={formatCurrency(protResult.gap)} color={protResult.gap > 0 ? "#7A3535" : "#3D6B41"} />
            <Row label="Cobertura" value={`${formatNumber(protResult.percentualCoberto, 0)}%`} color={protResult.percentualCoberto >= 100 ? "#3D6B41" : "#7A3535"} />
            {protResult.gap > 0 && (
              <div style={{ marginTop: 8, padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#7A3535" }}>
                ⚠ Encaminhar para análise completa de seguros
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Possui seguro de vida", ok: plan.protecao.possuiSeguroVida, detail: plan.protecao.possuiSeguroVida ? formatCurrency(plan.protecao.capitalSeguradoVida) : "Não contratado" },
              { label: "Capital adequado", ok: protResult.capitalAtual >= protResult.capitalNecessario, detail: `${formatNumber(protResult.percentualCoberto, 0)}% coberto` },
              { label: "Seguro de invalidez", ok: plan.protecao.possuiSeguroInvalidez, detail: plan.protecao.possuiSeguroInvalidez ? "Sim" : "Não contratado" },
              { label: "Plano de saúde", ok: plan.protecao.possuiPlanoSaude, detail: plan.protecao.possuiPlanoSaude ? "Sim" : "Não contratado" },
            ].map(({ label, ok, detail }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #F5F3EE" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: ok ? "#EBF2EC" : "#FEF2F2", color: ok ? "#3D6B41" : "#7A3535", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {ok ? "✓" : "✗"}
                </span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: DARK, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: 0 }}>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── 7. Fiscal detail ───────────────────────────────────────────────── */}
      <SectionCard title="Planejamento Fiscal" score={fiscS} color="#8A7A45" semDados={semDadosFiscal}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Renda anual bruta" value={formatCurrency(plan.fiscal.rendaBrutaAnual)} />
            <Row label="Teto PGBL (12%)" value={formatCurrency(fiscalResult.tetoPGBL)} />
            <Row label="PGBL aportado" value={formatCurrency(plan.fiscal.temPGBL ? plan.fiscal.valorPGBLAnual : 0)} />
            <Row label="Espaço disponível PGBL" value={formatCurrency(Math.max(0, fiscalResult.tetoPGBL - (plan.fiscal.temPGBL ? plan.fiscal.valorPGBLAnual : 0)))} color="#8A7A45" />
            <Row label="Economia potencial" value={`${formatCurrency(fiscalResult.economiaFiscalPotencial)}/ano`} color="#3D6B41" />
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#6B6347", marginBottom: 8 }}>PGBL utilizado vs. teto</p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#6B6347" }}>Aproveitamento</span>
                <span style={{ fontWeight: 600, color: "#8A7A45" }}>{formatNumber(pgblPct, 0)}%</span>
              </div>
              <div style={{ height: 10, backgroundColor: "#FEF3C7", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pgblPct}%`, backgroundColor: "#8A7A45", borderRadius: 5 }} />
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, backgroundColor: fiscalResult.recomendaPGBL ? "#EBF2EC" : "#EFF6FF", color: fiscalResult.recomendaPGBL ? "#3D6B41" : "#2A4F6A" }}>
              {fiscalResult.recomendaPGBL ? "PGBL recomendado" : "VGBL recomendado"}
            </span>
            {fiscalResult.recomendacoes.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {fiscalResult.recomendacoes.map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: "#3D3520", margin: 0 }}>• {r}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── 8. Sucessório detail ───────────────────────────────────────────── */}
      <SectionCard title="Planejamento Sucessório" score={sucS} color="#2A4F6A" semDados={semDadosSucessorio}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="ITCMD estimado (4%)" value={formatCurrency(sucResult.itcmdEstimado)} color="#7A3535" />
            <Row label="Custo inventário (6%)" value={formatCurrency(sucResult.custoInventarioEstimado)} color="#7A3535" />
            <Row label="Total de custos" value={formatCurrency(sucResult.custoTotal)} color="#7A3535" />
            <Row label="Patrimônio líquido aos herdeiros" value={formatCurrency(sucResult.patrimonioLiquidoHerdeiros)} color="#3D6B41" />
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Testamento", ok: plan.sucessorio.possuiTestamento },
                { label: "Holding familiar", ok: plan.sucessorio.possuiHolding },
                { label: "Seguro com beneficiário", ok: plan.sucessorio.possuiSeguroVidaSucessao },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: ok ? "#3D6B41" : "#7A3535" }}>{ok ? "✓" : "✗"}</span>
                  <span style={{ color: ok ? DARK : "#9E9070" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            {sucPieData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={sucPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {sucPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Spacer para o nav footer do FPLayout não cobrir o último card */}
      <div style={{ height: 8 }} />

      {/* Score geral em destaque — linha decorativa */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 0" }}>
        <div style={{ height: 1, flex: 1, backgroundColor: "#E2DCC8" }} />
        <span style={{ fontSize: 12, color: "#9E9070", fontWeight: 500 }}>Score consolidado: {overallScore}/100</span>
        <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: overallColor }} />
        <div style={{ height: 1, flex: 1, backgroundColor: "#E2DCC8" }} />
      </div>
    </div>
  );
}
