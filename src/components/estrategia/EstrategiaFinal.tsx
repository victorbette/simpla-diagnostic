import { useState, useCallback, useMemo } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularScores } from "@/lib/estrategiaScores";
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

function SecaoDivider({ label }: { label: string }) {
  return (
    <div className="no-print" style={{ margin: "40px 0 32px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1, height: 1, background: "#BFDBFE" }} />
      <span style={{ fontSize: 11, color: "#93C5FD", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "#BFDBFE" }} />
    </div>
  );
}

export function EstrategiaFinal({ plan, resultados, clientName, onResultadosChange }: Props) {
  const storageKey = `estrategia_final_${plan.clientId}`;

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

  const handleResultadosChange = useCallback((r: ResultadosEstrategia) => {
    onResultadosChange?.(r);
  }, [onResultadosChange]);

  return (
    <div
      className="estrategia-final-root"
      style={{ width: "100%", height: "100%", overflowY: "auto", background: "#F0F7FF" }}
    >
      {/* Barra de ação — oculta na impressão */}
      <div
        className="no-print"
        style={{
          background: "white",
          borderBottom: "1px solid #BFDBFE",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-file-text" style={{ fontSize: 18, color: "#2563EB" }} aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            Estratégia Inicial — {clientName}
          </span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            · {new Date().toLocaleDateString("pt-BR")}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#1E3A8A",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <i className="ti ti-printer" style={{ fontSize: 16 }} aria-hidden="true" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Documento — área impressa */}
      <div className="documento-print" style={{ maxWidth: 900, margin: "0 auto", padding: "32px" }}>

        <DocCapa plan={plan} resultados={resultados} clientName={clientName} scores={scores} />

        <SecaoDivider label="Sumário Executivo" />
        <DocSumario plan={plan} resultados={resultados} clientName={clientName} scores={scores} />

        <SecaoDivider label="Asset Allocation" />
        <DocAssetAllocation
          plan={plan}
          resultados={resultados}
          score={scores.aaScore}
          comentario={comentarios.aa}
          onComentarioChange={(v) => updateComentario("aa", v)}
        />

        <SecaoDivider label="Liberdade Financeira" />
        <DocLiberdadeFinanceira
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          score={scores.lfScore}
          comentario={comentarios.lf}
          onComentarioChange={(v) => updateComentario("lf", v)}
        />

        <SecaoDivider label="Proteção e Sucessório" />
        <DocProtecaoSucessorio
          plan={plan}
          resultados={resultados}
          score={scores.psScore}
          comentario={comentarios.ps}
          onComentarioChange={(v) => updateComentario("ps", v)}
        />

        <SecaoDivider label="Planejamento Fiscal" />
        <DocPlanejamentoFiscal
          plan={plan}
          resultados={resultados}
          score={scores.fiscalScore}
          comentario={comentarios.fiscal}
          onComentarioChange={(v) => updateComentario("fiscal", v)}
        />

        <SecaoDivider label="Próximos Passos" />
        <DocProximosPassos
          plan={plan}
          resultados={resultados}
          onResultadosChange={handleResultadosChange}
        />

      </div>
    </div>
  );
}
