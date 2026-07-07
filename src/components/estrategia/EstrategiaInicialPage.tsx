import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { FinancialPlan } from "@/types/financialPlanning";
import {
  calcularIF,
  calcularProtecao,
  calcularFiscal,
  calcularSucessorio,
} from "@/types/financialPlanning";
import type { ResultadoIF, ResultadoSeguro, ResultadoFiscal, ResultadosEstrategia } from "@/types/estrategiaResultados";
import { defaultResultados } from "@/types/estrategiaResultados";
import { SecaoAssetAllocation } from "./SecaoAssetAllocation";
import { SecaoAposentadoria } from "./SecaoAposentadoria";
import { SecaoProtecaoSucessorio } from "./SecaoProtecaoSucessorio";
import { SecaoFiscal } from "./SecaoFiscal";
import { EstrategiaPrint } from "./EstrategiaPrint";
import { EstrategiaFinal } from "./EstrategiaFinal";

// ─── Exported Types ────────────────────────────────────────────────────────────

export type SectionStatus = "pendente" | "revisando" | "concluido";

export type SecaoId =
  | "assetAllocation"
  | "aposentadoria"
  | "protecaoSucessorio"
  | "fiscal"
  | "estrategia_pronta";

export interface AcaoItem {
  id: string;
  texto: string;
  prioridade: "alta" | "media" | "baixa";
  area: string;
  prazo: string;
}

export interface EstrategiaData {
  logoBase64: string | null;
  nomeConsultor: string;
  apresentacao: string;
  comentarios: Record<string, string>;
  tags: Record<string, string[]>;
  acoes: AcaoItem[];
  consideracoesFinais: string;
  comentarioGeral: string;
}

export type { ResultadoIF, ResultadoSeguro, ResultadoFiscal, ResultadosEstrategia };

// ─── Section config ────────────────────────────────────────────────────────────

interface SecaoConfig {
  id: SecaoId;
  label: string;
  icone: string;
}

const SECOES: SecaoConfig[] = [
  { id: "assetAllocation",    label: "Asset Allocation",       icone: "ti-chart-pie"     },
  { id: "aposentadoria",      label: "Liberdade Financeira",   icone: "ti-beach"         },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório",  icone: "ti-shield"        },
  { id: "fiscal",             label: "Planejamento Fiscal",    icone: "ti-receipt"       },
  { id: "estrategia_pronta",  label: "Estratégia Pronta",      icone: "ti-file-download" },
];

// ─── Helper: generate initial actions ─────────────────────────────────────────

function gerarAcoesIniciais(plan: FinancialPlan): AcaoItem[] {
  const acoes: AcaoItem[] = [];
  let idx = 0;

  const resultadoIF = calcularIF(plan.planejamentoIF);
  if (resultadoIF.gap > 0) {
    acoes.push({
      id: `acao_${idx++}`,
      texto: "Revisar e aumentar aportes mensais para reduzir gap patrimonial",
      prioridade: "alta",
      area: "Liberdade Financeira",
      prazo: "",
    });
  }

  const resultadoProtecao = calcularProtecao(plan.protecao);
  if (resultadoProtecao.gap > 0) {
    acoes.push({
      id: `acao_${idx++}`,
      texto: "Contratar ou aumentar seguro de vida para cobrir gap de proteção",
      prioridade: "alta",
      area: "Proteção",
      prazo: "",
    });
  }

  const resultadoFiscal = calcularFiscal(plan.fiscal);
  if (resultadoFiscal.espacoPGBL > 0) {
    acoes.push({
      id: `acao_${idx++}`,
      texto: "Aproveitar espaço PGBL disponível para economia fiscal potencial",
      prioridade: "media",
      area: "Fiscal",
      prazo: "",
    });
  }

  const resultadoSucessorio = calcularSucessorio(plan.sucessorio);
  if (resultadoSucessorio.custoTotal > 0 && !plan.sucessorio.possuiTestamento) {
    acoes.push({
      id: `acao_${idx++}`,
      texto: "Elaborar testamento para agilizar processo sucessório",
      prioridade: "media",
      area: "Sucessório",
      prazo: "",
    });
  }

  if (acoes.length === 0) {
    acoes.push({
      id: `acao_${idx++}`,
      texto: "Agendar reunião de acompanhamento trimestral",
      prioridade: "baixa",
      area: "Geral",
      prazo: "",
    });
  }

  return acoes;
}

// ─── Default data factory ──────────────────────────────────────────────────────

function defaultData(plan: FinancialPlan): EstrategiaData {
  return {
    logoBase64: null,
    nomeConsultor: "",
    apresentacao: "",
    comentarios: {},
    tags: {},
    acoes: gerarAcoesIniciais(plan),
    consideracoesFinais: "",
    comentarioGeral: "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  plan: FinancialPlan;
  clientName: string;
  onClose: () => void;
  onSave?: (e: EstrategiaData) => void;
  onSaveCloud?: (e: EstrategiaData) => Promise<void>;
  onLoadCloud?: () => Promise<Record<string, unknown> | null>;
}

export function EstrategiaInicialPage({ plan, clientName, onClose, onSave, onSaveCloud, onLoadCloud }: Props) {
  const storageKey = `estrategia_v2_${plan.clientId}`;

  const [data, setDataRaw] = useState<EstrategiaData>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as EstrategiaData;
        if (parsed.comentarioGeral === undefined) parsed.comentarioGeral = "";
        return parsed;
      }
    } catch {
      // ignore
    }
    return defaultData(plan);
  });

  const resultadosKey = `resultados_estrategia_${plan.clientId}`;
  const [resultados, setResultados] = useState<ResultadosEstrategia>(() => {
    try {
      const saved = localStorage.getItem(`resultados_estrategia_${plan.clientId}`);
      if (saved) return JSON.parse(saved) as ResultadosEstrategia;
    } catch { /**/ }
    return defaultResultados;
  });

  const [secaoAtiva, setSecaoAtiva] = useState<SecaoId>("assetAllocation");
  const [printMode, setPrintMode] = useState<"consultor" | "cliente" | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setData = useCallback((updater: (prev: EstrategiaData) => EstrategiaData) => {
    setDataRaw((prev) => {
      const next = updater(prev);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        onSave?.(next);
      }, 800);
      return next;
    });
  }, [storageKey, onSave]);

  // Persiste resultados separadamente (nunca sobrescrito pelo Supabase)
  useEffect(() => {
    try { localStorage.setItem(resultadosKey, JSON.stringify(resultados)); } catch { /**/ }
  }, [resultados, resultadosKey]);

  // Carrega do Supabase na montagem — tem prioridade sobre localStorage
  useEffect(() => {
    if (!onLoadCloud) return;
    onLoadCloud().then((remoto) => {
      if (!remoto) return;
      setDataRaw((local) => {
        const merged = { ...local, ...(remoto as Partial<EstrategiaData>) };
        if (merged.comentarioGeral === undefined) merged.comentarioGeral = "";
        try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch { /**/ }
        return merged;
      });
    }).catch(() => {/* falha silenciosa — localStorage é o backup */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Save no Supabase ────────────────────────────────────────────────────────

  const handleSalvarCloud = useCallback(async (dataAtual: EstrategiaData) => {
    if (!onSaveCloud) return;
    setSalvando(true);
    try {
      await onSaveCloud(dataAtual);
      setUltimoSalvo(new Date());
    } catch (err) {
      const supaErr = err as { message?: string };
      const msg = supaErr.message ?? (err instanceof Error ? err.message : "Erro desconhecido");
      toast.error(`Erro ao salvar estratégia: ${msg}`);
      console.error("handleSalvarCloud failed:", err);
    } finally {
      setSalvando(false);
    }
  }, [onSaveCloud]);

  function renderContent() {
    const comentario = data.comentarios[secaoAtiva] ?? "";
    const tags = data.tags[secaoAtiva] ?? [];

    const onComentarioChange = (v: string) =>
      setData((prev) => ({ ...prev, comentarios: { ...prev.comentarios, [secaoAtiva]: v } }));
    const onTagsChange = (v: string[]) =>
      setData((prev) => ({ ...prev, tags: { ...prev.tags, [secaoAtiva]: v } }));

    switch (secaoAtiva) {
      case "assetAllocation":
        return (
          <SecaoAssetAllocation
            plan={plan}
            clientName={clientName}
            comentario={comentario}
            onComentarioChange={onComentarioChange}
            tags={tags}
            onTagsChange={onTagsChange}
            resultadoCarteira={resultados.carteira}
            onResultadoCarteira={(r) => setResultados((prev) => ({ ...prev, carteira: r }))}
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
        );
      case "aposentadoria":
        return (
          <SecaoAposentadoria
            plan={plan}
            comentario={comentario}
            onComentarioChange={onComentarioChange}
            tags={tags}
            onTagsChange={onTagsChange}
            resultadoIF={resultados.if}
            onResultadoIF={(r) => setResultados((prev) => ({ ...prev, if: r }))}
          />
        );
      case "protecaoSucessorio":
        return (
          <SecaoProtecaoSucessorio
            plan={plan}
            comentario={comentario}
            onComentarioChange={onComentarioChange}
            tags={tags}
            onTagsChange={onTagsChange}
            resultadoSeguro={resultados.seguro}
            onResultadoSeguro={(r) => setResultados((prev) => ({ ...prev, seguro: r }))}
          />
        );
      case "fiscal":
        return (
          <SecaoFiscal
            plan={plan}
            comentario={comentario}
            onComentarioChange={onComentarioChange}
            tags={tags}
            onTagsChange={onTagsChange}
            resultadoFiscal={resultados.fiscal}
            onResultadoFiscal={(r) => setResultados((prev) => ({ ...prev, fiscal: r }))}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="estrategia-inicial-root" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* Header */}
      <div className="app-main-header" style={{ height: 56, backgroundColor: "#1E3A8A", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
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
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}> › </span>
          <span style={{ color: "white", fontSize: 14 }}>Estratégia Inicial · {clientName}</span>
          <button
            onClick={onClose}
            style={{ color: "#93C5FD", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: "2px 8px", marginLeft: 4 }}
          >
            ← Voltar
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ultimoSalvo && (
            <span style={{ fontSize: 12, color: "rgba(187,168,102,0.8)" }}>
              Salvo às {ultimoSalvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => setPrintMode("consultor")}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.5)", backgroundColor: "transparent", color: "white", fontSize: 13, cursor: "pointer" }}
          >
            Gerar PDF Consultor
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="estrategia-abas-topo" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        borderBottom: "1px solid #BFDBFE",
        background: "white",
        flexShrink: 0,
        overflowX: "auto",
      }}>
        <div style={{ display: "flex", gap: 0 }}>
          {SECOES.map((s) => {
            const isActive = secaoAtiva === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSecaoAtiva(s.id)}
                style={{
                  padding: "14px 20px",
                  border: "none",
                  borderBottom: isActive ? "2px solid #2563EB" : "2px solid transparent",
                  background: "none",
                  color: isActive ? "#2563EB" : "#6B7280",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                }}
              >
                <i className={`ti ${s.icone}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16, flexShrink: 0 }}>
          {onSaveCloud && (
            <button
              onClick={() => handleSalvarCloud(data)}
              disabled={salvando}
              style={{ padding: "6px 16px", borderRadius: 6, border: "none", backgroundColor: salvando ? "#2563EB" : "#3B82F6", color: "white", fontSize: 13, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.85 : 1 }}
            >
              {salvando ? "Salvando..." : "Salvar estratégia"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {secaoAtiva === "estrategia_pronta" ? (
          <EstrategiaFinal
            plan={plan}
            resultados={resultados}
            clientName={clientName}
            onResultadosChange={(r) => setResultados(r)}
          />
        ) : (
          <div style={{ flex: 1, overflowY: "auto", background: "#F0F7FF", padding: "28px 32px" }}>
            {renderContent()}
          </div>
        )}
      </div>

      {/* Print overlay */}
      {printMode && (
        <EstrategiaPrint
          plan={plan}
          clientName={clientName}
          data={data}
          resultados={resultados}
          mode={printMode}
          onClose={() => setPrintMode(null)}
        />
      )}
    </div>
  );
}
