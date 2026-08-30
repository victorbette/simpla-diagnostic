import { useState } from "react";
import type { Lead, DadosColetaDiag, DadosLFDiag } from "./types";
import { DiagColeta } from "./etapas/DiagColeta";
import { DiagLiberdadeFinanceira } from "./etapas/DiagLiberdadeFinanceira";
import { DiagResultado } from "./etapas/DiagResultado";
import { DiagRelatorio } from "./etapas/DiagRelatorio";

type Etapa = "coleta" | "lf" | "resultado" | "relatorio";

const ABAS: { id: Etapa; label: string }[] = [
  { id: "coleta", label: "Situação Atual" },
  { id: "lf", label: "Liberdade Financeira" },
  { id: "resultado", label: "Diagnóstico Inicial" },
  { id: "relatorio", label: "Relatório" },
];

interface Props {
  lead: Lead;
  onAtualizar: (lead: Lead) => void;
  onVoltar: () => void;
}

export function DiagnosticoFlow({ lead, onAtualizar, onVoltar }: Props) {
  const [etapaAtiva, setEtapaAtiva] = useState<Etapa>("coleta");

  function handleTrocarAba(novaAba: Etapa) {
    onAtualizar(lead);
    setEtapaAtiva(novaAba);
  }

  function atualizarColeta(patch: Partial<DadosColetaDiag>) {
    onAtualizar({ ...lead, dadosColeta: { ...lead.dadosColeta, ...patch } });
  }

  function atualizarLF(patch: Partial<DadosLFDiag>) {
    onAtualizar({ ...lead, dadosLF: { ...lead.dadosLF, ...patch } });
  }

  function handleSalvar() {
    onAtualizar(lead);
  }

  return (
    <div className="diag-flow-root" style={{ minHeight: "100vh", backgroundColor: "#F8F9FA" }}>

      {/* Header com abas integradas */}
      <header
        className="diag-no-print"
        style={{ backgroundColor: "#1E3A8A" }}
      >
        {/* Linha superior */}
        <div style={{ padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onVoltar}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            ← Voltar
          </button>
          <div style={{ width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/diamond-icon-small.png" alt="Simpla Invest" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>Simpla Invest</span>
              <span style={{ color: "#93C5FD", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.04em" }}>Financial Planning</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>
            {lead.nome}
          </span>
          <span style={{ background: "rgba(255,255,255,0.2)", color: "white", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            Diagnóstico
          </span>
        </div>

        {/* Abas dentro do header azul */}
        <div style={{ padding: "0 32px", display: "flex", gap: 2 }}>
          {ABAS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleTrocarAba(id)}
              style={{
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                borderRadius: "8px 8px 0 0",
                cursor: "pointer",
                background: etapaAtiva === id ? "#F0F7FF" : "transparent",
                color: etapaAtiva === id ? "#1E3A8A" : "#93C5FD",
                fontFamily: "inherit",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{ width: "100%", boxSizing: "border-box", padding: etapaAtiva === "relatorio" ? 0 : "24px 32px" }}>
        {etapaAtiva === "coleta" && (
          <DiagColeta dados={lead.dadosColeta} onChange={atualizarColeta} onSalvar={handleSalvar} />
        )}

        {etapaAtiva === "lf" && (
          <>
            <DiagLiberdadeFinanceira
              dadosColeta={lead.dadosColeta}
              dadosLF={lead.dadosLF}
              onChange={atualizarLF}
              onSalvar={handleSalvar}
            />
            <div className="diag-no-print" style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleTrocarAba("resultado")}
                style={{ background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Ver Diagnóstico →
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

        {etapaAtiva === "relatorio" && (
          <DiagRelatorio
            lead={lead}
            onSalvarRelatorio={() => onAtualizar({ ...lead, relatorioSalvo: true })}
          />
        )}
      </main>
    </div>
  );
}
