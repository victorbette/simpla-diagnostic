import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { initialFinancialPlan } from "@/types/financialPlanning";
import { calcularIdade } from "@/lib/format";
import type { FinancialPlan, DadosCliente } from "@/types/financialPlanning";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import { useAuth } from "@/contexts/AuthContext";
import { ColetaDadosCompleta } from "./ColetaDadosCompleta";
import { FinancialPlanDashboard } from "./FinancialPlanDashboard";
import { SecaoAposentadoria } from "@/components/estrategia/SecaoAposentadoria";
import { SecaoAssetAllocation } from "@/components/estrategia/SecaoAssetAllocation";
import { SecaoProtecaoSucessorio } from "@/components/estrategia/SecaoProtecaoSucessorio";
import { SecaoFiscal } from "@/components/estrategia/SecaoFiscal";
import { EstrategiaFinal } from "@/components/estrategia/EstrategiaFinal";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { defaultResultados } from "@/types/estrategiaResultados";

const DARK = "#000000";
const GOLD = "#3B82F6";

// ── Abas principais (4) ───────────────────────────────────────────────────────

const ABAS = [
  { id: "coleta",                  label: "Coleta de Dados",         icone: "ti-clipboard-list" },
  { id: "protecao_sucessorio",     label: "Proteção e Sucessório",   icone: "ti-shield"          },
  { id: "planejamento_tributario", label: "Planejamento Tributário", icone: "ti-receipt"         },
  { id: "liberdade_financeira",    label: "Liberdade Financeira",    icone: "ti-beach"           },
];

// ── Abas da tela Financial Planning ──────────────────────────────────────────

const ABAS_FP = [
  { id: "asset_allocation", label: "Asset Allocation", icone: "ti-chart-pie" },
  { id: "relatorio",        label: "Relatório",        icone: "ti-file-text" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export function FinancialPlanningPage({ clientId, clientName, onClose }: Props) {
  const store = useFinancialPlanStore();
  const { user, signOut } = useAuth();
  const [plan, setPlan] = useState<FinancialPlan>(() => initialFinancialPlan(clientId));
  const [abaAtiva, setAbaAtiva] = useState("coleta");
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [mostrarFP, setMostrarFP] = useState(false);
  const [abaFP, setAbaFP] = useState("asset_allocation");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);
  const planInitialized = useRef(false);

  // ── Strategy state (localStorage-backed) ─────────────────────────────────

  const resultadosKey = `resultados_estrategia_${clientId}`;
  const estrategiaKey = `estrategia_v2_${clientId}`;

  const [resultados, setResultados] = useState<ResultadosEstrategia>(() => {
    try {
      const saved = localStorage.getItem(resultadosKey);
      if (saved) return JSON.parse(saved) as ResultadosEstrategia;
    } catch { /**/ }
    return defaultResultados;
  });

  const [comentarios, setComentarios] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(estrategiaKey);
      if (saved) return (JSON.parse(saved) as { comentarios?: Record<string, string> }).comentarios ?? {};
    } catch { /**/ }
    return {};
  });

  const [allTags, setAllTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(estrategiaKey);
      if (saved) return (JSON.parse(saved) as { tags?: Record<string, string[]> }).tags ?? {};
    } catch { /**/ }
    return {};
  });

  // Persist resultados to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(resultadosKey, JSON.stringify(resultados)); } catch { /**/ }
  }, [resultados, resultadosKey]);

  // Persist comentarios + tags to localStorage on change
  const estrategiaDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (estrategiaDebounce.current) clearTimeout(estrategiaDebounce.current);
    estrategiaDebounce.current = setTimeout(() => {
      try {
        const current = localStorage.getItem(estrategiaKey);
        const base = current ? JSON.parse(current) : {};
        localStorage.setItem(estrategiaKey, JSON.stringify({ ...base, comentarios, tags: allTags }));
      } catch { /**/ }
    }, 600);
  }, [comentarios, allTags, estrategiaKey]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const userEmail = user?.email ?? "";
  const userLabel = userEmail.split("@")[0] || "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  // ── Plan init ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await store.carregarPlano(clientId);
      if (!store.planRef.current) {
        try { await store.criarPlano(clientId); } catch (err) {
          console.error("FinancialPlanningPage: criarPlano failed", err);
        }
      }
      if (!planInitialized.current) {
        planInitialized.current = true;
        if (store.planRef.current) {
          setPlan(store.planRef.current);
          setDirty(false);
          const planId = store.planRef.current.id;
          if (planId) {
            try {
              const estrategia = await store.loadEstrategia(planId);
              if (estrategia && Object.keys(estrategia).length > 0) {
                setResultados(estrategia as unknown as ResultadosEstrategia);
              }
            } catch (err) {
              console.error("loadEstrategia failed:", err);
            }
          }
        }
      }
    };
    init().catch(console.error);
    return () => {
      if (estrategiaDebounce.current) clearTimeout(estrategiaDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ── Plan update ───────────────────────────────────────────────────────────

  const updatePlan = useCallback((patch: Partial<FinancialPlan>) => {
    setPlan((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

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
      const resposta = window.confirm("Há alterações não salvas. Deseja salvar antes de sair?");
      if (resposta) {
        try { await handleSave(); } catch { /* erro já exibido */ }
      }
    }
    onClose();
  }

  // ── Coleta complete ───────────────────────────────────────────────────────

  function handleColetaComplete(dadosCliente: DadosCliente) {
    const newPlan: FinancialPlan = {
      ...plan,
      dadosCliente,
      suitability: dadosCliente.suitabilityPerfil
        ? { respostas: [], totalPontos: 0, percentual: 0, perfil: dadosCliente.suitabilityPerfil, dataResposta: new Date().toISOString() }
        : plan.suitability,
      planejamentoIF:
        plan.planejamentoIF.idadeAtual === 35
          ? {
              ...plan.planejamentoIF,
              idadeAtual: dadosCliente.dataNascimento
                ? calcularIdade(dadosCliente.dataNascimento)
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

  // ── Per-section comentario / tags helpers ─────────────────────────────────

  const secaoComentario = comentarios[abaAtiva] ?? "";
  const secaoTags = allTags[abaAtiva] ?? [];

  const handleComentarioChange = useCallback(
    (v: string) => setComentarios((prev) => ({ ...prev, [abaAtiva]: v })),
    [abaAtiva]
  );
  const handleTagsChange = useCallback(
    (v: string[]) => setAllTags((prev) => ({ ...prev, [abaAtiva]: v })),
    [abaAtiva]
  );

  // ── Tab bar style helper ──────────────────────────────────────────────────

  function tabStyle(active: boolean): React.CSSProperties {
    return {
      background: "none", border: "none",
      borderBottom: active ? "2px solid #1E3A8A" : "2px solid transparent",
      color: active ? "#1E3A8A" : "#6B7280",
      fontWeight: active ? 700 : 500,
      fontSize: 13, padding: "0 14px", height: 44, cursor: "pointer",
      whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
      fontFamily: "inherit", transition: "color 0.15s", flexShrink: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── TELA: Financial Planning (Asset Allocation + Relatório) ──────────────
  // ─────────────────────────────────────────────────────────────────────────

  if (mostrarFP) {
    return (
      <div className="fp-print-root" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* Header FP */}
        <header style={{
          backgroundColor: "#1E3A8A", flexShrink: 0, padding: "0 24px",
          height: 56, display: "flex", alignItems: "center", gap: 16, zIndex: 40,
        }}>
          <button
            onClick={() => { setMostrarFP(false); setMostrarResultado(true); }}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.25)",
              color: "#93C5FD", cursor: "pointer", padding: "4px 10px",
              borderRadius: 6, fontSize: 12, fontWeight: 500,
            }}
          >
            ← Voltar
          </button>
          <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Financial Planning</span>
          <span style={{ color: "#93C5FD", fontSize: 13 }}>· {clientName}</span>
        </header>

        {/* Tab bar FP */}
        <div className="no-print" style={{
          backgroundColor: "white", borderBottom: "1px solid #E5E7EB",
          padding: "0 24px", display: "flex", alignItems: "center", flexShrink: 0,
        }}>
          {ABAS_FP.map((aba) => (
            <button key={aba.id} onClick={() => setAbaFP(aba.id)} style={tabStyle(abaFP === aba.id)}>
              <i className={`ti ${aba.icone}`} style={{ fontSize: 14 }} />
              {aba.label}
            </button>
          ))}
        </div>

        {/* Content FP */}
        {/* EstrategiaFinal manages its own overflow — needs overflow:hidden parent */}
        <main className="fp-print-main" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {abaFP === "relatorio" ? (
            <EstrategiaFinal
              plan={plan}
              resultados={resultados}
              clientName={clientName}
              onResultadosChange={(r) => setResultados(r)}
              onConcluir={async () => { await handleSave("completo"); }}
            />
          ) : (
            <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F0F7FF" }}>
              {abaFP === "asset_allocation" && (
                <div style={{ padding: "28px 32px" }}>
                  <SecaoAssetAllocation
                    plan={plan}
                    clientName={clientName}
                    comentario={comentarios["asset_allocation"] ?? ""}
                    onComentarioChange={(v) => setComentarios((prev) => ({ ...prev, asset_allocation: v }))}
                    tags={allTags["asset_allocation"] ?? []}
                    onTagsChange={(v) => setAllTags((prev) => ({ ...prev, asset_allocation: v }))}
                    resultadoCarteira={resultados.carteira}
                    onResultadoCarteira={async (r) => {
                      const novos = { ...resultados, carteira: r };
                      setResultados(novos);
                      if (plan.id) {
                        try { await store.saveEstrategia(plan.id, novos as unknown as Record<string, unknown>); }
                        catch (err) { console.error("saveEstrategia (carteira):", err); }
                      }
                    }}
                    onLimparCarteira={() => {
                      setResultados((prev) => ({ ...prev, carteira: null }));
                      try {
                        const salvo = localStorage.getItem(resultadosKey);
                        if (salvo) {
                          const parsed = JSON.parse(salvo);
                          parsed.carteira = null;
                          localStorage.setItem(resultadosKey, JSON.stringify(parsed));
                        }
                      } catch { /**/ }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── TELA: Resultado (diagnóstico + scores) ────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  if (mostrarResultado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* Header resultado */}
        <header style={{
          backgroundColor: "#1E3A8A", flexShrink: 0, padding: "0 24px",
          height: 56, display: "flex", alignItems: "center", gap: 16, zIndex: 40,
        }}>
          <button
            onClick={() => setMostrarResultado(false)}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.25)",
              color: "#93C5FD", cursor: "pointer", padding: "4px 10px",
              borderRadius: 6, fontSize: 12, fontWeight: 500,
            }}
          >
            ← Voltar
          </button>
          <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{clientName}</span>
          <span style={{ color: "#93C5FD", fontSize: 13 }}>· Diagnóstico</span>
        </header>

        {/* Conteúdo scrollável */}
        <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F0F7FF" }}>
          <FinancialPlanDashboard
            plan={plan}
            clientName={clientName}
            resultados={resultados}
            onEdit={() => {}}
            onSave={async () => {}}
            onPrint={() => {}}
            onAvancarEstrategia={() => {}}
          />
        </div>

        {/* Rodapé resultado */}
        <div style={{
          position: "sticky", bottom: 0, background: "white",
          borderTop: "0.5px solid #E5E7EB", padding: "12px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button
            onClick={() => setMostrarResultado(false)}
            style={{
              fontSize: 13, color: "#6B7280", background: "white",
              border: "0.5px solid #E5E7EB", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer",
            }}
          >
            ← Voltar
          </button>
          <button
            onClick={() => { setMostrarResultado(false); setMostrarFP(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#1E3A8A", color: "white", border: "none",
              borderRadius: 8, padding: "10px 24px", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Financial Planning
            <i className="ti ti-arrow-right" style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── TELA PRINCIPAL: 4 abas ────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* Header principal */}
      <header style={{
        backgroundColor: "#1E3A8A", flexShrink: 0, padding: "0 24px",
        height: 56, display: "flex", alignItems: "center", gap: 16, zIndex: 40,
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={handleBackToClients}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.25)",
              color: "#93C5FD", cursor: "pointer", padding: "4px 10px",
              borderRadius: 6, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
            }}
          >
            ← Clientes
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo-si.svg" alt="Simpla Invest" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>Simpla Invest</span>
              <span style={{ color: "#93C5FD", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.04em" }}>Financial Planning</span>
            </div>
          </div>
          <span style={{ color: "#93C5FD", fontSize: 13, fontWeight: 500, marginLeft: 4 }}>— {clientName}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "white", fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.2 }}>{userLabel}</p>
            <p style={{ color: "#9CA3AF", fontSize: 11, margin: 0, lineHeight: 1.2 }}>Consultor financeiro</p>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: GOLD, color: DARK,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0, userSelect: "none",
          }}>
            {userInitials}
          </div>
          <button onClick={signOut} title="Sair" style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4 }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tab bar principal */}
      <div style={{
        backgroundColor: "white", borderBottom: "1px solid #E5E7EB",
        padding: "0 24px", display: "flex", alignItems: "center",
        flexShrink: 0, overflowX: "auto",
      }}>
        {ABAS.map((aba) => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id)} style={tabStyle(abaAtiva === aba.id)}>
            <i className={`ti ${aba.icone}`} style={{ fontSize: 14 }} />
            {aba.label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, flexShrink: 0 }}>
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
              border: "1.5px solid #1E3A8A", backgroundColor: "white", color: "#1E3A8A",
              borderRadius: 6, padding: "6px 16px", fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Conteúdo das 4 abas */}
      <main style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F0F7FF", width: "100%" }}>

          {abaAtiva === "coleta" && (
            <ColetaDadosCompleta
              plan={plan}
              onChange={updatePlan}
              onColetaComplete={handleColetaComplete}
            />
          )}

          {abaAtiva === "protecao_sucessorio" && (
            <div style={{ padding: "28px 32px" }}>
              <SecaoProtecaoSucessorio
                plan={plan}
                comentario={secaoComentario}
                onComentarioChange={handleComentarioChange}
                tags={secaoTags}
                onTagsChange={handleTagsChange}
                resultadoSeguro={resultados.seguro}
                onResultadoSeguro={async (r) => {
                  const novos = { ...resultados, seguro: r };
                  setResultados(novos);
                  if (plan.id) {
                    try { await store.saveEstrategia(plan.id, novos as unknown as Record<string, unknown>); }
                    catch (err) { console.error("saveEstrategia (seguro):", err); }
                  }
                }}
              />
            </div>
          )}

          {abaAtiva === "planejamento_tributario" && (
            <div style={{ padding: "28px 32px" }}>
              <SecaoFiscal
                plan={plan}
                comentario={secaoComentario}
                onComentarioChange={handleComentarioChange}
                tags={secaoTags}
                onTagsChange={handleTagsChange}
                resultadoFiscal={resultados.fiscal}
                onResultadoFiscal={async (r) => {
                  const novos = { ...resultados, fiscal: r };
                  setResultados(novos);
                  if (plan.id) {
                    try { await store.saveEstrategia(plan.id, novos as unknown as Record<string, unknown>); }
                    catch (err) { console.error("saveEstrategia (fiscal):", err); }
                  }
                }}
              />
            </div>
          )}

          {abaAtiva === "liberdade_financeira" && (
            <div style={{ padding: "28px 32px" }}>
              <SecaoAposentadoria
                plan={plan}
                comentario={secaoComentario}
                onComentarioChange={handleComentarioChange}
                tags={secaoTags}
                onTagsChange={handleTagsChange}
                resultadoIF={resultados.if}
                onResultadoIF={(r) => setResultados((prev) => ({ ...prev, if: r }))}
                onSaveCloud={async (r) => {
                  if (plan.id) {
                    const novaEstrategia: Record<string, unknown> = { ...resultados, if: r };
                    await store.saveEstrategia(plan.id, novaEstrategia);
                  }
                }}
              />
            </div>
          )}

        </div>
      </main>

      {/* Rodapé — Ver Resultado (apenas na aba Liberdade Financeira) */}
      {abaAtiva === "liberdade_financeira" && (
        <div style={{
          position: "sticky", bottom: 0, background: "white",
          borderTop: "0.5px solid #E5E7EB", padding: "12px 32px",
          display: "flex", justifyContent: "flex-end",
        }}>
          <button
            onClick={() => setMostrarResultado(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#1E3A8A", color: "white", border: "none",
              borderRadius: 8, padding: "10px 24px", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Ver Resultado
            <i className="ti ti-arrow-right" style={{ fontSize: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}
