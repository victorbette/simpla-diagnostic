import { Check, Lock } from "lucide-react";

const DARK = "#000000";
const TEAL = "#3B82F6";
const GREEN = "#15803D";
const GOLD = "#3B82F6";

export type FPStep =
  | "coleta"
  | "ativos"
  | "aposentadoria"
  | "protecaoSucessorio"
  | "fiscal"
  | "resultado";

const STEPS: { id: FPStep; label: string; num: number }[] = [
  { id: "coleta", label: "Coleta de dados", num: 1 },
  { id: "ativos", label: "Patrimônio atual", num: 2 },
  { id: "aposentadoria", label: "Aposentadoria / IF", num: 3 },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório", num: 4 },
  { id: "fiscal", label: "Fiscal", num: 5 },
  { id: "resultado", label: "Resultado", num: 6 },
];

const AVATAR_COLORS = [
  "bg-[#DBEAFE] text-[#2563EB]",
  "bg-[#DBEAFE] text-[#2563EB]",
  "bg-[#DCFCE7] text-[#15803D]",
  "bg-[#EFF6FF] text-[#2563EB]",
];

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function avatarClass(nome: string): string {
  const sum = nome.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

interface ProfileCfg {
  dotColor: string;
  label: string;
  textColor: string;
  bg: string;
}

function perfilCfg(perfil: string | null | undefined): ProfileCfg {
  switch (perfil) {
    case "moderado":
      return { dotColor: "#2563EB", label: "MODERADO", textColor: "#2563EB", bg: "#EFF6FF" };
    case "conservador":
      return { dotColor: TEAL, label: "CONSERVADOR", textColor: "#1E40AF", bg: "#EAF0F5" };
    case "conservador_moderado":
      return { dotColor: TEAL, label: "CONS. MOD.", textColor: "#1E40AF", bg: "#EAF0F5" };
    case "arrojado":
      return { dotColor: "#B91C1C", label: "ARROJADO", textColor: "#B91C1C", bg: "#FEE2E2" };
    default:
      return { dotColor: "#9CA3AF", label: "SEM PERFIL", textColor: "#6B7280", bg: "#F0F7FF" };
  }
}

interface Props {
  clientName: string;
  clientPerfil: string | null | undefined;
  currentStep: FPStep;
  completedSteps: Set<FPStep>;
  onBackToClients: () => void;
  onStepClick: (step: FPStep) => void;
}

export function FPSidebar({
  clientName,
  clientPerfil,
  currentStep,
  completedSteps,
  onBackToClients,
  onStepClick,
}: Props) {
  const pc = perfilCfg(clientPerfil);
  const completedCount = STEPS.filter(
    (s) => s.id !== "resultado" && completedSteps.has(s.id)
  ).length;
  const progressPct = (completedCount / 5) * 100;

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        backgroundColor: "white",
        borderRight: "1px solid #F0F7FF",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Back to clients */}
      <button
        onClick={onBackToClients}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "14px 20px",
          fontSize: 13,
          color: TEAL,
          fontWeight: 600,
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: "1px solid #F0F7FF",
          width: "100%",
          textAlign: "left",
        }}
      >
        ← Meus Clientes
      </button>

      {/* Client info */}
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #F0F7FF",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className={`${avatarClass(clientName)} flex items-center justify-center rounded-full shrink-0 font-bold text-sm select-none`}
            style={{ width: 48, height: 48 }}
          >
            {getInitials(clientName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: DARK,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {clientName}
            </p>
          </div>
        </div>
        {/* Profile badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: pc.bg,
            borderRadius: 100,
            padding: "4px 10px",
            width: "fit-content",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: pc.dotColor,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: pc.textColor,
              letterSpacing: "0.05em",
            }}
          >
            {pc.label}
          </span>
        </div>
      </div>

      {/* Steps label */}
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#9CA3AF",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "16px 20px 8px",
          margin: 0,
        }}
      >
        ETAPAS DO PLANO
      </p>

      {/* Stepper */}
      <nav style={{ padding: "0 20px", flex: 1 }}>
        {STEPS.map((step, idx) => {
          const isComplete = completedSteps.has(step.id);
          const isActive = step.id === currentStep;
          const isLocked =
            step.id === "resultado" && completedCount < 5;
          const isLast = idx === STEPS.length - 1;

          let circleStyle: React.CSSProperties;
          let labelColor: string;
          let subLabel: string | null = null;
          let subColor = GREEN;

          if (isComplete) {
            circleStyle = {
              backgroundColor: GREEN,
              border: "none",
              color: "white",
            };
            labelColor = DARK;
            subLabel = "Concluído";
            subColor = GREEN;
          } else if (isActive) {
            circleStyle = {
              backgroundColor: DARK,
              border: "none",
              color: "white",
            };
            labelColor = DARK;
            subLabel = "Em andamento";
            subColor = TEAL;
          } else if (isLocked) {
            circleStyle = {
              backgroundColor: "white",
              border: "1.5px solid #BFDBFE",
              color: "#BFDBFE",
            };
            labelColor = "#BFDBFE";
          } else {
            // pending
            circleStyle = {
              backgroundColor: "white",
              border: "1.5px solid #BFDBFE",
              color: "#9CA3AF",
            };
            labelColor = "#6B7280";
          }

          // Connector line style
          let lineStyle: React.CSSProperties = {};
          if (!isLast) {
            if (isComplete) {
              lineStyle = { borderLeft: `2px solid ${GREEN}` };
            } else if (isActive) {
              lineStyle = { borderLeft: "2px solid #BFDBFE" };
            } else {
              lineStyle = {
                borderLeft: "2px dashed #BFDBFE",
              };
            }
          }

          return (
            <div key={step.id} style={{ display: "flex", gap: 12 }}>
              {/* Circle + line */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => !isLocked && onStepClick(step.id)}
                  disabled={isLocked}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isLocked ? "not-allowed" : "pointer",
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                    ...circleStyle,
                  }}
                >
                  {isComplete ? (
                    <Check size={13} strokeWidth={3} />
                  ) : isLocked ? (
                    <Lock size={12} />
                  ) : (
                    step.num
                  )}
                </button>
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      width: 0,
                      minHeight: 28,
                      marginTop: 2,
                      marginBottom: 2,
                      ...lineStyle,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div style={{ paddingTop: 4, paddingBottom: isLast ? 0 : 24 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: isComplete || isActive ? 700 : 400,
                    color: labelColor,
                    margin: 0,
                    lineHeight: "1.3",
                  }}
                >
                  {step.label}
                </p>
                {subLabel && (
                  <p
                    style={{
                      fontSize: 11,
                      color: subColor,
                      fontWeight: 600,
                      margin: "2px 0 0",
                    }}
                  >
                    {subLabel}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Progress footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #F0F7FF",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#6B7280",
            marginBottom: 6,
          }}
        >
          <span>Progresso</span>
          <span>{completedCount} de 6 etapas</span>
        </div>
        <div
          style={{
            height: 4,
            backgroundColor: "#F0F7FF",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              backgroundColor: GOLD,
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </aside>
  );
}
