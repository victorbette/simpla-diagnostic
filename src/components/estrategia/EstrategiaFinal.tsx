import { useState, useCallback, useMemo, useEffect } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularScores } from "@/lib/estrategiaScores";
import { CONFIG_CONSULTOR_DEFAULT } from "@/lib/documentoConfig";
import type { ConfigConsultor } from "@/lib/documentoConfig";
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

export function EstrategiaFinal({ plan, resultados, clientName, onResultadosChange }: Props) {
  // Config do consultor — persistida em localStorage
  const [config, setConfig] = useState<ConfigConsultor>(() => {
    try {
      const salvo = localStorage.getItem("config_consultor");
      return salvo ? (JSON.parse(salvo) as ConfigConsultor) : CONFIG_CONSULTOR_DEFAULT;
    } catch {
      return CONFIG_CONSULTOR_DEFAULT;
    }
  });

  useEffect(() => {
    try { localStorage.setItem("config_consultor", JSON.stringify(config)); } catch { /**/ }
  }, [config]);

  const scoresCalc = useMemo(() => calcularScores(plan, resultados), [plan, resultados]);

  const scores: Record<string, number> = {
    lf:     scoresCalc.lfScore,
    aa:     scoresCalc.aaScore,
    ps:     scoresCalc.psScore,
    fiscal: scoresCalc.fiscalScore,
  };

  const dataEstrategia =
    resultados.estrategiaFinal?.dataGeracao ??
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const handleResultadosChange = useCallback(
    (r: ResultadosEstrategia) => { onResultadosChange?.(r); },
    [onResultadosChange],
  );

  return (
    <div
      className="estrategia-final-root"
      style={{ width: "100%", height: "100%", overflowY: "auto", background: "#EFF6FF" }}
    >
      {/* Barra de ação — não imprime */}
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
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-file-text" style={{ color: "#2563EB", fontSize: 18 }} aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            Estratégia Inicial Pronta
          </span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>· {clientName}</span>
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

      {/* Documento */}
      <div style={{ padding: "32px 16px" }}>
        {/* Página 1 */}
        <DocCapa nomeCliente={clientName} dataEstrategia={dataEstrategia} />

        {/* Página 2 */}
        <DocDisclaimer nomeCliente={clientName} config={config} onConfigChange={setConfig} />

        {/* Página 3 */}
        <DocSumario nomeCliente={clientName} scores={scores} />

        {/* Página 4 */}
        <DocLiberdadeFinanceira
          nomeCliente={clientName}
          plan={plan}
          resultados={resultados}
          numPagina={4}
        />

        {/* Página 5 */}
        <DocAssetAllocation
          nomeCliente={clientName}
          plan={plan}
          resultados={resultados}
          numPagina={5}
        />

        {/* Página 6 */}
        <DocProtecaoSucessorio
          nomeCliente={clientName}
          plan={plan}
          resultados={resultados}
          numPagina={6}
        />

        {/* Página 7 */}
        <DocPlanejamentoFiscal
          nomeCliente={clientName}
          plan={plan}
          resultados={resultados}
          numPagina={7}
        />

        {/* Página 8 */}
        <DocProximosPassos
          nomeCliente={clientName}
          plan={plan}
          resultados={resultados}
          onResultadosChange={handleResultadosChange}
          numPagina={8}
        />

        {/* Página 9 */}
        <DocMaosAObra nomeCliente={clientName} config={config} numPagina={9} />
      </div>
    </div>
  );
}
