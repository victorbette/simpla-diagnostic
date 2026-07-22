import { useState } from "react";
import type { Lead, DadosColetaDiag, DadosLFDiag } from "./types";
import { DiagColeta } from "./etapas/DiagColeta";
import { DiagLiberdadeFinanceira } from "./etapas/DiagLiberdadeFinanceira";
import { DiagResultado } from "./etapas/DiagResultado";

type Etapa = "coleta" | "lf" | "resultado";

const ABAS: { id: Etapa; label: string }[] = [
  { id: "coleta", label: "Coleta de Dados" },
  { id: "lf", label: "Liberdade Financeira" },
  { id: "resultado", label: "Resultado" },
];

interface Props {
  lead: Lead;
  onAtualizar: (lead: Lead) => void;
  onVoltar: () => void;
}

export function DiagnosticoFlow({ lead, onAtualizar, onVoltar }: Props) {
  const [etapaAtiva, setEtapaAtiva] = useState<Etapa>(() => {
    try {
      const saved = sessionStorage.getItem(`diag_etapa_${lead.id}`);
      if (saved === "coleta" || saved === "lf" || saved === "resultado") return saved;
    } catch { /* ignore */ }
    return "coleta";
  });

  function changeEtapa(etapa: Etapa) {
    setEtapaAtiva(etapa);
    try { sessionStorage.setItem(`diag_etapa_${lead.id}`, etapa); } catch { /* ignore */ }
  }

  function atualizarColeta(patch: Partial<DadosColetaDiag>) {
    onAtualizar({ ...lead, dadosColeta: { ...lead.dadosColeta, ...patch } });
  }

  function atualizarLF(patch: Partial<DadosLFDiag>) {
    onAtualizar({ ...lead, dadosLF: { ...lead.dadosLF, ...patch } });
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F0F7FF" }}>

      {/* Header */}
      <header
        className="diag-no-print"
        style={{ backgroundColor: "#1E3A8A", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}
      >
        <button
          onClick={onVoltar}
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          ← Voltar
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: 16, flex: 1 }}>
          {lead.nome}
        </span>
        <span style={{ background: "rgba(255,255,255,0.2)", color: "white", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
          Diagnóstico
        </span>
      </header>

      {/* Abas */}
      <div
        className="diag-no-print"
        style={{ backgroundColor: "white", borderBottom: "0.5px solid #E5E7EB", padding: "0 32px", display: "flex" }}
      >
        {ABAS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => changeEtapa(id)}
            style={{
              padding: "14px 20px",
              fontSize: 13,
              fontWeight: etapaAtiva === id ? 600 : 400,
              color: etapaAtiva === id ? "#1E3A8A" : "#6B7280",
              background: "none",
              border: "none",
              borderBottom: etapaAtiva === id ? "2px solid #1E3A8A" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={{ width: "100%", boxSizing: "border-box", padding: "24px 32px" }}>
        {etapaAtiva === "coleta" && (
          <DiagColeta dados={lead.dadosColeta} onChange={atualizarColeta} />
        )}

        {etapaAtiva === "lf" && (
          <>
            <DiagLiberdadeFinanceira
              dadosColeta={lead.dadosColeta}
              dadosLF={lead.dadosLF}
              onChange={atualizarLF}
            />
            <div className="diag-no-print" style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => changeEtapa("resultado")}
                style={{ background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Ver Resultado →
              </button>
            </div>
          </>
        )}

        {etapaAtiva === "resultado" && (
          <DiagResultado
            lead={lead}
            onAtualizar={(patch) => onAtualizar({ ...lead, ...patch })}
          />
        )}
      </main>
    </div>
  );
}
