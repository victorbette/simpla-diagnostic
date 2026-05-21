import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText,
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
import { SecaoCapa } from "./SecaoCapa";
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
  | "capa"
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
  statusSecoes: Record<SecaoId, SectionStatus>;
  acoes: AcaoItem[];
  dataProximaReuniao: string;
  formatoReuniao: string;
  pautaSugerida: string;
  consideracoesFinais: string;
  comentarioGeral: string;
  resultados: ResultadosEstrategia;
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
  { id: "capa",               label: "Capa e Identificação",   color: "#BBA866", Icon: FileText       },
  { id: "assetAllocation",    label: "Asset Allocation",        color: "#7C3AED", Icon: PieChartIcon   },
  { id: "aposentadoria",      label: "Aposentadoria / IF",      color: "#22C55E", Icon: Flame          },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório",   color: "#F87171", Icon: Shield         },
  { id: "fiscal",             label: "Planejamento Fiscal",     color: "#F59E0B", Icon: Receipt        },
  { id: "proximosPassos",     label: "Próximos Passos",         color: "#3B82F6", Icon: ListChecks     },
  { id: "revisao",            label: "Revisão Final",           color: "#041A20", Icon: ClipboardCheck },
];

const AVATAR_COLORS = [
  "#BBA866", "#7C3AED", "#22C55E", "#F87171", "#3B82F6", "#F59E0B",
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
      area: "Aposentadoria / IF",
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
  const secaoIds: SecaoId[] = [
    "capa", "assetAllocation", "aposentadoria",
    "protecaoSucessorio", "fiscal", "proximosPassos", "revisao",
  ];
  const statusSecoes = {} as Record<SecaoId, SectionStatus>;
  secaoIds.forEach((id) => { statusSecoes[id] = "pendente"; });

  return {
    logoBase64: null,
    nomeConsultor: "",
    apresentacao: "",
    comentarios: {},
    tags: {},
    statusSecoes,
    acoes: gerarAcoesIniciais(plan),
    dataProximaReuniao: "",
    formatoReuniao: "Online",
    pautaSugerida: "",
    consideracoesFinais: "",
    comentarioGeral: "",
    resultados: defaultResultados,
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
        if (!parsed.resultados) parsed.resultados = defaultResultados;
        if (parsed.comentarioGeral === undefined) parsed.comentarioGeral = "";
        return parsed;
      }
    } catch {
      // ignore
    }
    return defaultData(plan);
  });

  const [secaoAtiva, setSecaoAtiva] = useState<SecaoId>("capa");
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

  // Carrega do Supabase na montagem — tem prioridade sobre localStorage
  useEffect(() => {
    if (!onLoadCloud) return;
    onLoadCloud().then((remoto) => {
      if (!remoto) return;
      setDataRaw((local) => {
        const merged = { ...local, ...(remoto as Partial<EstrategiaData>) };
        if (!merged.resultados) merged.resultados = defaultResultados;
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

  const secaoAtual = SECOES.find((s) => s.id === secaoAtiva)!;
  const secaoIndex = SECOES.findIndex((s) => s.id === secaoAtiva);

  const marcarConcluida = () => {
    setData((prev) => {
      const novoStatus = prev.statusSecoes[secaoAtiva] === "concluido" ? "revisando" : "concluido";
      const next = {
        ...prev,
        statusSecoes: { ...prev.statusSecoes, [secaoAtiva]: novoStatus },
      };
      // Auto-save silencioso no Supabase ao marcar como concluída
      if (onSaveCloud) {
        onSaveCloud(next).catch(() => {/* falha silenciosa */});
      }
      return next;
    });

    // stub return to keep the old signature happy — o setData já atualiza
    return;
  };

  const irParaSecao = (id: SecaoId) => setSecaoAtiva(id);

  const irAnterior = () => {
    if (secaoIndex > 0) setSecaoAtiva(SECOES[secaoIndex - 1].id);
  };

  const irProxima = () => {
    if (secaoIndex < SECOES.length - 1) setSecaoAtiva(SECOES[secaoIndex + 1].id);
  };

  // Count completed (non-revisao)
  const nonRevisaoSections = SECOES.filter((s) => s.id !== "revisao");
  const concluidasCount = nonRevisaoSections.filter(
    (s) => data.statusSecoes[s.id] === "concluido"
  ).length;

  // Avatar
  const firstChar = clientName.trim().charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0);
  const avatarColor = AVATAR_COLORS[charCode % 6];
  const initials = clientName.trim().split(" ").slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");

  const perfil = plan.dadosCliente.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "Não definido";

  function renderStatusBadge(status: SectionStatus, isRevisao = false) {
    if (isRevisao) {
      return (
        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#F3F4F6", color: "#6B7280" }}>
          Aguardando
        </span>
      );
    }
    if (status === "concluido") {
      return (
        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#F0FDF4", color: "#15803D" }}>
          ✓ Concluída
        </span>
      );
    }
    if (status === "revisando") {
      return (
        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#FFFBEB", color: "#B45309" }}>
          Em revisão
        </span>
      );
    }
    return (
      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#F3F4F6", color: "#6B7280" }}>
        Pendente
      </span>
    );
  }

  function renderContent() {
    const comentario = data.comentarios[secaoAtiva] ?? "";
    const tags = data.tags[secaoAtiva] ?? [];

    const onComentarioChange = (v: string) =>
      setData((prev) => ({ ...prev, comentarios: { ...prev.comentarios, [secaoAtiva]: v } }));
    const onTagsChange = (v: string[]) =>
      setData((prev) => ({ ...prev, tags: { ...prev.tags, [secaoAtiva]: v } }));

    switch (secaoAtiva) {
      case "capa":
        return (
          <SecaoCapa
            plan={plan}
            clientName={clientName}
            logoBase64={data.logoBase64}
            onLogoChange={(v) => setData((prev) => ({ ...prev, logoBase64: v }))}
            nomeConsultor={data.nomeConsultor}
            onNomeConsultorChange={(v) => setData((prev) => ({ ...prev, nomeConsultor: v }))}
            apresentacao={data.apresentacao}
            onApresentacaoChange={(v) => setData((prev) => ({ ...prev, apresentacao: v }))}
          />
        );
      case "assetAllocation":
        return (
          <SecaoAssetAllocation
            plan={plan}
            clientName={clientName}
            comentario={comentario}
            onComentarioChange={onComentarioChange}
            tags={tags}
            onTagsChange={onTagsChange}
            resultadoCarteira={data.resultados.carteira}
            onResultadoCarteira={(r) => setData((prev) => ({ ...prev, resultados: { ...prev.resultados, carteira: r } }))}
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
            resultadoIF={data.resultados.if}
            onResultadoIF={(r) => setData((prev) => ({ ...prev, resultados: { ...prev.resultados, if: r } }))}
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
            resultadoSeguro={data.resultados.seguro}
            onResultadoSeguro={(r) => setData((prev) => ({ ...prev, resultados: { ...prev.resultados, seguro: r } }))}
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
            resultadoFiscal={data.resultados.fiscal}
            onResultadoFiscal={(r) => setData((prev) => ({ ...prev, resultados: { ...prev.resultados, fiscal: r } }))}
          />
        );
      case "proximosPassos":
        return (
          <SecaoProximosPassos
            plan={plan}
            acoes={data.acoes}
            onAcoesChange={(v) => setData((prev) => ({ ...prev, acoes: v }))}
            dataProximaReuniao={data.dataProximaReuniao}
            onDataChange={(v) => setData((prev) => ({ ...prev, dataProximaReuniao: v }))}
            formatoReuniao={data.formatoReuniao}
            onFormatoChange={(v) => setData((prev) => ({ ...prev, formatoReuniao: v }))}
            pautaSugerida={data.pautaSugerida}
            onPautaChange={(v) => setData((prev) => ({ ...prev, pautaSugerida: v }))}
            consideracoesFinais={data.consideracoesFinais}
            onConsideracoesChange={(v) => setData((prev) => ({ ...prev, consideracoesFinais: v }))}
          />
        );
      case "revisao":
        return (
          <SecaoRevisao
            estrategia={data}
            resultados={data.resultados}
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

  const progressPct = (concluidasCount / 6) * 100;

  if (mostrarFinal) {
    return (
      <EstrategiaFinalPage
        estrategia={data}
        resultados={data.resultados}
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
      <div style={{ height: 56, backgroundColor: "#000000", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/logo-icon.png"
              alt="Simpla Wealth"
              style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>
                Simpla Wealth
              </span>
              <span style={{ color: "#BBA866", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.05em" }}>
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
              style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #BBA866", backgroundColor: "transparent", color: "#BBA866", fontSize: 13, cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.7 : 1 }}
            >
              {salvando ? "Salvando…" : "Salvar estratégia"}
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
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", backgroundColor: "#BBA866", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            Gerar PDF Cliente
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 280, backgroundColor: "white", borderRight: "1px solid #F3F4F6", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
          {/* Top block */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
            <button
              onClick={onClose}
              style={{ color: "#46BDC6", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Voltar ao Diagnóstico
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {initials || firstChar}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#041A20" }}>{clientName}</div>
                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#EDE9FE", color: "#7C3AED" }}>{perfilLabel}</span>
              </div>
            </div>
          </div>

          {/* Section label */}
          <div style={{ padding: "16px 20px 8px", fontSize: 10, fontWeight: 700, color: "#BBA866", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Estratégia Inicial
          </div>

          {/* Nav list */}
          <nav style={{ flex: 1 }}>
            {SECOES.map((secao) => {
              const isActive = secao.id === secaoAtiva;
              const status = data.statusSecoes[secao.id];
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
                    background: isActive ? "#F8F9FA" : "transparent",
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
                    <span style={{ fontSize: 13, color: isActive ? "#041A20" : "#374151", fontWeight: isActive ? 600 : 400 }}>
                      {secao.label}
                    </span>
                  </div>
                  {renderStatusBadge(status, secao.id === "revisao")}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div style={{ padding: 16, borderTop: "1px solid #F3F4F6" }}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
              {concluidasCount} de 6 seções concluídas
            </div>
            <div style={{ height: 4, backgroundColor: "#F3F4F6", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "#BBA866", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            {onSaveCloud && (
              <button
                onClick={() => handleSalvarCloud(data)}
                disabled={salvando}
                style={{ width: "100%", padding: "8px 0", border: "1px solid #BBA866", borderRadius: 6, backgroundColor: "transparent", color: "#BBA866", fontSize: 13, cursor: salvando ? "not-allowed" : "pointer", marginBottom: 8, opacity: salvando ? 0.7 : 1 }}
              >
                {salvando ? "Salvando…" : ultimoSalvo ? `Salvo às ${ultimoSalvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Salvar estratégia"}
              </button>
            )}
            <button
              onClick={() => setPrintMode("consultor")}
              style={{ width: "100%", padding: "8px 0", border: "1px solid #041A20", borderRadius: 6, backgroundColor: "transparent", color: "#041A20", fontSize: 13, cursor: "pointer", marginBottom: 8 }}
            >
              Gerar PDF Consultor
            </button>
            <button
              onClick={() => setPrintMode("cliente")}
              style={{ width: "100%", padding: "8px 0", border: "none", borderRadius: 6, backgroundColor: "#041A20", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              Gerar PDF Cliente
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, backgroundColor: "#F8F9FA", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Scrollable area */}
          <div style={{ flex: 1, overflowY: "auto", padding: 32, paddingBottom: 100 }}>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>
              Estratégia Inicial › {secaoAtual.label}
            </div>

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#041A20", margin: 0 }}>
                {secaoAtual.label}
              </h1>
              {secaoAtiva !== "revisao" && (
                <button
                  onClick={marcarConcluida}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: `1px solid #22C55E`,
                    backgroundColor: data.statusSecoes[secaoAtiva] === "concluido" ? "#22C55E" : "transparent",
                    color: data.statusSecoes[secaoAtiva] === "concluido" ? "white" : "#22C55E",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Marcar como concluída ✓
                </button>
              )}
            </div>

            {/* Section content */}
            {renderContent()}
          </div>

          {/* Bottom nav */}
          <div style={{ backgroundColor: "white", borderTop: "1px solid #E5E7EB", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <button
              onClick={irAnterior}
              disabled={secaoIndex === 0}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #041A20",
                backgroundColor: "transparent",
                color: secaoIndex === 0 ? "#9CA3AF" : "#041A20",
                borderColor: secaoIndex === 0 ? "#E5E7EB" : "#041A20",
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
                      backgroundColor: i === secaoIndex ? "#041A20" : "#E5E7EB",
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
                backgroundColor: secaoIndex === SECOES.length - 1 ? "#E5E7EB" : "#041A20",
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
          mode={printMode}
          onClose={() => setPrintMode(null)}
        />
      )}
    </div>
  );
}
