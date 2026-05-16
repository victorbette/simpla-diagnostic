import { useEffect, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Droplets,
  GitBranch,
  BarChart3,
  DollarSign,
  TrendingUp,
  Target,
  Flame,
  RotateCcw,
  FileText,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryResult, DiagnosticAnswers, DiagnosticResult, RiskLevel } from "@/hooks/useDiagnosticEngine";
import { formatCurrency } from "@/lib/format";

// ─── Risk config ──────────────────────────────────────────────────────────────

const RISK: Record<RiskLevel, { label: string; color: string; bgClass: string; textClass: string; badgeClass: string }> = {
  high: {
    label: "Risco alto",
    color: "#E24B4A",
    bgClass: "bg-red-50 dark:bg-red-950",
    textClass: "text-red-700 dark:text-red-300",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  medium: {
    label: "Atenção",
    color: "#EF9F27",
    bgClass: "bg-amber-50 dark:bg-amber-950",
    textClass: "text-amber-700 dark:text-amber-300",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  low: {
    label: "Adequado",
    color: "#639922",
    bgClass: "bg-green-50 dark:bg-green-950",
    textClass: "text-green-700 dark:text-green-300",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

const CAT_ICONS: Record<string, React.ElementType> = {
  liquidez: Droplets,
  sucessao: GitBranch,
  estrategia: BarChart3,
  cambio: DollarSign,
  inflacao: TrendingUp,
  objetivos: Target,
  liberdade: Flame,
};

// ─── ScoreGaugeFull ───────────────────────────────────────────────────────────
function ScoreGaugeFull({
  score,
  categories,
}: {
  score: number;
  categories: CategoryResult[];
}) {
  const risk = score >= 70 ? "low" : score >= 40 ? "medium" : "high";
  const fillColor = RISK[risk].color;

  const r = 70;
  const cx = 90;
  const cy = 85;
  const angle = Math.PI - (score / 100) * Math.PI;
  const fillX = cx + r * Math.cos(angle);
  const fillY = cy + r * Math.sin(angle);
  const largeArc = angle < Math.PI / 2 ? 1 : 0;

  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${fillX} ${fillY}`;

  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
  categories.forEach((c) => counts[c.riskLevel]++);

  const counterDefs: { level: RiskLevel; label: string }[] = [
    { level: "high", label: "Risco alto" },
    { level: "medium", label: "Atenção" },
    { level: "low", label: "Adequado" },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path
          d={bgPath}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={fillPath}
          fill="none"
          stroke={fillColor}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor">
          {score}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">
          score geral
        </text>
      </svg>

      <div className="grid w-full grid-cols-3 gap-2 text-center">
        {counterDefs.map(({ level, label }) => (
          <div key={level} className={`rounded-lg p-2 ${RISK[level].bgClass}`}>
            <div className={`text-2xl font-bold ${RISK[level].textClass}`}>{counts[level]}</div>
            <div className={`text-[10px] font-medium ${RISK[level].textClass} opacity-80`}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

function SummaryBar({ cat }: { cat: CategoryResult }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(cat.score), 80);
    return () => clearTimeout(t);
  }, [cat.score]);

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 truncate text-sm font-medium">{cat.label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: RISK[cat.riskLevel].color }}
        />
      </div>
      <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
        {cat.score}%
      </span>
    </div>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({ cat }: { cat: CategoryResult }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const Icon = CAT_ICONS[cat.id] ?? BarChart3;
  const risk = RISK[cat.riskLevel];

  useEffect(() => {
    const t = setTimeout(() => setWidth(cat.score), 80);
    return () => clearTimeout(t);
  }, [cat.score]);

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full flex-col gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg p-1.5 ${risk.bgClass}`}>
              <Icon className={`h-4 w-4 ${risk.textClass}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{cat.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${risk.badgeClass}`}>
                  {risk.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-lg font-bold tabular-nums">{cat.score}%</span>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* progress bar */}
        <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${width}%`, backgroundColor: risk.color }}
          />
        </div>
      </button>

      {/* expanded */}
      {open && (
        <CardContent className="border-t pt-4 pb-4">
          {cat.findings.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pontos identificados
              </p>
              <ul className="space-y-1">
                {cat.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cat.recommendations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recomendações
              </p>
              <ul className="space-y-1.5">
                {cat.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${risk.textClass}`} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── FIRECard ─────────────────────────────────────────────────────────────────

function FIRECard({ answers }: { answers: DiagnosticAnswers }) {
  if (answers.targetPassiveIncome <= 0) return null;

  const {
    targetPassiveIncome,
    monthlyPassiveIncome,
    totalInvestedAssets,
    currentAge,
    fireTargetAge,
  } = answers;

  const requiredAssets = (targetPassiveIncome * 12) / 0.04;
  const assetProgress = Math.min((totalInvestedAssets / requiredAssets) * 100, 100);
  const incomeProgress = Math.min((monthlyPassiveIncome / targetPassiveIncome) * 100, 100);
  const yearsLeft = Math.max(0, fireTargetAge - currentAge);

  const [assetW, setAssetW] = useState(0);
  const [incomeW, setIncomeW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setAssetW(assetProgress);
      setIncomeW(incomeProgress);
    }, 80);
    return () => clearTimeout(t);
  }, [assetProgress, incomeProgress]);

  const metrics = [
    { label: "Idade atual", value: `${currentAge} anos` },
    { label: "Renda passiva atual", value: formatCurrency(monthlyPassiveIncome) + "/mês" },
    { label: "Meta de renda", value: formatCurrency(targetPassiveIncome) + "/mês" },
    { label: "Patrimônio atual", value: formatCurrency(totalInvestedAssets) },
    { label: "Patrimônio necessário", value: formatCurrency(requiredAssets) },
    { label: "Anos disponíveis", value: `${yearsLeft} anos` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-4 w-4 text-orange-500" />
          Liberdade financeira (FIRE)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Patrimônio</span>
              <span className="font-medium tabular-nums">{Math.round(assetProgress)}%</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-700 ease-out"
                style={{ width: `${assetW}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Renda passiva</span>
              <span className="font-medium tabular-nums">{Math.round(incomeProgress)}%</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all duration-700 ease-out"
                style={{ width: `${incomeW}%` }}
              />
            </div>
          </div>
        </div>

        {assetProgress < 80 && yearsLeft < 10 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Com {yearsLeft} anos disponíveis e patrimônio em {Math.round(assetProgress)}% da meta,
              é recomendável revisar a estratégia ou o prazo-alvo com seu assessor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Radar custom dot ─────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

interface DiagnosticResultViewProps {
  result: DiagnosticResult;
  answers: DiagnosticAnswers;
  clientName: string;
  onRedo: () => void;
  onSave: () => void;
  onPrintAdvisor: () => void;
  onPrintClient: () => void;
}

export function DiagnosticResultView({
  result,
  answers,
  clientName,
  onRedo,
  onSave,
  onPrintAdvisor,
  onPrintClient,
}: DiagnosticResultViewProps) {
  const { overallScore, categories } = result;

  const radarData = categories.map((c) => ({
    subject: c.label,
    score: c.score,
    id: c.id,
    riskLevel: c.riskLevel,
  }));

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date(result.createdAt));

  // Custom dot that colours by risk
  function RiskDot({ cx = 0, cy = 0, index = 0 }: { cx?: number; cy?: number; index?: number }) {
    const cat = categories[index];
    if (!cat) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="white"
        stroke={RISK[cat.riskLevel].color}
        strokeWidth={2.5}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico financeiro</h1>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">{clientName}</span>
            {" · "}
            {dateLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onRedo}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Refazer
          </Button>
          <Button size="sm" variant="outline" onClick={onPrintClient}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            PDF cliente
          </Button>
          <Button size="sm" variant="outline" onClick={onPrintAdvisor}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            PDF assessor
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </div>

      {/* ── Hero grid: gauge + radar ── */}
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="flex items-center justify-center p-6">
          <ScoreGaugeFull score={overallScore} categories={categories} />
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Visão por categoria
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="currentColor" strokeOpacity={0.12} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={RISK[result.overallRisk].color}
                fill={RISK[result.overallRisk].color}
                fillOpacity={0.18}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, index } = props as { cx: number; cy: number; index: number };
                  return <RiskDot key={index} cx={cx} cy={cy} index={index} />;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Score bars ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat) => (
              <SummaryBar key={cat.id} cat={cat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Category cards ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detalhamento por categoria
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      </div>

      {/* ── FIRE card ── */}
      {answers.targetPassiveIncome > 0 && <FIRECard answers={answers} />}

      {/* ── Assessor notes ── */}
      {answers.assessorNotes && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notas do assessor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {answers.assessorNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
