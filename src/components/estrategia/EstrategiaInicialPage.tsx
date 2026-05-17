import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  BarChart2,
  PieChart as PieChartIcon,
  Sunset,
  Shield,
  Receipt,
  GitBranch,
  ListChecks,
  CheckCircle2,
  Circle,
  Save,
  X,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { EstrategiaInicial } from "@/types/estrategiaInicial";
import { initialEstrategia } from "@/types/estrategiaInicial";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import {
  calcularIF,
  calcularProtecao,
  calcularFiscal,
  calcularSucessorio,
} from "@/types/financialPlanning";
import { useEstrategiaStore } from "@/hooks/useEstrategiaStore";
import { SecaoCapa } from "./SecaoCapa";
import { SecaoAssetAllocation } from "./SecaoAssetAllocation";
import { SecaoAposentadoria } from "./SecaoAposentadoria";
import { SecaoProtecao } from "./SecaoProtecao";
import { SecaoFiscal } from "./SecaoFiscal";
import { SecaoSucessorio } from "./SecaoSucessorio";
import { SecaoProximosPassos } from "./SecaoProximosPassos";
import {
  EstrategiaPrintAssessor,
  EstrategiaPrintCliente,
} from "./EstrategiaPrint";

// ─── Types ────────────────────────────────────────────────────────────────────

type SecaoAtiva =
  | "capa"
  | "sumario"
  | "assetAllocation"
  | "aposentadoria"
  | "protecao"
  | "fiscal"
  | "sucessorio"
  | "proximosPassos";

type SecaoKey = keyof EstrategiaInicial["secoes"];

interface NavItem {
  id: SecaoAtiva;
  label: string;
  icon: React.ElementType;
}

interface Props {
  clientId: string;
  clientName: string;
  financialPlan: FinancialPlan | null;
  onClose: () => void;
}

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "capa", label: "Capa", icon: FileText },
  { id: "sumario", label: "Sumário", icon: BarChart2 },
  { id: "assetAllocation", label: "Asset Allocation", icon: PieChartIcon },
  { id: "aposentadoria", label: "Aposentadoria / IF", icon: Sunset },
  { id: "protecao", label: "Proteção", icon: Shield },
  { id: "fiscal", label: "Fiscal", icon: Receipt },
  { id: "sucessorio", label: "Sucessório", icon: GitBranch },
  { id: "proximosPassos", label: "Próximos Passos", icon: ListChecks },
];

// ─── Sumário view (inline component) ─────────────────────────────────────────

function ScoreCard({ label, score }: { label: string; score: number | null }) {
  const display = score !== null ? `${score.toFixed(0)}%` : "—";
  const color =
    score === null
      ? "text-muted-foreground"
      : score >= 75
      ? "text-green-600"
      : score >= 50
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="border rounded p-4 space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{display}</p>
      {score !== null && (
        <Progress value={Math.min(100, Math.max(0, score))} className="h-2" />
      )}
    </div>
  );
}

function SumarioView({ plan }: { plan: FinancialPlan | null }) {
  let ifScore: number | null = null;
  let protScore: number | null = null;
  let fiscalScore: number | null = null;
  let sucScore: number | null = null;

  if (plan) {
    const ifResult = calcularIF(plan.planejamentoIF);
    ifScore = ifResult.percentualIF;

    const protResult = calcularProtecao(plan.protecao);
    protScore = protResult.percentualCoberto;

    const fiscalResult = calcularFiscal(plan.fiscal);
    fiscalScore =
      fiscalResult.economiaFiscalPotencial > 0
        ? (fiscalResult.economiaFiscalAtual / fiscalResult.economiaFiscalPotencial) * 100
        : 50;

    const sucResult = calcularSucessorio(plan.sucessorio);
    sucScore = Math.max(0, 100 - sucResult.percentualCusto);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Sumário — Visão Geral</h2>
      <p className="text-sm text-muted-foreground">
        Pontuações calculadas automaticamente com base no plano financeiro.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <ScoreCard label="Asset Allocation" score={plan ? 50 : null} />
        <ScoreCard label="Aposentadoria / IF" score={ifScore} />
        <ScoreCard label="Proteção" score={protScore} />
        <ScoreCard label="Planejamento Fiscal" score={fiscalScore} />
        <ScoreCard label="Planejamento Sucessório" score={sucScore} />
      </div>

      {!plan && (
        <div className="border rounded p-4 bg-muted/40 text-sm text-muted-foreground">
          Nenhum plano financeiro associado. As pontuações serão calculadas após
          o preenchimento do plano.
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EstrategiaInicialPage({
  clientId,
  clientName,
  financialPlan,
  onClose,
}: Props) {
  const { saveEstrategia } = useEstrategiaStore();

  const [estrategia, setEstrategia] = useState<EstrategiaInicial>(() =>
    initialEstrategia(clientId, financialPlan?.id)
  );
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>("capa");
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<"assessor" | "cliente" | null>(null);

  // ─── Completion tracking ────────────────────────────────────────────────────

  function isSecaoComplete(id: SecaoAtiva): boolean {
    if (id === "capa") return estrategia.nomeAssessor.length > 0;
    if (id === "sumario") return financialPlan !== null;
    return estrategia.secoes[id as SecaoKey].completa;
  }

  const totalCompleted = NAV_ITEMS.filter((item) => isSecaoComplete(item.id)).length;

  // ─── Update helpers ─────────────────────────────────────────────────────────

  function updateSecao(key: SecaoKey, patch: SecaoEstrategia) {
    setEstrategia((prev) => ({
      ...prev,
      secoes: { ...prev.secoes, [key]: patch },
    }));
  }

  // ─── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveEstrategia(estrategia);
      setEstrategia(saved);
      toast.success("Estratégia salva com sucesso!");
    } catch {
      toast.error("Erro ao salvar a estratégia. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Print ──────────────────────────────────────────────────────────────────

  function handlePrint(type: "assessor" | "cliente") {
    setPrintMode(type);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
        <h1 className="text-base font-semibold truncate max-w-xs md:max-w-none">
          Estratégia Inicial · {clientName}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando…" : "Salvar rascunho"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint("assessor")}
          >
            <Printer className="h-4 w-4 mr-1" />
            PDF Assessor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint("cliente")}
          >
            <Printer className="h-4 w-4 mr-1" />
            PDF Cliente
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-muted/20 p-4 gap-4 overflow-y-auto">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{totalCompleted} de 8 seções</span>
            </div>
            <Progress value={(totalCompleted / 8) * 100} className="h-2" />
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const complete = isSecaoComplete(item.id);
              const active = secaoAtiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSecaoAtiva(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {complete ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 opacity-30" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {secaoAtiva === "capa" && (
            <SecaoCapa
              estrategia={estrategia}
              onChange={setEstrategia}
              financialPlan={financialPlan}
            />
          )}

          {secaoAtiva === "sumario" && <SumarioView plan={financialPlan} />}

          {secaoAtiva === "assetAllocation" && (
            <SecaoAssetAllocation
              secao={estrategia.secoes.assetAllocation}
              onChange={(s) => updateSecao("assetAllocation", s)}
              financialPlan={financialPlan}
            />
          )}

          {secaoAtiva === "aposentadoria" && (
            <SecaoAposentadoria
              secao={estrategia.secoes.aposentadoria}
              onChange={(s) => updateSecao("aposentadoria", s)}
              financialPlan={financialPlan}
            />
          )}

          {secaoAtiva === "protecao" && (
            <SecaoProtecao
              secao={estrategia.secoes.protecao}
              onChange={(s) => updateSecao("protecao", s)}
              financialPlan={financialPlan}
            />
          )}

          {secaoAtiva === "fiscal" && (
            <SecaoFiscal
              secao={estrategia.secoes.fiscal}
              onChange={(s) => updateSecao("fiscal", s)}
              financialPlan={financialPlan}
            />
          )}

          {secaoAtiva === "sucessorio" && (
            <SecaoSucessorio
              secao={estrategia.secoes.sucessorio}
              onChange={(s) => updateSecao("sucessorio", s)}
              financialPlan={financialPlan}
            />
          )}

          {secaoAtiva === "proximosPassos" && (
            <SecaoProximosPassos
              secao={estrategia.secoes.proximosPassos}
              onChange={(s) => updateSecao("proximosPassos", s)}
              financialPlan={financialPlan}
            />
          )}
        </main>
      </div>

      {/* Print layers */}
      {printMode === "assessor" && (
        <EstrategiaPrintAssessor
          estrategia={estrategia}
          financialPlan={financialPlan}
          clientName={clientName}
        />
      )}
      {printMode === "cliente" && (
        <EstrategiaPrintCliente
          estrategia={estrategia}
          financialPlan={financialPlan}
          clientName={clientName}
        />
      )}
    </div>
  );
}
