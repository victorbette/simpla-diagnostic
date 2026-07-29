import { useMemo } from "react";
import type { Lead } from "../types";
import {
  CONFIG_CONSULTOR_DEFAULT,
  type ConfigConsultor,
} from "@/lib/documentoConfig";
import { gerarPDF } from "@/lib/gerarPDF";
import { DocCapa } from "@/components/estrategia/documento/DocCapa";
import { DocDisclaimerDiag } from "../documento/DocDisclaimerDiag";
import { DocDiagnosticoInicial } from "../documento/DocDiagnosticoInicial";
import { DocLFDiag } from "../documento/DocLFDiag";
import { DocGestaoAtivos } from "../documento/DocGestaoAtivos";
import { DocBlindagemPatrimonial } from "../documento/DocBlindagemPatrimonial";
import { DocProximosPassosDiag } from "../documento/DocProximosPassosDiag";
import { DocMaosAObraDiag } from "../documento/DocMaosAObraDiag";

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

interface Props {
  lead: Lead;
}

export function DiagRelatorio({ lead }: Props) {
  const config: ConfigConsultor = useMemo(() => {
    try {
      const salvo = localStorage.getItem("config_consultor");
      return salvo ? (JSON.parse(salvo) as ConfigConsultor) : CONFIG_CONSULTOR_DEFAULT;
    } catch {
      return CONFIG_CONSULTOR_DEFAULT;
    }
  }, []);

  const agora = new Date();
  const mes = MESES_PT[agora.getMonth()];
  const dataCapa = `${mes[0].toUpperCase()}${mes.slice(1)} / ${agora.getFullYear()}`;
  const nomeConsultorCapa = config.nomeCompleto.replace(/\s*\(.*\)\s*$/, "");

  return (
    <div style={{ background: "#EFF6FF", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .data-reuniao-edit { display: none !important; }
          .data-reuniao-print { display: inline !important; }
          .no-print { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4; margin: 0; }
        }
        @media screen {
          .data-reuniao-print { display: none !important; }
        }
      `}</style>

      {/* Barra de ação (não imprime) */}
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
            Diagnóstico Financeiro
          </span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>· {lead.nome}</span>
        </div>
        <button
          onClick={() => gerarPDF(lead.nome)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1E3A8A", color: "white", border: "none",
            borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Páginas do documento */}
      <div className="doc-pages-wrap" style={{ padding: "32px 16px" }}>
        {/* Página 1 — Capa */}
        <DocCapa
          nomeCliente={lead.nome}
          dataEstrategia={dataCapa}
          nomeConsultor={nomeConsultorCapa}
          titulo="Diagnóstico Financeiro"
        />

        {/* Página 2 — Diagnóstico Inicial */}
        <DocDiagnosticoInicial lead={lead} />

        {/* Página 3 — Liberdade Financeira */}
        <DocLFDiag lead={lead} />

        {/* Página 4 — Gestão de Ativos */}
        <DocGestaoAtivos lead={lead} />

        {/* Página 5 — Blindagem Patrimonial */}
        <DocBlindagemPatrimonial lead={lead} />

        {/* Página 6 — Próximos Passos */}
        <DocProximosPassosDiag nomeCliente={lead.nome} />

        {/* Página 7 — Mãos à Obra */}
        <DocMaosAObraDiag nomeCliente={lead.nome} />

        {/* Página 8 — Disclaimer */}
        <DocDisclaimerDiag nomeCliente={lead.nome} config={config} />
      </div>
    </div>
  );
}
