import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FPSidebar } from "./FPSidebar";
import type { FPStep } from "./FPSidebar";

const DARK = "#000000";
const GOLD = "#3B82F6";

const STEP_META: Record<FPStep, { title: string; subtitle: string; next: string | null }> = {
  coleta: {
    title: "Coleta de dados",
    subtitle: "Informações pessoais, financeiras e perfil de investidor do cliente",
    next: "Patrimônio atual",
  },
  ativos: {
    title: "Patrimônio atual",
    subtitle: "Carteira de investimentos e ativos do cliente",
    next: "Aposentadoria",
  },
  aposentadoria: {
    title: "Aposentadoria",
    subtitle: "Planejamento de independência financeira e aposentadoria",
    next: "Proteção e Sucessório",
  },
  protecaoSucessorio: {
    title: "Proteção e Sucessório",
    subtitle: "Seguros, proteção patrimonial e planejamento sucessório",
    next: "Fiscal",
  },
  fiscal: {
    title: "Planejamento fiscal",
    subtitle: "Eficiência tributária, PGBL/VGBL e declaração de IR",
    next: null,
  },
  resultado: {
    title: "Resultado — Diagnóstico inicial",
    subtitle: "Visão consolidada do planejamento financeiro",
    next: null,
  },
};

const STEP_ORDER: FPStep[] = [
  "coleta",
  "ativos",
  "aposentadoria",
  "protecaoSucessorio",
  "fiscal",
  "resultado",
];

interface Props {
  clientName: string;
  clientPerfil: string | null | undefined;
  currentStep: FPStep;
  completedSteps: Set<FPStep>;
  onBackToClients: () => void;
  onStepClick: (step: FPStep) => void;
  onSave: () => void;
  saving: boolean;
  dirty?: boolean;
  ultimoSalvo?: Date | null;
  onBack: () => void;
  onNext: () => void;
  onAvancarEstrategia?: () => void;
  showNextButton: boolean;
  children: React.ReactNode;
}

export function FPLayout({
  clientName,
  clientPerfil,
  currentStep,
  completedSteps,
  onBackToClients,
  onStepClick,
  onSave,
  saving,
  dirty,
  ultimoSalvo,
  onBack,
  onNext,
  onAvancarEstrategia,
  showNextButton,
  children,
}: Props) {
  const { user, signOut } = useAuth();
  const userEmail = user?.email ?? "";
  const userLabel = userEmail.split("@")[0] || "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  const meta = STEP_META[currentStep];
  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const stepNumber = stepIndex + 1;
  const isResultStep = currentStep === "resultado";

  // Dots
  const dots = STEP_ORDER.map((s, i) => ({
    active: s === currentStep,
    complete: completedSteps.has(s),
    index: i,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* ── Header ── */}
      <header
        style={{
          backgroundColor: "#1E3A8A",
          flexShrink: 0,
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 16,
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/diamond-icon-small.png"
              alt="Simpla Invest"
              style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>
                Simpla Invest
              </span>
              <span style={{ color: "#93C5FD", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.04em" }}>
                Financial Planning
              </span>
            </div>
          </div>
        </div>

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "white", fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.2 }}>
              {userLabel}
            </p>
            <p style={{ color: "#9CA3AF", fontSize: 11, margin: 0, lineHeight: 1.2 }}>
              Consultor financeiro
            </p>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: GOLD,
              color: DARK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {userInitials}
          </div>
          <button
            onClick={signOut}
            title="Sair"
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <FPSidebar
          clientName={clientName}
          clientPerfil={clientPerfil}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onBackToClients={onBackToClients}
          onStepClick={onStepClick}
        />

        {/* Content area */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "#F0F7FF",
            overflowY: "auto",
            padding: 32,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Top row: step label + title + save button */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#9CA3AF",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 4px",
                }}
              >
                ETAPA {stepNumber} DE 6
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: DARK, margin: "0 0 4px" }}>
                {meta.title}
              </h1>
              <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
                {meta.subtitle}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {dirty && !saving && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2563EB", display: "inline-block" }} />
                  Não salvo
                </span>
              )}
              {ultimoSalvo && !dirty && !saving && (
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                  Salvo às {ultimoSalvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={onSave}
                disabled={saving}
                style={{
                  border: `1.5px solid ${DARK}`,
                  backgroundColor: "white",
                  color: DARK,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {saving ? "Salvando..." : "Salvar rascunho"}
              </button>
            </div>
          </div>

          {/* Card branco principal (não usado no resultado) */}
          {isResultStep ? (
            children
          ) : (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 28,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {children}
            </div>
          )}

          {/* Navigation footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
            }}
          >
            {/* Back */}
            <button
              onClick={onBack}
              disabled={stepIndex === 0}
              style={{
                border: `1.5px solid ${DARK}`,
                backgroundColor: "white",
                color: stepIndex === 0 ? "#9CA3AF" : DARK,
                borderColor: stepIndex === 0 ? "#BFDBFE" : DARK,
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: stepIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              {isResultStep ? "← Etapa anterior: Fiscal" : "← Etapa anterior"}
            </button>

            {/* Dots */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {dots.map((d) => (
                <span
                  key={d.index}
                  style={{
                    width: d.active ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: d.active
                      ? DARK
                      : d.complete
                      ? "#15803D"
                      : "#BFDBFE",
                    display: "inline-block",
                    transition: "width 0.2s",
                  }}
                />
              ))}
            </div>

            {/* Next / Montar Estratégia */}
            {isResultStep ? (
              <button
                onClick={onAvancarEstrategia}
                style={{
                  backgroundColor: DARK,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Montar Financial Planning →
              </button>
            ) : showNextButton ? (
              <button
                onClick={onNext}
                style={{
                  backgroundColor: DARK,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {meta.next
                  ? `Próxima etapa: ${meta.next} →`
                  : "Gerar diagnóstico →"}
              </button>
            ) : (
              <div style={{ width: 180 }} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
