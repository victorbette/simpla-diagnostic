import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaLiberdadeFinanceira } from "@/components/ferramentas/FerramentaLiberdadeFinanceira";
import type { ResultadoIF } from "@/types/estrategiaResultados";

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

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

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

  const pct = resultadoIF
    ? Math.min(100, Math.round((resultadoIF.patrimonioAtual / Math.max(1, resultadoIF.patrimonioNecessario)) * 100))
    : 0;

  return (
    <>
      <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Card 1 — Simulator */}
        <div style={{ ...CARD, borderTop: "3px solid #3D6B41" }}>
          {resultadoIF ? (
            <>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#000000", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Simulação de IF / Aposentadoria
                  </span>
                  <span style={{ fontSize: 11, color: "#6B6347", backgroundColor: "#F5F3EE", borderRadius: 999, padding: "2px 8px", border: "1px solid #E2DCC8" }}>
                    Calculado em {new Date(resultadoIF.dataCalculo).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#3D6B41", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Abrir simulador →
                </button>
              </div>

              {/* 2x2 metrics grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio na IF</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#2A4F6A", margin: 0 }}>{formatCurrency(resultadoIF.patrimonioAposentadoria)}</p>
                </div>
                <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Renda Sustentável</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#3D6B41", margin: 0 }}>{formatCurrency(resultadoIF.rendaSustentavel)}/mês</p>
                </div>
                <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Gap de Renda</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: resultadoIF.gapRenda > 0 ? "#7A3535" : "#3D6B41", margin: 0 }}>
                    {formatCurrency(Math.abs(resultadoIF.gapRenda))}/mês
                  </p>
                </div>
                <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Anos Restantes</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#000000", margin: 0 }}>{resultadoIF.anosRestantes} anos</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B6347", marginBottom: 6 }}>
                  <span>{pct}% do patrimônio necessário</span>
                  <span style={{ fontWeight: 600, color: "#3D6B41" }}>{pct}%</span>
                </div>
                <div style={{ height: 8, backgroundColor: "#F5F3EE", borderRadius: 4, overflow: "hidden", border: "1px solid #E2DCC8" }}>
                  <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#3D6B41", borderRadius: 4, transition: "width 0.4s" }} />
                </div>
              </div>

              {/* Area chart */}
              <div style={{ marginTop: 16 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={resultadoIF.projecao}>
                    <defs>
                      <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2A4F6A" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2A4F6A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="idade" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => formatCurrency(v as number)}
                      labelFormatter={(l) => `Idade ${l}`}
                    />
                    <ReferenceLine
                      y={resultadoIF.patrimonioNecessario}
                      stroke="#7A3535"
                      strokeDasharray="4 4"
                      label={{ value: "Meta", position: "right", fontSize: 10, fill: "#7A3535" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="patrimonio"
                      stroke="#2A4F6A"
                      fill="url(#gradIF)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* IF status badge */}
              <div style={{ marginTop: 12 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 14px",
                    borderRadius: 999,
                    backgroundColor: resultadoIF.liberdadeAlcancada ? "#EBF2EC" : "#F9ECEC",
                    color: resultadoIF.liberdadeAlcancada ? "#3D6B41" : "#7A3535",
                    border: `1px solid ${resultadoIF.liberdadeAlcancada ? "#3D6B41" : "#7A3535"}`,
                  }}
                >
                  {resultadoIF.liberdadeAlcancada ? "✓ Liberdade financeira alcançada" : "✗ Liberdade financeira não alcançada"}
                </span>
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ textAlign: "center", padding: "32px 24px", backgroundColor: "#F5F3EE", borderRadius: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#6B6347", margin: "0 0 6px" }}>
                Simulador de IF não executado
              </p>
              <p style={{ fontSize: 13, color: "#8A7A45", margin: 0 }}>
                {p.idadeAtual} → {p.idadeMeta} anos · {formatCurrency(p.patrimonioAtual)} atual
              </p>
              <button
                onClick={() => setModalOpen(true)}
                style={{ marginTop: 12, fontSize: 13, padding: "8px 18px", borderRadius: 6, backgroundColor: "#3D6B41", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Abrir simulador de IF →
              </button>
            </div>
          )}
        </div>

        {/* Card 2 — Comment */}
        <div style={{ ...CARD, borderTop: "3px solid #000000" }}>
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
                border: "1px solid #E2DCC8",
                fontSize: 13,
                color: "#000000",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9E9070" }}>
              {comentario.length} caracteres
            </span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6B6347", marginRight: 4 }}>Tags:</span>
            {AVAILABLE_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: "1px solid #E2DCC8",
                  backgroundColor: tags.includes(t) ? "#000000" : "transparent",
                  color: tags.includes(t) ? "white" : "#3D3520",
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
          planejamentoIF={plan.planejamentoIF}
          onSave={(params, _objetivos, result) => {
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
