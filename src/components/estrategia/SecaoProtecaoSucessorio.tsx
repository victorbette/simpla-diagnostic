import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaSeguro } from "@/components/ferramentas/FerramentaSeguro";
import type { ResultadoSeguro } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoSeguro: ResultadoSeguro | null;
  onResultadoSeguro: (r: ResultadoSeguro) => void;
}

const AVAILABLE_TAGS = ["Seguro de Vida", "Invalidez", "ITCMD", "Testamento"];

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

// ── Horizontal bar ─────────────────────────────────────────────────────────────

function NeedBar({ label, need, coverage, total }: { label: string; need: number; coverage: number; total: number }) {
  const t = total || 1;
  const needPct = Math.min(100, (need / t) * 100);
  const covPct = Math.min(needPct, (coverage / t) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "#6B7280" }}>{label}</span>
        <span style={{ fontWeight: 600, color: "#000000" }}>{formatCurrency(need)}</span>
      </div>
      <div style={{ height: 8, backgroundColor: "#F0F7FF", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${needPct}%`, backgroundColor: "#BFDBFE", borderRadius: 4 }} />
        <div style={{
          position: "absolute", top: 0, left: 0,
          height: "100%", width: `${covPct}%`,
          backgroundColor: covPct >= needPct - 1 ? "#15803D" : "#3B82F6",
          borderRadius: 4,
        }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SecaoProtecaoSucessorio({
  plan,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoSeguro,
  onResultadoSeguro,
}: Props) {
  const rs = resultadoSeguro;
  const pieCoverage = rs
    ? [
        { name: "Coberto", value: rs.totalCoverage, color: "#15803D" },
        { name: "Gap", value: rs.gap, color: "#B91C1C" },
      ].filter((d) => d.value > 0)
    : [];

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  const commentCard = (
    <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Estratégia e Recomendações
      </p>
      <div style={{ position: "relative" }}>
        <textarea
          value={comentario}
          onChange={(e) => onComentarioChange(e.target.value)}
          placeholder="Ex: Identificamos lacuna de cobertura em seguro de vida. Recomendamos ampliar a apólice e estruturar planejamento sucessório..."
          style={{
            width: "100%",
            minHeight: 160,
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
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
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
  );

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* FerramentaSeguro inline */}
      <FerramentaSeguro
        clientId={plan.clientId}
        protecao={plan.protecao}
        dadosCliente={plan.dadosCliente}
        onSave={(insuranceData, result) => {
          const score = result.totalNeed > 0
            ? Math.round(Math.min(100, (result.totalCoverage / result.totalNeed) * 100))
            : 100;
          onResultadoSeguro({
            totalNeed: result.totalNeed,
            totalCoverage: result.totalCoverage,
            gap: result.gap,
            scoreProtecao: score,
            temSeguroVida: insuranceData.policies.length > 0,
            temSeguroInvalidez: insuranceData.livingPolicies.some((p) => p.type === "disability"),
            immediateTotal: result.immediateTotal,
            ongoingTotal: result.ongoingTotal,
            educationTotal: result.educationTotal,
            lifestyleTotal: result.lifestyleTotal,
            inventoryCost: result.inventoryCost,
            disabilityTotal: result.disabilityTotal,
            disabilityGap: result.disabilityGap,
            disabilityCoverage: result.disabilityCoverage,
            criticalIllnessTotal: result.criticalIllnessTotal,
            criticalIllnessGap: result.criticalIllnessGap,
            criticalIllnessCoverage: result.criticalIllnessCoverage,
            dataCalculo: new Date().toISOString(),
            savedAt: new Date().toISOString(),
          });
        }}
      />

      {/* Summary cards — shown after analysis is saved */}
      {rs && (
        <>
          {/* Card 2 — Donut + breakdown */}
          <div style={CARD}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Composição das Necessidades
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "center" }}>
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieCoverage}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      strokeWidth={2}
                      stroke="white"
                    >
                      {pieCoverage.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {pieCoverage.map((d) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6B7280" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
                      {d.name}: {formatCurrency(d.value)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 12px" }}>
                  Necessidades vs Cobertura
                </p>
                <NeedBar
                  label="Necessidades imediatas"
                  need={rs.immediateTotal}
                  coverage={rs.totalCoverage > rs.ongoingTotal ? rs.totalCoverage - rs.ongoingTotal : 0}
                  total={rs.totalNeed}
                />
                <NeedBar
                  label="Necessidades contínuas"
                  need={rs.ongoingTotal}
                  coverage={rs.totalCoverage > rs.immediateTotal ? rs.totalCoverage - rs.immediateTotal : 0}
                  total={rs.totalNeed}
                />
                {rs.immediateTotal > 0 && (
                  <div style={{ marginTop: 8, padding: "8px 12px", backgroundColor: "#F0F7FF", borderRadius: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: "#6B7280" }}>↳ Custo de inventário</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(rs.inventoryCost)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#6B7280" }}>↳ Educação dos filhos</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(rs.educationTotal)}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280" }}>
                    <span style={{ width: 10, height: 6, borderRadius: 2, backgroundColor: "#15803D" }} />
                    Coberto
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280" }}>
                    <span style={{ width: 10, height: 6, borderRadius: 2, backgroundColor: "#3B82F6" }} />
                    Parcial
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280" }}>
                    <span style={{ width: 10, height: 6, borderRadius: 2, backgroundColor: "#BFDBFE" }} />
                    Necessário
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Coberturas em vida */}
          {(rs.disabilityTotal > 0 || rs.criticalIllnessTotal > 0) && (
            <div style={CARD}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Coberturas em Vida
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {rs.disabilityTotal > 0 && (
                  <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", margin: "0 0 10px" }}>
                      Invalidez
                    </p>
                    {[
                      { label: "Necessário", value: rs.disabilityTotal, color: "#000000" },
                      { label: "Coberto", value: rs.disabilityCoverage, color: "#15803D" },
                      { label: "Gap", value: rs.disabilityGap, color: rs.disabilityGap > 0 ? "#B91C1C" : "#15803D" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#6B7280" }}>{label}</span>
                        <span style={{ fontWeight: 600, color }}>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, height: 6, backgroundColor: "#BFDBFE", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${rs.disabilityTotal > 0 ? Math.min(100, (rs.disabilityCoverage / rs.disabilityTotal) * 100) : 0}%`,
                          backgroundColor: rs.disabilityGap > 0 ? "#3B82F6" : "#15803D",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                )}

                {rs.criticalIllnessTotal > 0 && (
                  <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", margin: "0 0 10px" }}>
                      Doença Grave
                    </p>
                    {[
                      { label: "Necessário", value: rs.criticalIllnessTotal, color: "#000000" },
                      { label: "Coberto", value: rs.criticalIllnessCoverage, color: "#15803D" },
                      { label: "Gap", value: rs.criticalIllnessGap, color: rs.criticalIllnessGap > 0 ? "#B91C1C" : "#15803D" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#6B7280" }}>{label}</span>
                        <span style={{ fontWeight: 600, color }}>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, height: 6, backgroundColor: "#BFDBFE", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${rs.criticalIllnessTotal > 0 ? Math.min(100, (rs.criticalIllnessCoverage / rs.criticalIllnessTotal) * 100) : 0}%`,
                          backgroundColor: rs.criticalIllnessGap > 0 ? "#3B82F6" : "#15803D",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {commentCard}
    </div>
  );
}
