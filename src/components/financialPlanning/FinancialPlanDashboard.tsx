import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Edit,
  Save,
  Printer,
  ChevronUp,
  ChevronDown,
  Plus,
  ShieldAlert,
  TrendingUp,
  PieChart as PieIcon,
  Shield,
  Receipt,
  GitBranch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularIF,
  calcularProtecao,
  calcularFiscal,
  calcularSucessorio,
  calcularAlocacaoAtual,
  calcularGapAlocacao,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import type {
  FinancialPlan,
  MacroalocacaoAlvo,
  PlanejamentoIF,
} from "@/types/financialPlanning";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinancialPlanDashboardProps {
  plan: FinancialPlan;
  clientName: string;
  onEdit: () => void;
  onSave: () => void;
  onPrint: (type: "advisor" | "client") => void;
  onNotasChange: (notas: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreLabel(score: number): { text: string; cls: string } {
  if (score >= 70) return { text: "Adequado", cls: "bg-emerald-100 text-emerald-800" };
  if (score >= 40) return { text: "Atenção", cls: "bg-amber-100 text-amber-800" };
  return { text: "Risco", cls: "bg-red-100 text-red-800" };
}

function scoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
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

// ─── Small SVG Gauge ──────────────────────────────────────────────────────────

function SmallGauge({ score }: { score: number }) {
  const r = 36;
  const cx = 46;
  const cy = 44;
  const circumference = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = scoreColor(score);

  return (
    <svg width="92" height="52" viewBox="0 0 92 52">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Score Card ───────────────────────────────────────────────────────────────

function ScoreCard({
  icon: Icon,
  label,
  score,
}: {
  icon: React.ElementType;
  label: string;
  score: number;
}) {
  const sl = scoreLabel(score);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 pt-5 pb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <SmallGauge score={score} />
        <p className="text-xs font-medium text-center leading-tight">{label}</p>
        <Badge className={`text-xs ${sl.cls}`}>{sl.text}</Badge>
      </CardContent>
    </Card>
  );
}

// ─── Action Plan ──────────────────────────────────────────────────────────────

interface AcaoItem {
  id: string;
  area: string;
  descricao: string;
  urgencia: "alta" | "media" | "baixa";
}

function gerarAcoes(
  gap: MacroalocacaoAlvo | null,
  ifGap: number,
  protGap: number,
  fiscalGapEcon: number,
  sucScore_: number,
): AcaoItem[] {
  const acoes: AcaoItem[] = [];
  let id = 1;

  if (gap && ASSET_KEYS.some((k) => Math.abs(gap[k]) > 10)) {
    acoes.push({
      id: String(id++),
      area: "Asset Allocation",
      descricao: "Rebalancear carteira para alinhamento com o perfil de risco",
      urgencia: "alta",
    });
  }
  if (protGap > 0) {
    acoes.push({
      id: String(id++),
      area: "Proteção",
      descricao: `Contratar ou aumentar seguro de vida — gap de ${formatCurrency(protGap)}`,
      urgencia: "alta",
    });
  }
  if (fiscalGapEcon > 5000) {
    acoes.push({
      id: String(id++),
      area: "Fiscal",
      descricao: `Aportar no PGBL para economia tributária estimada de ${formatCurrency(fiscalGapEcon)}/ano`,
      urgencia: "media",
    });
  }
  if (sucScore_ < 50) {
    acoes.push({
      id: String(id++),
      area: "Sucessório",
      descricao: "Iniciar planejamento sucessório — elaborar testamento e avaliar holding",
      urgencia: "media",
    });
  }
  if (ifGap > 0) {
    acoes.push({
      id: String(id++),
      area: "Aposentadoria",
      descricao: `Aumentar aportes mensais para atingir a meta de IF`,
      urgencia: "media",
    });
  }

  return acoes;
}

const URGENCIA_CLS: Record<AcaoItem["urgencia"], string> = {
  alta: "bg-red-100 text-red-800",
  media: "bg-amber-100 text-amber-800",
  baixa: "bg-emerald-100 text-emerald-800",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  onEdit,
  onSave,
  onPrint,
  onNotasChange,
}: FinancialPlanDashboardProps) {
  const ifResult = useMemo(() => calcularIF(plan.planejamentoIF), [plan.planejamentoIF]);
  const protResult = useMemo(() => calcularProtecao(plan.protecao), [plan.protecao]);
  const fiscalResult = useMemo(() => calcularFiscal(plan.fiscal), [plan.fiscal]);
  const sucResult = useMemo(() => calcularSucessorio(plan.sucessorio), [plan.sucessorio]);

  const ativosTotal =
    plan.ativosAtuais.total ||
    plan.ativosAtuais.rendaFixa +
      plan.ativosAtuais.acoes +
      plan.ativosAtuais.fiis +
      plan.ativosAtuais.rvGlobal +
      plan.ativosAtuais.rfGlobal +
      plan.ativosAtuais.cripto;

  const alocacaoAtual = useMemo(
    () => calcularAlocacaoAtual({ ...plan.ativosAtuais, total: ativosTotal || 1 }),
    [plan.ativosAtuais, ativosTotal]
  );
  const alvo = plan.suitability ? ALOCACAO_ALVO[plan.suitability.perfil] : null;
  const gapAloc = alvo ? calcularGapAlocacao(alocacaoAtual, alvo) : null;

  const aaS = aaScore(gapAloc);
  const fiscS = fiscalScore(fiscalResult.economiaFiscalAtual, fiscalResult.economiaFiscalPotencial);
  const sucS = sucScore(plan, sucResult.percentualCusto);
  const overallScore = Math.round(
    (aaS + Math.round(ifResult.percentualIF) + Math.round(protResult.percentualCoberto) + fiscS + sucS) / 5
  );

  const projecaoData = useMemo(
    () => gerarProjecao(plan.planejamentoIF, ifResult.patrimonioNecessario),
    [plan.planejamentoIF, ifResult.patrimonioNecessario]
  );

  const [acoes, setAcoes] = useState<AcaoItem[]>(() =>
    gerarAcoes(gapAloc, ifResult.gap, protResult.gap, fiscalResult.gapEconomia, sucS)
  );
  const [novaAcao, setNovaAcao] = useState("");

  const overallSL = scoreLabel(overallScore);

  // ── Pie data for allocation ──────────────────────────────────────────────
  const pieData = ASSET_KEYS.filter((k) => alocacaoAtual[k] > 0).map((k) => ({
    name: ASSET_LABELS[k],
    value: parseFloat(alocacaoAtual[k].toFixed(1)),
    color: ASSET_COLORS[k],
    valor: plan.ativosAtuais[k],
  }));

  // ── Bar data for current vs target ──────────────────────────────────────
  const barData = ASSET_KEYS.map((k) => ({
    name: ASSET_LABELS[k],
    atual: parseFloat(alocacaoAtual[k].toFixed(1)),
    alvo: alvo ? alvo[k] : 0,
  }));

  // ── Succession pie ───────────────────────────────────────────────────────
  const patrimonioFora = plan.sucessorio.possuiSeguroVidaSucessao
    ? plan.sucessorio.capitalSeguroVidaSucessao
    : 0;
  const patrimonioInv = Math.max(0, plan.sucessorio.patrimonioTotal - patrimonioFora);
  const sucPieData = [
    { name: "No inventário", value: patrimonioInv, color: "#ef4444" },
    { name: "Fora do inventário", value: patrimonioFora, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // ── Action plan helpers ──────────────────────────────────────────────────
  function moveAcao(idx: number, dir: -1 | 1) {
    const next = [...acoes];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setAcoes(next);
  }

  function editAcao(idx: number, descricao: string) {
    setAcoes((prev) => prev.map((a, i) => (i === idx ? { ...a, descricao } : a)));
  }

  function addAcao() {
    if (!novaAcao.trim()) return;
    setAcoes((prev) => [
      ...prev,
      { id: String(Date.now()), area: "Customizado", descricao: novaAcao.trim(), urgencia: "baixa" },
    ]);
    setNovaAcao("");
  }

  const pgblPct =
    fiscalResult.tetoPGBL > 0
      ? Math.min(100, (plan.fiscal.aportePGBLAnual / fiscalResult.tetoPGBL) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* ── SEÇÃO 1: Cabeçalho ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{clientName}</h2>
          <p className="text-sm text-muted-foreground">
            Plano financeiro · {new Date().toLocaleDateString("pt-BR")}
          </p>
          {plan.suitability && (
            <Badge className="mt-2" variant="secondary">
              Perfil: {PERFIL_LABELS[plan.suitability.perfil]}
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black tabular-nums">{overallScore}</span>
            <div>
              <p className="text-xs text-muted-foreground">Score geral</p>
              <Badge className={overallSL.cls}>{overallSL.text}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onSave}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPrint("advisor")}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              PDF Assessor
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPrint("client")}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              PDF Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2: Score cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ScoreCard icon={PieIcon} label="Asset Allocation" score={aaS} />
        <ScoreCard
          icon={TrendingUp}
          label="Aposentadoria / IF"
          score={Math.round(ifResult.percentualIF)}
        />
        <ScoreCard
          icon={Shield}
          label="Proteção"
          score={Math.round(protResult.percentualCoberto)}
        />
        <ScoreCard icon={Receipt} label="Fiscal" score={fiscS} />
        <ScoreCard icon={GitBranch} label="Sucessório" score={sucS} />
      </div>

      {/* ── SEÇÃO 3: Asset Allocation ─────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-4 text-base font-semibold">Asset Allocation</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie chart */}
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Alocação atual</p>
              {ativosTotal > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name} ${value}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${value}% (${formatCurrency((props.payload as { valor?: number }).valor ?? 0)})`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1 text-xs">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: d.color }}
                        />
                        {d.name} {d.value}%
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Patrimônio não informado.</p>
              )}
            </div>
            {/* Bar chart: atual vs alvo */}
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Atual vs. alvo{alvo && plan.suitability ? ` (${PERFIL_LABELS[plan.suitability.perfil]})` : ""}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={64} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="atual" name="Atual" fill="#3b82f6" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="alvo" name="Alvo" fill="#d1d5db" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 4: Aposentadoria e IF ───────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-4 text-base font-semibold">Aposentadoria e liberdade financeira</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Métricas */}
            <div className="space-y-3">
              {[
                { label: "Patrimônio necessário para IF", value: formatCurrency(ifResult.patrimonioNecessario), cls: "" },
                { label: "Projeção com aportes atuais", value: formatCurrency(ifResult.patrimonioProjetado), cls: "text-primary" },
                {
                  label: ifResult.gap > 0 ? "Gap (falta)" : "Superávit",
                  value: formatCurrency(Math.abs(ifResult.gap)),
                  cls: ifResult.gap > 0 ? "text-destructive" : "text-emerald-600",
                },
                { label: "Renda mensal atingível", value: formatCurrency(ifResult.rendaMensalAtingivel), cls: "" },
                { label: "Renda mensal desejada", value: formatCurrency(plan.planejamentoIF.rendaMensalDesejada), cls: "" },
                { label: "Anos restantes", value: `${ifResult.anosParaMeta} anos`, cls: "" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</span>
                </div>
              ))}
              <div className="pt-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span>{formatNumber(ifResult.percentualIF, 0)}%</span>
                </div>
                <Progress value={ifResult.percentualIF} className="h-2" />
              </div>
            </div>
            {/* AreaChart */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Projeção patrimonial por idade</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={projecaoData}>
                  <defs>
                    <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="idade" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} labelFormatter={(l) => `Idade ${l}`} />
                  <ReferenceLine
                    y={ifResult.patrimonioNecessario}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "Meta", position: "right", fontSize: 10, fill: "#ef4444" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="projecao"
                    name="Projeção"
                    stroke="#3b82f6"
                    fill="url(#gradIF)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 5: Proteção ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-4 text-base font-semibold">Proteção</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gauge + métricas */}
            <div className="flex flex-col items-center gap-4">
              <SmallGauge score={Math.round(protResult.percentualCoberto)} />
              <div className="w-full space-y-2">
                {[
                  { label: "Capital necessário", value: formatCurrency(protResult.capitalNecessario) },
                  { label: "Capital segurado atual", value: formatCurrency(protResult.capitalAtual) },
                  { label: "Gap de cobertura", value: formatCurrency(protResult.gap), cls: "text-destructive" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between border-b pb-1.5 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${cls ?? ""}`}>{value}</span>
                  </div>
                ))}
              </div>
              {protResult.gap > 0 && (
                <Badge variant="outline" className="flex items-center gap-1.5 text-amber-700 border-amber-300 bg-amber-50 w-full justify-center py-2">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Encaminhar para análise completa de seguros
                </Badge>
              )}
            </div>
            {/* Checklist */}
            <div className="space-y-3">
              {[
                {
                  label: "Possui seguro de vida",
                  ok: plan.protecao.possuiSeguroVida,
                  detail: plan.protecao.possuiSeguroVida
                    ? formatCurrency(plan.protecao.capitalSeguradoVida)
                    : "Não contratado",
                },
                {
                  label: "Capital adequado (≥ necessário)",
                  ok: protResult.capitalAtual >= protResult.capitalNecessario,
                  detail: `${formatNumber(protResult.percentualCoberto, 0)}% coberto`,
                },
                {
                  label: "Possui seguro de invalidez",
                  ok: plan.protecao.possuiSeguroInvalidez,
                  detail: plan.protecao.possuiSeguroInvalidez ? "Sim" : "Não contratado",
                },
                {
                  label: "Possui plano de saúde",
                  ok: plan.protecao.possuiPlanoSaude,
                  detail: plan.protecao.possuiPlanoSaude ? "Sim" : "Não contratado",
                },
              ].map(({ label, ok, detail }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border p-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {ok ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 6: Fiscal ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-4 text-base font-semibold">Planejamento fiscal</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Métricas */}
            <div className="space-y-2">
              {[
                { label: "Renda anual bruta", value: formatCurrency(plan.fiscal.rendaBrutaAnual) },
                { label: "Teto PGBL (12%)", value: formatCurrency(fiscalResult.tetoPGBL) },
                {
                  label: "PGBL aportado atualmente",
                  value: formatCurrency(plan.fiscal.contribuiPGBL ? plan.fiscal.aportePGBLAnual : 0),
                },
                {
                  label: "Espaço disponível no PGBL",
                  value: formatCurrency(Math.max(0, fiscalResult.tetoPGBL - (plan.fiscal.contribuiPGBL ? plan.fiscal.aportePGBLAnual : 0))),
                  cls: "text-amber-600",
                },
                {
                  label: "Economia tributária potencial",
                  value: formatCurrency(fiscalResult.economiaFiscalPotencial) + "/ano",
                  cls: "text-emerald-600",
                },
                {
                  label: "Economia atual realizada",
                  value: formatCurrency(fiscalResult.economiaFiscalAtual) + "/ano",
                  cls: "text-primary",
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex justify-between border-b pb-1.5 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${cls ?? ""}`}>{value}</span>
                </div>
              ))}
            </div>
            {/* PGBL barra + recomendações */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">PGBL utilizado vs. teto</span>
                  <span className="tabular-nums">{formatNumber(pgblPct, 0)}%</span>
                </div>
                <Progress value={pgblPct} className="h-3" />
              </div>
              {fiscalResult.recomendacoes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Recomendações</p>
                  {fiscalResult.recomendacoes.map((r, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="shrink-0 text-primary mt-0.5">•</span>
                      {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 7: Sucessório ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-4 text-base font-semibold">Planejamento sucessório</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Métricas */}
            <div className="space-y-2">
              {[
                { label: "ITCMD estimado (4%)", value: formatCurrency(sucResult.itcmdEstimado), cls: "text-destructive" },
                { label: "Custo do inventário (6%)", value: formatCurrency(sucResult.custoInventarioEstimado), cls: "text-destructive" },
                { label: "Total de custos estimados", value: formatCurrency(sucResult.custoTotal), cls: "text-destructive font-bold" },
                { label: "Patrimônio líquido aos herdeiros", value: formatCurrency(sucResult.patrimonioLiquidoHerdeiros), cls: "text-emerald-600" },
                { label: "% patrimônio fora do inventário", value: `${formatNumber(patrimonioFora > 0 && plan.sucessorio.patrimonioTotal > 0 ? (patrimonioFora / plan.sucessorio.patrimonioTotal) * 100 : 0, 1)}%`, cls: "text-emerald-600" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex justify-between border-b pb-1.5 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm tabular-nums ${cls ?? ""}`}>{value}</span>
                </div>
              ))}
            </div>
            {/* PieChart + checklist */}
            <div className="space-y-4">
              {sucPieData.length > 0 && (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={sucPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                    >
                      {sucPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="space-y-1.5">
                {[
                  { label: "Testamento", ok: plan.sucessorio.possuiTestamento },
                  { label: "Holding familiar", ok: plan.sucessorio.possuiHolding },
                  { label: "Seguro com beneficiário", ok: plan.sucessorio.possuiSeguroVidaSucessao },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className={`font-bold ${ok ? "text-emerald-600" : "text-red-500"}`}>
                      {ok ? "✓" : "✗"}
                    </span>
                    <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 8: Plano de ação ────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-4 text-base font-semibold">Plano de ação priorizado</h3>
          <div className="space-y-2">
            {acoes.map((acao, idx) => (
              <div key={acao.id} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{acao.area}</Badge>
                    <Badge className={`text-xs ${URGENCIA_CLS[acao.urgencia]}`}>{acao.urgencia}</Badge>
                  </div>
                  <Textarea
                    value={acao.descricao}
                    onChange={(e) => editAcao(idx, e.target.value)}
                    className="min-h-[40px] text-sm resize-none border-0 p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => moveAcao(idx, -1)}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => moveAcao(idx, 1)}
                    disabled={idx === acoes.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Adicionar recomendação customizada..."
              value={novaAcao}
              onChange={(e) => setNovaAcao(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAcao()}
            />
            <Button size="sm" variant="outline" onClick={addAcao}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 9: Notas do assessor ────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 text-base font-semibold">Notas do assessor</h3>
          <Textarea
            value={plan.notasAssessor}
            onChange={(e) => onNotasChange(e.target.value)}
            placeholder="Observações, contexto e notas para a próxima reunião..."
            className="min-h-[120px] resize-y"
          />
        </CardContent>
      </Card>
    </div>
  );
}
