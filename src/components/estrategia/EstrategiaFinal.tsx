import { useState, useCallback, useMemo } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularScores } from "@/lib/estrategiaScores";
import { gerarPDF } from "@/lib/gerarPDF";
import { DocCapa } from "./documento/DocCapa";
import { DocSumario } from "./documento/DocSumario";
import { DocAssetAllocation } from "./documento/DocAssetAllocation";
import { DocLiberdadeFinanceira } from "./documento/DocLiberdadeFinanceira";
import { DocProtecaoSucessorio } from "./documento/DocProtecaoSucessorio";
import { DocPlanejamentoFiscal } from "./documento/DocPlanejamentoFiscal";
import { DocProximosPassos } from "./documento/DocProximosPassos";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  onFechar?: () => void;
  onResultadosChange?: (r: ResultadosEstrategia) => void;
}

type PaginaId = "capa" | "sumario" | "aa" | "lf" | "ps" | "fiscal" | "proximos";

interface PaginaConfig {
  id: PaginaId;
  label: string;
  icon: string;
}

const PAGINAS: PaginaConfig[] = [
  { id: "capa",     label: "Capa",           icon: "ti ti-file-text"       },
  { id: "sumario",  label: "Sumário",        icon: "ti ti-clipboard-list"  },
  { id: "aa",       label: "Asset Alloc.",   icon: "ti ti-chart-pie"       },
  { id: "lf",       label: "Lib. Financeira",icon: "ti ti-beach"           },
  { id: "ps",       label: "Proteção",       icon: "ti ti-shield"          },
  { id: "fiscal",   label: "Fiscal",         icon: "ti ti-receipt"         },
  { id: "proximos", label: "Próx. Passos",   icon: "ti ti-list-checks"     },
];

interface ComentariosDoc {
  aa: string;
  lf: string;
  ps: string;
  fiscal: string;
}

function defaultComentarios(resultados: ResultadosEstrategia): ComentariosDoc {
  const ef = resultados.estrategiaFinal;
  return {
    aa: ef?.aa ?? "",
    lf: ef?.lf ?? "",
    ps: ef?.ps ?? "",
    fiscal: ef?.fiscal ?? "",
  };
}

export function EstrategiaFinal({ plan, resultados, clientName, onResultadosChange }: Props) {
  const storageKey = `estrategia_final_${plan.clientId}`;

  const [paginaAtual, setPaginaAtual] = useState<PaginaId>("capa");
  const [comentarios, setComentarios] = useState<ComentariosDoc>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...defaultComentarios(resultados), ...(JSON.parse(saved) as Partial<ComentariosDoc>) };
    } catch { /**/ }
    return defaultComentarios(resultados);
  });

  const saveComentarios = useCallback((next: ComentariosDoc) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /**/ }
  }, [storageKey]);

  const updateComentario = useCallback((field: keyof ComentariosDoc, value: string) => {
    setComentarios((prev) => {
      const next = { ...prev, [field]: value };
      saveComentarios(next);
      return next;
    });
  }, [saveComentarios]);

  const scores = useMemo(() => calcularScores(plan, resultados), [plan, resultados]);
  const paginaIdx = PAGINAS.findIndex((p) => p.id === paginaAtual);

  const handleResultadosChange = useCallback((r: ResultadosEstrategia) => {
    onResultadosChange?.(r);
  }, [onResultadosChange]);

  // Render each doc page component (always mounted for print)
  const pages = useMemo(() => [
    { id: "capa" as PaginaId, node: <DocCapa plan={plan} resultados={resultados} clientName={clientName} scores={scores} /> },
    { id: "sumario" as PaginaId, node: <DocSumario plan={plan} resultados={resultados} clientName={clientName} scores={scores} /> },
    { id: "aa" as PaginaId, node: <DocAssetAllocation plan={plan} resultados={resultados} score={scores.aaScore} comentario={comentarios.aa} onComentarioChange={(v) => updateComentario("aa", v)} /> },
    { id: "lf" as PaginaId, node: <DocLiberdadeFinanceira plan={plan} resultados={resultados} clientName={clientName} score={scores.lfScore} comentario={comentarios.lf} onComentarioChange={(v) => updateComentario("lf", v)} /> },
    { id: "ps" as PaginaId, node: <DocProtecaoSucessorio plan={plan} resultados={resultados} score={scores.psScore} comentario={comentarios.ps} onComentarioChange={(v) => updateComentario("ps", v)} /> },
    { id: "fiscal" as PaginaId, node: <DocPlanejamentoFiscal plan={plan} resultados={resultados} score={scores.fiscalScore} comentario={comentarios.fiscal} onComentarioChange={(v) => updateComentario("fiscal", v)} /> },
    { id: "proximos" as PaginaId, node: <DocProximosPassos plan={plan} resultados={resultados} onResultadosChange={handleResultadosChange} /> },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [plan, resultados, scores, comentarios.aa, comentarios.lf, comentarios.ps, comentarios.fiscal, handleResultadosChange]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Navigation header — hidden on print via CSS .doc-nav-header */}
      <div
        className="doc-nav-header"
        style={{
          backgroundColor: "#1E3A8A",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* Left: logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <img src="/logo-si.svg" alt="Simpla Invest" style={{ height: 28, width: 28, objectFit: "contain" }} />
          <span style={{ color: "white", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
            Estratégia Inicial · {clientName}
          </span>
        </div>

        {/* Center: page pills (scrollable) */}
        <div style={{ display: "flex", gap: 3, flex: 1, justifyContent: "center", overflowX: "auto", scrollbarWidth: "none" }}>
          {PAGINAS.map((p) => {
            const isActive = p.id === paginaAtual;
            return (
              <button
                key={p.id}
                onClick={() => setPaginaAtual(p.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: isActive ? "white" : "transparent",
                  color: isActive ? "#1E3A8A" : "#93C5FD",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s",
                }}
              >
                <i className={p.icon} style={{ fontSize: 12 }} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Right: buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => gerarPDF(clientName)}
            style={{ padding: "5px 14px", borderRadius: 6, border: "none", backgroundColor: "white", color: "#1E3A8A", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Gerar PDF →
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F0F7FF" }}>

        {/* Screen navigation arrows — hidden in print */}
        <div
          className="doc-screen-only"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}
        >
          <button
            onClick={() => paginaIdx > 0 && setPaginaAtual(PAGINAS[paginaIdx - 1].id)}
            disabled={paginaIdx === 0}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #BFDBFE", background: "white", fontSize: 12, cursor: paginaIdx === 0 ? "not-allowed" : "pointer", color: paginaIdx === 0 ? "#9CA3AF" : "#1E3A8A" }}
          >
            ← {paginaIdx > 0 ? PAGINAS[paginaIdx - 1].label : "Início"}
          </button>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{paginaIdx + 1} de {PAGINAS.length}</span>
          <button
            onClick={() => paginaIdx < PAGINAS.length - 1 && setPaginaAtual(PAGINAS[paginaIdx + 1].id)}
            disabled={paginaIdx === PAGINAS.length - 1}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #BFDBFE", background: "white", fontSize: 12, cursor: paginaIdx === PAGINAS.length - 1 ? "not-allowed" : "pointer", color: paginaIdx === PAGINAS.length - 1 ? "#9CA3AF" : "#1E3A8A" }}
          >
            {paginaIdx < PAGINAS.length - 1 ? `${PAGINAS[paginaIdx + 1].label} →` : "Fim"}
          </button>
        </div>

        {/* Pages container — on screen shows current page; on print shows all */}
        <div
          className="doc-pages-container"
          style={{ padding: "12px 24px 40px" }}
        >
          {pages.map(({ id, node }) => (
            <div
              key={id}
              style={id !== paginaAtual ? { display: "none" } : undefined}
            >
              <div style={{ maxWidth: 900, margin: "0 auto", boxShadow: "0 2px 12px rgba(0,0,0,0.10)", borderRadius: 8, overflow: "hidden" }}>
                {node}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
