import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  PieChart,
  Sunset,
  Shield,
  Receipt,
  GitBranch,
  CheckCircle2,
  Circle,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { initialFinancialPlan } from "@/types/financialPlanning";
import type { FinancialPlan, SuitabilityResult } from "@/types/financialPlanning";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import { SuitabilityForm } from "./SuitabilityForm";
import { AtivoForm } from "./AtivoForm";
import { PlanejamentoIFForm } from "./PlanejamentoIFForm";
import { ProtecaoForm } from "./ProtecaoForm";
import { FiscalForm } from "./FiscalForm";
import { SucessorioForm } from "./SucessorioForm";
import { FinancialPlanDashboard } from "./FinancialPlanDashboard";
import { FinancialPlanPrintAdvisor, FinancialPlanPrintClient } from "./FinancialPlanPrint";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "suitability"
  | "ativos"
  | "aposentadoria"
  | "protecao"
  | "fiscal"
  | "sucessorio"
  | "resultado";

const STEPS: { id: Step; label: string; Icon: React.ElementType }[] = [
  { id: "suitability", label: "Perfil de risco", Icon: ClipboardList },
  { id: "ativos", label: "Patrimônio atual", Icon: PieChart },
  { id: "aposentadoria", label: "Aposentadoria / IF", Icon: Sunset },
  { id: "protecao", label: "Proteção", Icon: Shield },
  { id: "fiscal", label: "Fiscal", Icon: Receipt },
  { id: "sucessorio", label: "Sucessório", Icon: GitBranch },
];

const FORM_STEPS = STEPS.map((s) => s.id);

function stepIndex(step: Step): number {
  return FORM_STEPS.indexOf(step);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinancialPlanningPageProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancialPlanningPage({
  clientId,
  clientName,
  onClose,
}: FinancialPlanningPageProps) {
  const store = useFinancialPlanStore();
  const [plan, setPlan] = useState<FinancialPlan>(() => {
    const existing = store.getLatestPlan(clientId);
    return existing ?? initialFinancialPlan(clientId);
  });
  const [step, setStep] = useState<Step>("suitability");
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<"advisor" | "client" | null>(null);
  const [dirty, setDirty] = useState(false);

  const updatePlan = useCallback((patch: Partial<FinancialPlan>) => {
    setPlan((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(status?: FinancialPlan["status"]) {
    setSaving(true);
    try {
      const saved = await store.savePlan(
        status ? { ...plan, status } : plan
      );
      setPlan(saved);
      setDirty(false);
      toast.success(status === "completo" ? "Plano finalizado!" : "Rascunho salvo.");
    } catch {
      toast.error("Erro ao salvar o plano.");
    } finally {
      setSaving(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleNext() {
    const idx = stepIndex(step);
    if (idx < FORM_STEPS.length - 1) {
      setStep(FORM_STEPS[idx + 1]);
    } else {
      setStep("resultado");
    }
  }

  function handleBack() {
    if (step === "resultado") {
      setStep("sucessorio");
      return;
    }
    const idx = stepIndex(step);
    if (idx > 0) setStep(FORM_STEPS[idx - 1]);
  }

  function handleClose() {
    if (dirty && !window.confirm("Há alterações não salvas. Deseja sair mesmo assim?")) return;
    onClose();
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  function handlePrint(type: "advisor" | "client") {
    setPrintMode(type);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

  // ── Suitability completion ────────────────────────────────────────────────

  function handleSuitabilityComplete(result: SuitabilityResult) {
    updatePlan({ suitability: result });
    setStep("ativos");
  }

  // ── Stepper state ─────────────────────────────────────────────────────────

  const currentIdx = stepIndex(step);
  const isResult = step === "resultado";

  function stepStatus(s: Step): "complete" | "current" | "pending" {
    if (s === step) return "current";
    const si = stepIndex(s);
    if (si < currentIdx) return "complete";
    return "pending";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <span className="font-semibold">Planejamento financeiro</span>
            <span className="ml-2 text-sm text-muted-foreground">{clientName}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => handleSave()}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        {/* ── Stepper sidebar ── */}
        {!isResult && (
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-20 space-y-1">
              {/* Progress bar */}
              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{currentIdx + 1}/{FORM_STEPS.length}</span>
                </div>
                <Progress value={((currentIdx + 1) / FORM_STEPS.length) * 100} className="h-1.5" />
              </div>

              {STEPS.map(({ id, label, Icon }) => {
                const status = stepStatus(id);
                return (
                  <button
                    key={id}
                    disabled={status === "pending"}
                    onClick={() => status === "complete" && setStep(id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      status === "current"
                        ? "bg-primary text-primary-foreground"
                        : status === "complete"
                        ? "cursor-pointer text-foreground hover:bg-muted"
                        : "cursor-default text-muted-foreground"
                    )}
                  >
                    {status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : status === "current" ? (
                      <Icon className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 opacity-40" />
                    )}
                    <span className="leading-tight">{label}</span>
                  </button>
                );
              })}

              {/* Resultado pill */}
              <button
                disabled
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground cursor-default"
              >
                <BarChart2 className="h-4 w-4 shrink-0 opacity-40" />
                Resultado
              </button>
            </div>
          </aside>
        )}

        {/* ── Content area ── */}
        <div className="flex-1 min-w-0">
          {/* ── Forms ── */}
          {step === "suitability" && (
            <SuitabilityForm
              onComplete={handleSuitabilityComplete}
              onCancel={handleClose}
            />
          )}

          {step === "ativos" && (
            <AtivoForm
              value={plan.ativosAtuais}
              suitabilityPerfil={plan.suitability?.perfil ?? null}
              onChange={(v) => updatePlan({ ativosAtuais: v })}
            />
          )}

          {step === "aposentadoria" && (
            <PlanejamentoIFForm
              value={plan.planejamentoIF}
              onChange={(v) => updatePlan({ planejamentoIF: v })}
            />
          )}

          {step === "protecao" && (
            <ProtecaoForm
              value={plan.protecao}
              onChange={(v) => updatePlan({ protecao: v })}
            />
          )}

          {step === "fiscal" && (
            <FiscalForm
              value={plan.fiscal}
              onChange={(v) => updatePlan({ fiscal: v })}
            />
          )}

          {step === "sucessorio" && (
            <SucessorioForm
              value={plan.sucessorio}
              onChange={(v) => updatePlan({ sucessorio: v })}
            />
          )}

          {step === "resultado" && (
            <FinancialPlanDashboard
              plan={plan}
              clientName={clientName}
              onEdit={() => setStep("suitability")}
              onSave={() => handleSave("completo")}
              onPrint={handlePrint}
              onNotasChange={(notas) => updatePlan({ notasAssessor: notas })}
            />
          )}

          {/* ── Navigation buttons (forms only) ── */}
          {!isResult && (
            <div className="mt-8 flex items-center justify-between border-t pt-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {currentIdx === 0 ? "Cancelar" : "Anterior"}
              </Button>

              {step !== "suitability" && (
                <Button onClick={step === "sucessorio" ? () => setStep("resultado") : handleNext}>
                  {step === "sucessorio" ? "Gerar diagnóstico" : "Próximo"}
                  {step !== "sucessorio" && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              )}
            </div>
          )}

          {/* ── Result bottom buttons ── */}
          {isResult && (
            <div className="mt-6 flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep("suitability")}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Editar plano
              </Button>
              <Button onClick={() => handleSave("completo")} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar plano completo"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Print layers ── */}
      {printMode === "advisor" && (
        <FinancialPlanPrintAdvisor plan={plan} clientName={clientName} />
      )}
      {printMode === "client" && (
        <FinancialPlanPrintClient plan={plan} clientName={clientName} />
      )}
    </div>
  );
}
