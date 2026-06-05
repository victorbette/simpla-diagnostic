import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GestaoInvestimentos } from "@/components/acompanhamento/GestaoInvestimentos";
import { AcompLF } from "@/components/acompanhamento/AcompLF";
import { AcompProtecao } from "@/components/acompanhamento/AcompProtecao";
import { AcompFiscal } from "@/components/acompanhamento/AcompFiscal";

interface Props {
  clienteId: string;
  clienteNome: string;
  onVoltar: () => void;
}

type Tab = "investimentos" | "lf" | "protecao" | "fiscal";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "investimentos", label: "Gestão de Investimentos", icon: "ti-chart-pie" },
  { id: "lf",            label: "Liberdade Financeira",   icon: "ti-trending-up" },
  { id: "protecao",      label: "Proteção",               icon: "ti-shield-check" },
  { id: "fiscal",        label: "Fiscal",                 icon: "ti-receipt" },
];

export function AcompanhamentoPage({ clienteId, clienteNome, onVoltar }: Props) {
  const [tab, setTab] = useState<Tab>("investimentos");
  const [resultados, setResultados] = useState<ResultadosEstrategia | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`resultados_estrategia_${clienteId}`);
    if (raw) {
      try {
        setResultados(JSON.parse(raw));
      } catch {
        // corrupt data — treat as null
      }
    }
  }, [clienteId]);

  const savedAt = (() => {
    const r = resultados?.carteira ?? resultados?.if ?? resultados?.seguro ?? resultados?.fiscal;
    if (!r?.savedAt) return null;
    return new Date(r.savedAt).toLocaleDateString("pt-BR");
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F7FF" }}>

      {/* Header */}
      <header style={{ backgroundColor: "#1E3A8A", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onVoltar}
            style={{
              color: "#93C5FD", background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              padding: "4px 0",
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            CRM
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: "#374151" }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: "#93C5FD", fontSize: 10, fontWeight: 400, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Acompanhamento Consultivo
            </p>
            <p style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>{clienteNome}</p>
          </div>
          {savedAt && (
            <span style={{ fontSize: 11, color: "#93C5FD" }}>Dados de {savedAt}</span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                borderRadius: "8px 8px 0 0",
                background: tab === t.id ? "#F0F7FF" : "transparent",
                color: tab === t.id ? "#1E3A8A" : "#93C5FD",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {!resultados ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            color: "#9CA3AF", fontSize: 15,
          }}>
            <i className="ti ti-database-off" style={{ fontSize: 44, display: "block", marginBottom: 16, color: "#BFDBFE" }} />
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#6B7280" }}>Nenhum dado salvo para este cliente</p>
            <p style={{ margin: 0, fontSize: 13 }}>Complete o Financial Planning e salve os resultados primeiro.</p>
          </div>
        ) : (
          <>
            {tab === "investimentos" && <GestaoInvestimentos carteira={resultados.carteira} />}
            {tab === "lf"            && <AcompLF resultadoIF={resultados.if} />}
            {tab === "protecao"      && <AcompProtecao resultadoSeguro={resultados.seguro} />}
            {tab === "fiscal"        && <AcompFiscal resultadoFiscal={resultados.fiscal} />}
          </>
        )}
      </main>
    </div>
  );
}
