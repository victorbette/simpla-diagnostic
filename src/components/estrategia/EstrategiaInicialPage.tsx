import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  PieChart as PieChartIcon,
  Flame,
  Shield,
  Receipt,
  ListChecks,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import type { FinancialPlan } from "@/types/financialPlanning";
import {
  calcularIF,
  calcularProtecao,
  calcularFiscal,
  calcularSucessorio,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import type { ResultadoIF, ResultadoSeguro, ResultadoFiscal, ResultadosEstrategia } from "@/types/estrategiaResultados";
import { defaultResultados } from "@/types/estrategiaResultados";
import { SecaoAssetAllocation } from "./SecaoAssetAllocation";
import { SecaoAposentadoria } from "./SecaoAposentadoria";
import { SecaoProtecaoSucessorio } from "./SecaoProtecaoSucessorio";
import { SecaoFiscal } from "./SecaoFiscal";
import { SecaoProximosPassos } from "./SecaoProximosPassos";
import { SecaoRevisao } from "./SecaoRevisao";
import { EstrategiaFinalPage } from "./EstrategiaFinalPage";
import { EstrategiaPrint } from "./EstrategiaPrint";

function hexOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `${hex}${alpha}`;
}

// ─── Exported Types ────────────────────────────────────────────────────────────

export type SectionStatus = "pendente" | "revisando" | "concluido";

export type SecaoId =
  | "assetAllocation"
  | "aposentadoria"
  | "protecaoSucessorio"
  | "fiscal"
  | "proximosPassos"
  | "revisao";

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
  color: string;
  Icon: LucideIcon;
}

const SECOES: SecaoConfig[] = [
  { id: "assetAllocation",    label: "Asset Allocation",        color: "#000000", Icon: PieChartIcon   },
  { id: "aposentadoria",      label: "Liberdade Financeira",    color: "#15803D", Icon: Flame          },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório",   color: "#B91C1C", Icon: Shield         },
  { id: "fiscal",             label: "Planejamento Fiscal",     color: "#2563EB", Icon: Receipt        },
  { id: "proximosPassos",     label: "Próximos Passos",         color: "#1E40AF", Icon: ListChecks     },
  { id: "revisao",            label: "Revisão Final",           color: "#000000", Icon: ClipboardCheck },
];

const AVATAR_COLORS = [
  "#3B82F6", "#000000", "#15803D", "#B91C1C", "#1E40AF", "#2563EB",
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
      texto: `Aproveitar espaço PGBL disponível para economia fiscal potencial`,
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
  const [mostrarFinal, setMostrarFinal] = useState(false);

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

  const secaoAtual = SECOES.find((s) => s.id === secaoAtiva) ?? SECOES[0];
  const secaoIndex = SECOES.findIndex((s) => s.id === secaoAtiva);

  const irParaSecao = (id: SecaoId) => setSecaoAtiva(id);

  const irAnterior = () => {
    if (secaoIndex > 0) setSecaoAtiva(SECOES[secaoIndex - 1].id);
  };

  const irProxima = () => {
    if (secaoIndex < SECOES.length - 1) setSecaoAtiva(SECOES[secaoIndex + 1].id);
  };

  // Avatar
  const firstChar = clientName.trim().charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0);
  const avatarColor = AVATAR_COLORS[charCode % 6];
  const initials = clientName.trim().split(" ").slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");

  const perfil = plan.dadosCliente.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "Não definido";


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
      case "proximosPassos":
        return (
          <SecaoProximosPassos
            plan={plan}
            resultados={resultados}
            concluidos={resultados.proximosPassos ?? {}}
            onConcluidosChange={(v) => setResultados((prev) => ({ ...prev, proximosPassos: v }))}
            consideracoesFinais={data.consideracoesFinais}
            onConsideracoesChange={(v) => setData((prev) => ({ ...prev, consideracoesFinais: v }))}
          />
        );
      case "revisao":
        return (
          <SecaoRevisao
            estrategia={data}
            resultados={resultados}
            plan={plan}
            clientName={clientName}
            onNavigate={irParaSecao}
            onFinalizar={() => setMostrarFinal(true)}
            onComentarioGeralChange={(v) =>
              setData((prev) => ({ ...prev, comentarioGeral: v }))
            }
          />
        );
      default:
        return null;
    }
  }


  if (mostrarFinal) {
    return (
      <EstrategiaFinalPage
        estrategia={data}
        resultados={resultados}
        plan={plan}
        clientName={clientName}
        clientProfile={plan.dadosCliente.suitabilityPerfil ?? null}
        onVoltar={() => setMostrarFinal(false)}
        onSaveCloud={onSaveCloud ? (d: EstrategiaData) => handleSalvarCloud(d) : undefined}
      />
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ height: 56, backgroundColor: "#1E3A8A", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}> › </span>
          <span style={{ color: "white", fontSize: 14 }}>Estratégia Inicial · {clientName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ultimoSalvo && (
            <span style={{ fontSize: 12, color: "rgba(187,168,102,0.8)" }}>
              Salvo às {ultimoSalvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {onSaveCloud && (
            <button
              onClick={() => handleSalvarCloud(data)}
              disabled={salvando}
              style={{ padding: "6px 16px", borderRadius: 6, border: "none", backgroundColor: salvando ? "#2563EB" : "#3B82F6", color: "#000000", fontSize: 13, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.85 : 1 }}
            >
              {salvando ? "Salvando..." : "Salvar estratégia"}
            </button>
          )}
          <button
            onClick={() => setPrintMode("consultor")}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid white", backgroundColor: "transparent", color: "white", fontSize: 13, cursor: "pointer" }}
          >
            Gerar PDF Consultor
          </button>
          <button
            onClick={() => setPrintMode("cliente")}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", backgroundColor: "#3B82F6", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            Gerar PDF Cliente
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 280, backgroundColor: "white", borderRight: "1px solid #F0F7FF", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
          {/* Top block */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0F7FF" }}>
            <button
              onClick={onClose}
              style={{ color: "#3B82F6", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Voltar ao Diagnóstico
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {initials || firstChar}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#000000" }}>{clientName}</div>
                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#DBEAFE", color: "#000000" }}>{perfilLabel}</span>
              </div>
            </div>
          </div>

          {/* Section label */}
          <div style={{ padding: "16px 20px 8px", fontSize: 10, fontWeight: 700, color: "#3B82F6", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Estratégia Inicial
          </div>

          {/* Nav list */}
          <nav style={{ flex: 1 }}>
            {SECOES.map((secao) => {
              const isActive = secao.id === secaoAtiva;
              return (
                <button
                  key={secao.id}
                  onClick={() => irParaSecao(secao.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 20px",
                    background: isActive ? "#F0F7FF" : "transparent",
                    borderLeft: isActive ? `3px solid ${secao.color}` : "3px solid transparent",
                    border: "none",
                    borderLeftWidth: 3,
                    borderLeftStyle: "solid",
                    borderLeftColor: isActive ? secao.color : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: hexOpacity(secao.color, isActive ? 0.15 : 0.10),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <secao.Icon
                        size={16}
                        style={{ color: isActive ? secao.color : hexOpacity(secao.color, 0.60) }}
                      />
                    </div>
                    <span style={{ fontSize: 13, color: isActive ? "#000000" : "#111827", fontWeight: isActive ? 600 : 400 }}>
                      {secao.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: "#F0F7FF", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Scrollable area */}
          <div style={{ flex: 1, overflowY: "auto", padding: 32, paddingBottom: 100 }}>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>
              Estratégia Inicial › {secaoAtual.label}
            </div>

            {/* Title row */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#000000", margin: 0 }}>
                {secaoAtual.label}
              </h1>
            </div>

            {/* Section content */}
            {renderContent()}
          </div>

          {/* Bottom nav */}
          <div style={{ backgroundColor: "white", borderTop: "1px solid #BFDBFE", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <button
              onClick={irAnterior}
              disabled={secaoIndex === 0}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #000000",
                backgroundColor: "transparent",
                color: secaoIndex === 0 ? "#9CA3AF" : "#000000",
                borderColor: secaoIndex === 0 ? "#BFDBFE" : "#000000",
                fontSize: 13,
                cursor: secaoIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              {secaoIndex > 0 ? `← Seção anterior: ${SECOES[secaoIndex - 1].label}` : "← Início"}
            </button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {SECOES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => irParaSecao(s.id)}
                    style={{
                      height: 8,
                      width: i === secaoIndex ? 22 : 8,
                      borderRadius: 9999,
                      backgroundColor: i === secaoIndex ? "#2563EB" : "#BFDBFE",
                      border: "none",
                      cursor: "pointer",
                      transition: "width 0.2s",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{secaoIndex + 1} de {SECOES.length}</span>
            </div>

            <button
              onClick={irProxima}
              disabled={secaoIndex === SECOES.length - 1}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                backgroundColor: secaoIndex === SECOES.length - 1 ? "#BFDBFE" : "#2563EB",
                color: secaoIndex === SECOES.length - 1 ? "#9CA3AF" : "white",
                fontSize: 13,
                cursor: secaoIndex === SECOES.length - 1 ? "not-allowed" : "pointer",
                fontWeight: 500,
              }}
            >
              {secaoIndex < SECOES.length - 1 ? `Próxima seção: ${SECOES[secaoIndex + 1].label} →` : "Fim →"}
            </button>
          </div>
        </div>
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
