import { useState, useCallback, useMemo } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularScores } from "@/lib/estrategiaScores";
import { DocCapa } from "./documento/DocCapa";
import { DocDisclaimer } from "./documento/DocDisclaimer";
import { DocSumario } from "./documento/DocSumario";
import { DocLiberdadeFinanceira } from "./documento/DocLiberdadeFinanceira";
import { DocAssetAllocation } from "./documento/DocAssetAllocation";
import { DocProtecaoSucessorio } from "./documento/DocProtecaoSucessorio";
import { DocPlanejamentoFiscal } from "./documento/DocPlanejamentoFiscal";
import { DocProximosPassos } from "./documento/DocProximosPassos";
import { DocMaosAObra } from "./documento/DocMaosAObra";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  onFechar?: () => void;
  onResultadosChange?: (r: ResultadosEstrategia) => void;
}

interface ComentariosDoc {
  lf: string;
  aa: string;
  ps: string;
  fiscal: string;
}

function defaultComentarios(resultados: ResultadosEstrategia): ComentariosDoc {
  const ef = resultados.estrategiaFinal;
  return {
    lf: ef?.lf ?? "",
    aa: ef?.aa ?? "",
    ps: ef?.ps ?? "",
    fiscal: ef?.fiscal ?? "",
  };
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
      style={{ width: "100%", height: "100%", overflowY: "auto", background: "#EFF6FF" }}
    >
      {/* Action bar — hidden on print */}
      <div
        className="no-print"
        style={{
          background: "white",
          borderBottom: "1px solid #BFDBFE",
          padding: "10px 32px",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>9 páginas</span>
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
      </div>

      {/* Document — print area */}
      <div className="documento-print" style={{ maxWidth: 960, margin: "0 auto", padding: "48px 64px" }}>

        {/* Page 1 */}
        <DocCapa
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          scores={scores}
        />

        {/* Page 2 */}
        <DocDisclaimer clientName={clientName} />

        {/* Page 3 */}
        <DocSumario
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          scores={scores}
        />

        {/* Page 4 */}
        <DocLiberdadeFinanceira
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          score={scores.lfScore}
          comentario={comentarios.lf}
          onComentarioChange={(v) => updateComentario("lf", v)}
        />

        {/* Page 5 */}
        <DocAssetAllocation
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          score={scores.aaScore}
          comentario={comentarios.aa}
          onComentarioChange={(v) => updateComentario("aa", v)}
        />

        {/* Page 6 */}
        <DocProtecaoSucessorio
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          score={scores.psScore}
          comentario={comentarios.ps}
          onComentarioChange={(v) => updateComentario("ps", v)}
        />

        {/* Page 7 */}
        <DocPlanejamentoFiscal
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          score={scores.fiscalScore}
          comentario={comentarios.fiscal}
          onComentarioChange={(v) => updateComentario("fiscal", v)}
        />

        {/* Page 8 */}
        <DocProximosPassos
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          onResultadosChange={handleResultadosChange}
        />

        {/* Page 9 */}
        <DocMaosAObra
          plan={plan}
          resultados={resultados}
          clientName={clientName}
          scores={scores}
        />

      </div>
    </div>
  );
}
