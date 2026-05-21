import { Check, Lock } from "lucide-react";

const DARK = "#000000";
const TEAL = "#BBA866";
const GREEN = "#3D6B41";
const GOLD = "#BBA866";

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
  "bg-purple-200 text-[#8A7A45]",
  "bg-teal-200 text-[#8A7A45]",
  "bg-green-200 text-[#3D6B41]",
  "bg-amber-200 text-[#8A7A45]",
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
      return { dotColor: "#8A7A45", label: "MODERADO", textColor: "#8A7A45", bg: "#F5F0E0" };
    case "conservador":
      return { dotColor: TEAL, label: "CONSERVADOR", textColor: "#0F766E", bg: "#F0FDFE" };
    case "conservador_moderado":
      return { dotColor: TEAL, label: "CONS. MOD.", textColor: "#0F766E", bg: "#F0FDFE" };
    case "arrojado":
      return { dotColor: "#7A3535", label: "ARROJADO", textColor: "#7A3535", bg: "#FFF5F5" };
    default:
      return { dotColor: "#9E9070", label: "SEM PERFIL", textColor: "#6B6347", bg: "#F5F3EE" };
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
        borderRight: "1px solid #F5F3EE",
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
          borderBottom: "1px solid #F5F3EE",
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
          borderBottom: "1px solid #F5F3EE",
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
          color: "#9E9070",
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
              border: "1.5px solid #E2DCC8",
              color: "#E2DCC8",
            };
            labelColor = "#E2DCC8";
          } else {
            // pending
            circleStyle = {
              backgroundColor: "white",
              border: "1.5px solid #E2DCC8",
              color: "#9E9070",
            };
            labelColor = "#6B6347";
          }

          // Connector line style
          let lineStyle: React.CSSProperties = {};
          if (!isLast) {
            if (isComplete) {
              lineStyle = { borderLeft: `2px solid ${GREEN}` };
            } else if (isActive) {
              lineStyle = { borderLeft: "2px solid #E2DCC8" };
            } else {
              lineStyle = {
                borderLeft: "2px dashed #E2DCC8",
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
          borderTop: "1px solid #F5F3EE",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#6B6347",
            marginBottom: 6,
          }}
        >
          <span>Progresso</span>
          <span>{completedCount} de 6 etapas</span>
        </div>
        <div
          style={{
            height: 4,
            backgroundColor: "#F5F3EE",
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
