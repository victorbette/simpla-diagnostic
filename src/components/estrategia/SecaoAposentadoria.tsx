import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaLiberdadeFinanceira } from "@/components/ferramentas/FerramentaLiberdadeFinanceira";
import type { ResultadoIF } from "@/types/estrategiaResultados";
import { GraficoIF } from "@/components/shared/GraficoIF";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
}

const AVAILABLE_TAGS = ["IF", "Aposentadoria", "Aportes", "Previdência", "PGBL"];

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export function SecaoAposentadoria({
  plan,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoIF,
  onResultadoIF,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const p = plan.planejamentoIF;

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  return (
    <>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Card 1 — Simulator */}
        <div style={{ ...CARD, borderTop: "3px solid #15803D" }}>
          {resultadoIF ? (
            <>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#000000", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Simulação de IF / Aposentadoria
                  </span>
                  <span style={{ fontSize: 11, color: "#6B7280", backgroundColor: "#F0F7FF", borderRadius: 999, padding: "2px 8px", border: "1px solid #BFDBFE" }}>
                    Calculado em {new Date(resultadoIF.dataCalculo).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#15803D", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Abrir simulador →
                </button>
              </div>

              {/* 2 metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio na IF</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#1E40AF", margin: 0 }}>{formatCurrency(resultadoIF.patrimonioAposentadoria)}</p>
                </div>
                <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Renda Sustentável</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(resultadoIF.rendaSustentavel)}/mês</p>
                </div>
              </div>

              {/* Area chart */}
              <div style={{ marginTop: 20 }}>
                <GraficoIF
                  projecao={resultadoIF.projecao}
                  objetivos={resultadoIF.objetivos ?? []}
                  height={280}
                  idadeMeta={resultadoIF.idadeMeta}
                />
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ textAlign: "center", padding: "32px 24px", backgroundColor: "#F0F7FF", borderRadius: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", margin: "0 0 6px" }}>
                Simulador de IF não executado
              </p>
              <p style={{ fontSize: 13, color: "#2563EB", margin: 0 }}>
                {p.idadeAtual} → {p.idadeMeta} anos · {formatCurrency(p.patrimonioAtual)} atual
              </p>
              <button
                onClick={() => setModalOpen(true)}
                style={{ marginTop: 12, fontSize: 13, padding: "8px 18px", borderRadius: 6, backgroundColor: "#15803D", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Abrir simulador de IF →
              </button>
            </div>
          )}
        </div>

        {/* Card 2 — Comment */}
        <div style={{ ...CARD, borderTop: "3px solid #1E3A8A" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Estratégia e Recomendações
          </p>
          <div style={{ position: "relative" }}>
            <textarea
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              placeholder="Ex: Para atingir a IF aos 60 anos, o cliente precisa aumentar o aporte mensal de R$ 3.000 para R$ 4.500..."
              style={{
                width: "100%",
                minHeight: 200,
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #BFDBFE",
                fontSize: 13,
                color: "#000000",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>
              {comentario.length} caracteres
            </span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
            {AVAILABLE_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: "1px solid #BFDBFE",
                  backgroundColor: tags.includes(t) ? "#2563EB" : "transparent",
                  color: tags.includes(t) ? "white" : "#111827",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FerramentaModal open={modalOpen} onClose={() => setModalOpen(false)} title="Simulador de Liberdade Financeira">
        <FerramentaLiberdadeFinanceira
          clientId={plan.clientId}
          planejamentoIF={plan.planejamentoIF}
          onSave={(params, objetivos, result) => {
            onResultadoIF({
              patrimonioAposentadoria: result.patrimonioAposentadoria,
              rendaSustentavel: result.rendaSustentavel,
              gapRenda: result.gapRenda,
              liberdadeAlcancada: result.liberdadeAlcancada,
              aporteAjustado: result.aporteAjustado,
              patrimonioNecessario: result.taxaReal > 0 ? (params.rendaDesejada * 12) / result.taxaReal : result.patrimonioAposentadoria,
              patrimonioAtual: params.patrimonioInicial,
              idadeAtual: params.idadeAtual,
              idadeMeta: params.idadeAposentadoria,
              anosRestantes: Math.max(0, params.idadeAposentadoria - params.idadeAtual),
              rendaMensalDesejada: params.rendaDesejada,
              aporteAtual: params.aporteMensal,
              taxaRetorno: params.rentabilidadeAnual,
              projecao: result.projecao.map((p) => ({ idade: p.idade, patrimonio: p.patrimonio, fase: p.fase })),
              objetivos,
              dataCalculo: new Date().toISOString(),
              savedAt: new Date().toISOString(),
            });
            setModalOpen(false);
          }}
        />
      </FerramentaModal>
    </>
  );
}
