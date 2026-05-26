import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { initialFinancialPlan } from "@/types/financialPlanning";
import type { FinancialPlan, DadosCliente } from "@/types/financialPlanning";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import { useAuth } from "@/contexts/AuthContext";
import { ColetaDadosCompleta } from "./ColetaDadosCompleta";
import { FinancialPlanDashboard } from "./FinancialPlanDashboard";
import { FinancialPlanPrintAdvisor, FinancialPlanPrintClient } from "./FinancialPlanPrint";
import { EstrategiaInicialPage } from "@/components/estrategia/EstrategiaInicialPage";

const DARK = "#000000";
const GOLD = "#3B82F6";

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export function FinancialPlanningPage({ clientId, clientName, onClose }: Props) {
  const store = useFinancialPlanStore();
  const { user, signOut } = useAuth();
  const [plan, setPlan] = useState<FinancialPlan>(() => initialFinancialPlan(clientId));
  const [aba, setAba] = useState<"coleta" | "resultado">("coleta");
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<"advisor" | "client" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mostrarEstrategia, setMostrarEstrategia] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);
  const planInitialized = useRef(false);

  const userEmail = user?.email ?? "";
  const userLabel = userEmail.split("@")[0] || "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  // Load (or create) plan on mount
  useEffect(() => {
    const init = async () => {
      await store.carregarPlano(clientId);

      if (!store.planRef.current) {
        try {
          await store.criarPlano(clientId);
        } catch (err) {
          console.error("FinancialPlanningPage: criarPlano failed", err);
        }
      }

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
  }

  function handlePrint(type: "advisor" | "client") {
    setPrintMode(type);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

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

  return (
    <>
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
          {/* Back + Logo */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={handleBackToClients}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#93C5FD",
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              ← Clientes
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/logo-si.svg"
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
            <span style={{ color: "#93C5FD", fontSize: 13, fontWeight: 500, marginLeft: 4 }}>
              — {clientName}
            </span>
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

        {/* ── Tab bar ── */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #E5E7EB",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexShrink: 0,
            height: 44,
          }}
        >
          {(["coleta", "resultado"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              style={{
                background: "none",
                border: "none",
                borderBottom: aba === tab ? "2px solid #1E3A8A" : "2px solid transparent",
                color: aba === tab ? "#1E3A8A" : "#6B7280",
                fontWeight: aba === tab ? 700 : 500,
                fontSize: 13,
                padding: "0 18px",
                height: "100%",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s",
              }}
            >
              {tab === "coleta" ? "Coleta de Dados" : "Resultado"}
            </button>
          ))}

          {/* Spacer + save status + Salvar button */}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              onClick={() => handleSave()}
              disabled={saving}
              style={{
                border: "1.5px solid #1E3A8A",
                backgroundColor: "white",
                color: "#1E3A8A",
                borderRadius: 6,
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: "#F0F7FF",
            overflowY: "auto",
          }}
        >
          {aba === "coleta" && (
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>
              <ColetaDadosCompleta
                plan={plan}
                onChange={updatePlan}
                onColetaComplete={handleColetaComplete}
              />
            </div>
          )}

          {aba === "resultado" && (
            <FinancialPlanDashboard
              plan={plan}
              clientName={clientName}
              onEdit={() => setAba("coleta")}
              onSave={async () => { await handleSave("completo"); }}
              onPrint={handlePrint}
              onAvancarEstrategia={() => setMostrarEstrategia(true)}
              allStepsDone={true}
              ultimoSalvo={ultimoSalvo}
            />
          )}
        </main>
      </div>

      {printMode === "advisor" && (
        <FinancialPlanPrintAdvisor plan={plan} clientName={clientName} />
      )}
      {printMode === "client" && (
        <FinancialPlanPrintClient plan={plan} clientName={clientName} />
      )}
    </>
  );
}
