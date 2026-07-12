import { useState, useCallback, useEffect } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { CONFIG_CONSULTOR_DEFAULT } from "@/lib/documentoConfig";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { gerarPDF } from "@/lib/gerarPDF";
import { DocCapa } from "./documento/DocCapa";
import { DocDisclaimer } from "./documento/DocDisclaimer";
import { DocSumario } from "./documento/DocSumario";
import { DocPerfilInvestidor } from "./documento/DocPerfilInvestidor";
import { DivisoriaSecao } from "./documento/DivisoriaSecao";
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
  onConcluir?: () => Promise<void>;
}

export function EstrategiaFinal({ plan, resultados, clientName, onResultadosChange, onConcluir }: Props) {
  // Config do consultor — persistida em localStorage
  const [salvando, setSalvando] = useState(false);

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

  const dataEstrategia =
    resultados.estrategiaFinal?.dataGeracao ??
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // Nome curto do consultor para a capa (sem credenciais entre parênteses)
  const nomeConsultorCapa = config.nomeCompleto.replace(/\s*\(.*\)\s*$/, "");

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
          onClick={async () => {
            setSalvando(true);
            await onConcluir?.();
            setSalvando(false);
            gerarPDF(clientName);
          }}
          disabled={salvando}
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
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: salvando ? 0.85 : 1,
          }}
        >
          {salvando ? (
            <>
              <i className="ti ti-loader-2" style={{ fontSize: 15, animation: "spin 1s linear infinite" }} aria-hidden="true" />
              Salvando...
            </>
          ) : (
            <>
              <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
              Imprimir / Salvar PDF
            </>
          )}
        </button>
      </div>

      {/* Documento */}
      <div className="doc-pages-wrap" style={{ padding: "32px 16px" }}>
        <DocCapa
          nomeCliente={clientName}
          dataEstrategia={dataEstrategia}
          nomeConsultor={nomeConsultorCapa}
        />

        <DocDisclaimer nomeCliente={clientName} config={config} onConfigChange={setConfig} />

        <DocSumario nomeCliente={clientName} />

        <DocPerfilInvestidor nomeCliente={clientName} plan={plan} />

        <DivisoriaSecao titulo="Liberdade Financeira" nomeCliente={clientName} />
        <DocLiberdadeFinanceira nomeCliente={clientName} plan={plan} resultados={resultados} />

        <DivisoriaSecao titulo="Asset Allocation" nomeCliente={clientName} />
        <DocAssetAllocation nomeCliente={clientName} plan={plan} resultados={resultados} />

        <DivisoriaSecao titulo="Proteção e Sucessão" nomeCliente={clientName} />
        <DocProtecaoSucessorio nomeCliente={clientName} plan={plan} resultados={resultados} />

        <DivisoriaSecao titulo="Planejamento Tributário" nomeCliente={clientName} />
        <DocPlanejamentoFiscal nomeCliente={clientName} plan={plan} resultados={resultados} />

        <DivisoriaSecao titulo="Plano de Ação" nomeCliente={clientName} />
        <DocProximosPassos
          nomeCliente={clientName}
          plan={plan}
          resultados={resultados}
          onResultadosChange={handleResultadosChange}
        />

        <DocMaosAObra nomeCliente={clientName} config={config} />
      </div>
    </div>
  );
}
