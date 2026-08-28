import { useState, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import type { ResultadosEstrategia, ResultadoIF } from "@/types/estrategiaResultados";
import { defaultResultados } from "@/types/estrategiaResultados";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import { GestaoInvestimentos } from "@/components/acompanhamento/GestaoInvestimentos";
import { AcompLF } from "@/components/acompanhamento/AcompLF";
import { EvolucaoPatrimonio } from "@/components/acompanhamento/EvolucaoPatrimonio";

interface Props {
  clienteId: string;
  clienteNome: string;
  onVoltar: () => void;
}

type Tab = "investimentos" | "lf" | "evolucao";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "evolucao",      label: "Evolução do Patrimônio", icon: "ti-trending-up"  },
  { id: "investimentos", label: "Gestão de Investimentos", icon: "ti-chart-pie"   },
  { id: "lf",            label: "Liberdade Financeira",   icon: "ti-beach"        },
];

interface AcompData {
  comentarios: Record<string, string>;
  tags: Record<string, string[]>;
}

function loadAcompData(clienteId: string): AcompData {
  try {
    const saved = localStorage.getItem(`estrategia_v2_${clienteId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        comentarios: (parsed.comentarios as Record<string, string>) ?? {},
        tags: (parsed.tags as Record<string, string[]>) ?? {},
      };
    }
  } catch { /**/ }
  return { comentarios: {}, tags: {} };
}

function saveAcompData(clienteId: string, patch: Partial<AcompData>) {
  try {
    const key = `estrategia_v2_${clienteId}`;
    const existing = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
    localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
  } catch { /**/ }
}

export function AcompanhamentoPage({ clienteId, clienteNome, onVoltar }: Props) {
  const [tab, setTab] = useState<Tab>("evolucao");
  const { plan, loading, carregarPlano, loadEstrategia, saveEstrategia } = useFinancialPlanStore();

  // Ref para disparar o save da aba LF a partir de fora
  const lfSaveRef = useRef<(() => Promise<void>) | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData] = useState<AcompData>(() => loadAcompData(clienteId));

  const resultadosKey = `resultados_estrategia_${clienteId}`;
  const [resultados, setResultados] = useState<ResultadosEstrategia>(() => {
    try {
      const raw = localStorage.getItem(resultadosKey);
      if (raw) return JSON.parse(raw) as ResultadosEstrategia;
    } catch { /**/ }
    return defaultResultados;
  });

  // Ref to access latest resultados in callbacks without stale closure
  const resultadosRef = useRef(resultados);
  resultadosRef.current = resultados;

  // Flag to avoid re-loading from Supabase after we've already done it
  const supabaseCarregadoRef = useRef(false);

  useEffect(() => {
    carregarPlano(clienteId);
  }, [clienteId, carregarPlano]);

  // Load resultados from Supabase once plan.id is available — takes priority over localStorage
  useEffect(() => {
    if (plan?.id && !supabaseCarregadoRef.current) {
      supabaseCarregadoRef.current = true;
      loadEstrategia(plan.id)
        .then((estrategia) => {
          if (estrategia && Object.keys(estrategia).length > 0) {
            const loaded = estrategia as unknown as ResultadosEstrategia;
            setResultados(loaded);
            try { localStorage.setItem(resultadosKey, JSON.stringify(loaded)); } catch { /**/ }
          }
        })
        .catch(console.error);
    }
  }, [plan?.id, loadEstrategia, resultadosKey]);

  function handleComentario(secao: string, v: string) {
    setData((prev) => {
      const next = { ...prev, comentarios: { ...prev.comentarios, [secao]: v } };
      saveAcompData(clienteId, { comentarios: next.comentarios });
      return next;
    });
  }

  function handleTags(secao: string, v: string[]) {
    setData((prev) => {
      const next = { ...prev, tags: { ...prev.tags, [secao]: v } };
      saveAcompData(clienteId, { tags: next.tags });
      return next;
    });
  }

  function handleResultados(patch: Partial<ResultadosEstrategia>) {
    setResultados((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(resultadosKey, JSON.stringify(next)); } catch { /**/ }
      return next;
    });
  }

  async function handleSaveToSupabase(r: ResultadoIF) {
    if (!plan?.id) return;
    const next = { ...resultadosRef.current, if: r };
    try { localStorage.setItem(resultadosKey, JSON.stringify(next)); } catch { /**/ }
    await saveEstrategia(plan.id, next as unknown as Record<string, unknown>);
  }

  function showSaved() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saved");
    saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
  }

  async function handleSwitchTab(newTab: Tab) {
    if (newTab === tab) return;
    // Auto-save LF antes de sair da aba
    if (tab === "lf" && lfSaveRef.current) {
      setSaveStatus("saving");
      await lfSaveRef.current();
      showSaved();
    }
    setTab(newTab);
  }

  async function handleManualSave() {
    if (tab === "lf" && lfSaveRef.current) {
      setSaveStatus("saving");
      await lfSaveRef.current();
      showSaved();
    } else {
      // evolucao e investimentos já persistem automaticamente
      showSaved();
    }
  }

  const savedAt = (() => {
    const r = resultados?.carteira ?? resultados?.if;
    if (!r?.savedAt) return null;
    return new Date(r.savedAt).toLocaleDateString("pt-BR");
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>

      {/* Header */}
      <header style={{ backgroundColor: "#1E3A8A", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onVoltar}
            style={{
              color: "#93C5FD", background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              padding: "4px 0",
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            CRM
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: "#374151" }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: "#93C5FD", fontSize: 10, fontWeight: 400, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Acompanhamento Consultivo
            </p>
            <p style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>{clienteNome}</p>
          </div>
          {savedAt && (
            <span style={{ fontSize: 11, color: "#93C5FD" }}>Dados de {savedAt}</span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSwitchTab(t.id)}
              style={{
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                borderRadius: "8px 8px 0 0",
                background: tab === t.id ? "#F0F7FF" : "transparent",
                color: tab === t.id ? "#1E3A8A" : "#93C5FD",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {tab === "evolucao" && (
          <EvolucaoPatrimonio
            clienteId={clienteId}
            resultadoIF={resultados.if}
          />
        )}

        {tab === "investimentos" && (
          <GestaoInvestimentos carteira={resultados.carteira} />
        )}

        {tab === "lf" && (
          plan ? (
            <AcompLF
              plan={plan}
              comentario={data.comentarios["aposentadoria"] ?? ""}
              onComentarioChange={(v) => handleComentario("aposentadoria", v)}
              tags={data.tags["aposentadoria"] ?? []}
              onTagsChange={(v) => handleTags("aposentadoria", v)}
              resultadoIF={resultados.if}
              onResultadoIF={(r: ResultadoIF) => handleResultados({ if: r })}
              onSaveCloud={handleSaveToSupabase}
              triggerSaveRef={lfSaveRef}
              storageChave={`acomp_lf_${clienteId}`}
            />
          ) : (
            <PlanLoading loading={loading} />
          )
        )}

        {/* ── Barra de salvar ─────────────────────────────────────── */}
        <div style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          padding: "12px 0",
          borderTop: "0.5px solid #E5E7EB",
        }}>
          {saveStatus === "saving" && (
            <span style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} />
              Salvando...
            </span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: 12, color: "#15803D", display: "flex", alignItems: "center", gap: 5 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
              Salvo com sucesso
            </span>
          )}
          {saveStatus === "idle" && tab === "evolucao" && (
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>Registros salvos automaticamente</span>
          )}
          {saveStatus === "idle" && tab === "investimentos" && (
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>Dados sincronizados do Financial Planning</span>
          )}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === "saving"}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px",
              fontSize: 13, fontWeight: 600,
              backgroundColor: saveStatus === "saving" ? "#BFDBFE" : "#1E3A8A",
              color: "white",
              border: "none", borderRadius: 8,
              cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
            }}
          >
            <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />
            Salvar
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  );
}

function PlanLoading({ loading }: { loading: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "#9CA3AF", fontSize: 15 }}>
      {loading ? (
        <>
          <i className="ti ti-loader-2" style={{ fontSize: 44, display: "block", marginBottom: 16, color: "#BFDBFE" }} />
          <p style={{ margin: 0, color: "#6B7280" }}>Carregando plano...</p>
        </>
      ) : (
        <>
          <i className="ti ti-database-off" style={{ fontSize: 44, display: "block", marginBottom: 16, color: "#BFDBFE" }} />
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#6B7280" }}>Plano não encontrado</p>
          <p style={{ margin: 0, fontSize: 13 }}>Complete o Financial Planning para este cliente primeiro.</p>
        </>
      )}
    </div>
  );
}
