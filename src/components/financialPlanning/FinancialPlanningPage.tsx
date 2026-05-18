import { useState, useCallback } from "react";
import { toast } from "sonner";
import { initialFinancialPlan } from "@/types/financialPlanning";
import type { FinancialPlan, DadosCliente } from "@/types/financialPlanning";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import { FPLayout } from "./layout/FPLayout";
import type { FPStep } from "./layout/FPSidebar";
import { ColetaDadosForm } from "./ColetaDadosForm";
import { AtivoForm } from "./AtivoForm";
import { PlanejamentoIFForm } from "./PlanejamentoIFForm";
import { ProtecaoSucessorioForm } from "./ProtecaoSucessorioForm";
import { FiscalForm } from "./FiscalForm";
import { FinancialPlanDashboard } from "./FinancialPlanDashboard";
import { FinancialPlanPrintAdvisor, FinancialPlanPrintClient } from "./FinancialPlanPrint";
import { EstrategiaInicialPage } from "@/components/estrategia/EstrategiaInicialPage";

const STEP_ORDER: FPStep[] = [
  "coleta",
  "ativos",
  "aposentadoria",
  "protecaoSucessorio",
  "fiscal",
  "resultado",
];

const FORM_STEPS: FPStep[] = STEP_ORDER.filter((s) => s !== "resultado");

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export function FinancialPlanningPage({ clientId, clientName, onClose }: Props) {
  const store = useFinancialPlanStore();
  const [plan, setPlan] = useState<FinancialPlan>(() => {
    const existing = store.getLatestPlan(clientId);
    return existing ?? initialFinancialPlan(clientId);
  });
  const [step, setStep] = useState<FPStep>("coleta");
  const [completedSteps, setCompletedSteps] = useState<Set<FPStep>>(new Set());
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<"advisor" | "client" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mostrarEstrategia, setMostrarEstrategia] = useState(false);

  const updatePlan = useCallback((patch: Partial<FinancialPlan>) => {
    setPlan((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  function markComplete(s: FPStep) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(s);
      return next;
    });
  }

  async function handleSave(status?: FinancialPlan["status"]) {
    setSaving(true);
    try {
      const saved = await store.savePlan(status ? { ...plan, status } : plan);
      setPlan(saved);
      setDirty(false);
      toast.success(status === "completo" ? "Plano finalizado!" : "Rascunho salvo.");
    } catch {
      toast.error("Erro ao salvar o plano.");
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    markComplete(step);
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  function handleBack() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  function handleStepClick(target: FPStep) {
    const targetIdx = STEP_ORDER.indexOf(target);
    const currentIdx = STEP_ORDER.indexOf(step);

    if (target === "resultado") {
      if (completedSteps.size < 5) {
        toast.info("Complete as 5 etapas anteriores para ver o resultado.");
        return;
      }
      setStep("resultado");
      return;
    }

    if (targetIdx > currentIdx && !completedSteps.has(target)) {
      toast.info("Complete as etapas anteriores primeiro.");
    }
    setStep(target);
  }

  function handleBackToClients() {
    if (dirty && !window.confirm("Há alterações não salvas. Deseja sair mesmo assim?"))
      return;
    onClose();
  }

  function handleColetaComplete(dadosCliente: DadosCliente) {
    const newPlan: FinancialPlan = {
      ...plan,
      dadosCliente,
      suitability: dadosCliente.suitabilityPerfil
        ? {
            respostas: dadosCliente.suitabilityRespostas,
            totalPontos: dadosCliente.suitabilityPontuacao,
            percentual: (dadosCliente.suitabilityPontuacao / 35) * 100,
            perfil: dadosCliente.suitabilityPerfil,
            dataResposta: new Date().toISOString(),
          }
        : plan.suitability,
      planejamentoIF:
        plan.planejamentoIF.idadeAtual === 35
          ? {
              ...plan.planejamentoIF,
              idadeAtual: dadosCliente.dataNascimento
                ? new Date().getFullYear() -
                  new Date(dadosCliente.dataNascimento).getFullYear()
                : plan.planejamentoIF.idadeAtual,
              rendaMensalDesejada:
                dadosCliente.rendaMensal > 0
                  ? dadosCliente.rendaMensal
                  : plan.planejamentoIF.rendaMensalDesejada,
              aporteMensal:
                dadosCliente.aportesMensalMedio > 0
                  ? dadosCliente.aportesMensalMedio
                  : plan.planejamentoIF.aporteMensal,
              patrimonioAtual:
                dadosCliente.patrimonioFinanceiroEstimado > 0
                  ? dadosCliente.patrimonioFinanceiroEstimado
                  : plan.planejamentoIF.patrimonioAtual,
            }
          : plan.planejamentoIF,
      protecao: {
        ...plan.protecao,
        rendaMensal:
          dadosCliente.rendaMensal > 0 && plan.protecao.rendaMensal === 0
            ? dadosCliente.rendaMensal
            : plan.protecao.rendaMensal,
        possuiSeguroVida: dadosCliente.temSeguroVida || plan.protecao.possuiSeguroVida,
        capitalSeguradoVida:
          dadosCliente.valorApoliceVida > 0 && plan.protecao.capitalSeguradoVida === 0
            ? dadosCliente.valorApoliceVida
            : plan.protecao.capitalSeguradoVida,
        possuiSeguroInvalidez:
          dadosCliente.temSeguroInvalidez || plan.protecao.possuiSeguroInvalidez,
      },
      sucessorio: {
        ...plan.sucessorio,
        patrimonioTotal:
          dadosCliente.patrimonioTotalEstimado > 0 && plan.sucessorio.patrimonioTotal === 0
            ? dadosCliente.patrimonioTotalEstimado
            : plan.sucessorio.patrimonioTotal,
        estadoResidencia:
          dadosCliente.estado && !plan.sucessorio.estadoResidencia
            ? dadosCliente.estado
            : plan.sucessorio.estadoResidencia,
      },
      fiscal: {
        ...plan.fiscal,
        rendaBrutaAnual:
          dadosCliente.rendaMensal > 0 && plan.fiscal.rendaBrutaAnual === 0
            ? dadosCliente.rendaMensal * 12
            : plan.fiscal.rendaBrutaAnual,
        temEmpresa: dadosCliente.tipoTrabalho === "empresario" || plan.fiscal.temEmpresa,
      },
    };
    setPlan(newPlan);
    setDirty(true);
    markComplete("coleta");
    setStep("ativos");
  }

  function handlePrint(type: "advisor" | "client") {
    setPrintMode(type);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

  const clientPerfil =
    plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null;

  // ── Estratégia overlay ────────────────────────────────────────────────────
  if (mostrarEstrategia) {
    return (
      <EstrategiaInicialPage
        plan={plan}
        clientName={clientName}
        onClose={() => setMostrarEstrategia(false)}
      />
    );
  }

  const allFormsDone = FORM_STEPS.every((s) => completedSteps.has(s));
  const isResultStep = step === "resultado";

  return (
    <>
      <FPLayout
        clientName={clientName}
        clientPerfil={clientPerfil}
        currentStep={step}
        completedSteps={completedSteps}
        onBackToClients={handleBackToClients}
        onStepClick={handleStepClick}
        onSave={() => handleSave()}
        saving={saving}
        onBack={handleBack}
        onNext={handleNext}
        onAvancarEstrategia={() => setMostrarEstrategia(true)}
        showNextButton={step !== "coleta"}
      >
        {step === "coleta" && (
          <ColetaDadosForm
            value={plan.dadosCliente}
            onChange={(v) => updatePlan({ dadosCliente: v })}
            onComplete={handleColetaComplete}
          />
        )}

        {step === "ativos" && (
          <AtivoForm
            value={plan.ativosAtuais}
            suitabilityPerfil={clientPerfil}
            onChange={(v) => updatePlan({ ativosAtuais: v })}
            dadosCliente={plan.dadosCliente}
          />
        )}

        {step === "aposentadoria" && (
          <PlanejamentoIFForm
            value={plan.planejamentoIF}
            onChange={(v) => updatePlan({ planejamentoIF: v })}
            dadosCliente={plan.dadosCliente}
          />
        )}

        {step === "protecaoSucessorio" && (
          <ProtecaoSucessorioForm
            protecao={plan.protecao}
            onProtecaoChange={(v) => updatePlan({ protecao: v })}
            sucessorio={plan.sucessorio}
            onSucessorioChange={(v) => updatePlan({ sucessorio: v })}
            dadosCliente={plan.dadosCliente}
          />
        )}

        {step === "fiscal" && (
          <FiscalForm
            value={plan.fiscal}
            onChange={(v) => updatePlan({ fiscal: v })}
            dadosCliente={plan.dadosCliente}
          />
        )}

        {isResultStep && (
          <FinancialPlanDashboard
            plan={plan}
            clientName={clientName}
            onEdit={() => setStep("coleta")}
            onSave={() => handleSave("completo")}
            onPrint={handlePrint}
            onNotasChange={(notas) => updatePlan({ notasConsultor: notas })}
            onAvancarEstrategia={() => setMostrarEstrategia(true)}
            allStepsDone={allFormsDone}
          />
        )}
      </FPLayout>

      {printMode === "advisor" && (
        <FinancialPlanPrintAdvisor plan={plan} clientName={clientName} />
      )}
      {printMode === "client" && (
        <FinancialPlanPrintClient plan={plan} clientName={clientName} />
      )}
    </>
  );
}
