import { useState, useCallback, useEffect, useRef } from "react";
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
  const [plan, setPlan] = useState<FinancialPlan>(() => initialFinancialPlan(clientId));
  const [step, setStep] = useState<FPStep>("coleta");
  const [completedSteps, setCompletedSteps] = useState<Set<FPStep>>(new Set());
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<"advisor" | "client" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mostrarEstrategia, setMostrarEstrategia] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);
  const planInitialized = useRef(false);

  // Load (or create) plan on mount — ensures plan.id always exists for saves
  useEffect(() => {
    const init = async () => {
      await store.carregarPlano(clientId);

      // planRef is updated synchronously inside carregarPlano
      if (!store.planRef.current) {
        // No plan yet — create a blank one so all subsequent saves are UPDATEs
        try {
          await store.criarPlano(clientId);
        } catch (err) {
          console.error("FinancialPlanningPage: criarPlano failed", err);
        }
      }

      // Sync to local state (only once)
      if (!planInitialized.current) {
        planInitialized.current = true;
        if (store.planRef.current) {
          setPlan(store.planRef.current);
          setDirty(false);
        }
      }
    };

    init().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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
      setUltimoSalvo(new Date());
      toast.success(status === "completo" ? "Plano finalizado!" : "Rascunho salvo.");
    } catch (err) {
      const supaErr = err as { message?: string; hint?: string; details?: string };
      const msg = supaErr.message ?? (err instanceof Error ? err.message : "Erro desconhecido");
      const hint = supaErr.hint ? ` (${supaErr.hint})` : "";
      toast.error(`Erro ao salvar: ${msg}${hint}`);
      console.error("handleSave failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    markComplete(step);
    // Auto-save silently before advancing
    try {
      const saved = await store.savePlan(plan);
      setPlan(saved);
      setDirty(false);
      setUltimoSalvo(new Date());
    } catch {
      // falha silenciosa — usuário pode salvar manualmente
    }
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

  async function handleBackToClients() {
    if (dirty) {
      const resposta = window.confirm(
        "Há alterações não salvas. Deseja salvar antes de sair?"
      );
      if (resposta) {
        try {
          await handleSave();
        } catch {
          // erro já exibido em handleSave
        }
      }
    }
    onClose();
  }

  function handleColetaComplete(dadosCliente: DadosCliente) {
    const newPlan: FinancialPlan = {
      ...plan,
      dadosCliente,
      suitability: dadosCliente.suitabilityPerfil
        ? {
            respostas: [],
            totalPontos: 0,
            percentual: 0,
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
        onSaveCloud={async (data) => {
          if (!plan.id) throw new Error("Salve o Financial Planning antes de salvar a estratégia.");
          await store.saveEstrategia(plan.id, data as unknown as Record<string, unknown>);
        }}
        onLoadCloud={async () => {
          if (!plan.id) return null;
          return store.loadEstrategia(plan.id) as Promise<Record<string, unknown> | null>;
        }}
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
        dirty={dirty}
        ultimoSalvo={ultimoSalvo}
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
            onSave={async () => { await handleSave("completo"); }}
            onPrint={handlePrint}
            onAvancarEstrategia={() => setMostrarEstrategia(true)}
            allStepsDone={allFormsDone}
            ultimoSalvo={ultimoSalvo}
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
