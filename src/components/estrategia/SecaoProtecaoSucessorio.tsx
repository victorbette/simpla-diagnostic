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
        plan={plan}
        resultados={{ seguro: resultadoSeguro }}
        onResultadosChange={(r) => {
          if (r?.seguro) onResultadoSeguro(r.seguro as ResultadoSeguro);
        }}
      />

      {/* Summary card — shown after analysis is saved */}
      {rs && (() => {
        const capitalNecessario  = rs.capitalNecessario || rs.totalNeed || 0;
        const capitalAtual       = rs.capitalAtual || rs.totalCoverage || 0;
        const coberturaPct       = capitalNecessario > 0 ? Math.min(100, Math.round(capitalAtual / capitalNecessario * 100)) : (rs.scoreProtecao || 0);
        const adequado           = capitalAtual >= capitalNecessario && capitalNecessario > 0;
        const imediato           = rs.capitalImediato || rs.immediateTotal || 0;
        const continuo           = rs.capitalContinuo || 0;
        const filhos             = rs.capitalFilhos || rs.educationTotal || 0;
        const familia            = rs.ongoingTotal || 0;
        const saldoPrev          = Math.max(0, familia + filhos - continuo);
        const seguroVidaNec      = imediato + continuo;
        const coberturasVida     = rs.capitalCoberturasVida || (rs.disabilityTotal + rs.criticalIllnessTotal) || 0;

        return (
          <div style={CARD}>
            {/* KPI tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ backgroundColor: "#F8FAFF", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Capital Necessário</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{formatCurrency(capitalNecessario)}</p>
              </div>
              <div style={{ backgroundColor: adequado ? "#F0FDF4" : "#FFF5F5", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Capital Atual</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: adequado ? "#15803D" : "#B91C1C" }}>{formatCurrency(capitalAtual)}</p>
              </div>
              <div style={{ backgroundColor: "#F8FAFF", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Cobertura</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: adequado ? "#15803D" : "#B91C1C" }}>{coberturaPct}%</p>
              </div>
            </div>

            {/* Composição — 2 blocos */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "0 0 10px" }}>
                Composição das Necessidades
              </p>

              {/* Bloco azul — Seguro de Vida */}
              <div style={{ background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-heart" style={{ fontSize: 14, color: "#2563EB" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>Seguro de Vida</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1E40AF" }}>{formatCurrency(seguroVidaNec)}</span>
                </div>
                <div style={{ borderTop: "0.5px solid #DBEAFE", paddingTop: 8, display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
                    <span>Custo de Inventário</span>
                    <span>{formatCurrency(imediato)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
                    <span>Família</span>
                    <span>{formatCurrency(familia)}</span>
                  </div>
                  {filhos > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
                      <span>Educação dos Filhos</span>
                      <span>{formatCurrency(filhos)}</span>
                    </div>
                  )}
                  {saldoPrev > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#15803D" }}>
                      <span>(-) Saldo Previdência</span>
                      <span>-{formatCurrency(saldoPrev)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloco âmbar — Coberturas em Vida */}
              {coberturasVida > 0 && (
                <div style={{ background: "#FFFBEB", border: "0.5px solid #FCD34D", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="ti ti-shield" style={{ fontSize: 14, color: "#B45309" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#B45309" }}>Coberturas em Vida</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#B45309" }}>{formatCurrency(coberturasVida)}</span>
                  </div>
                  <div style={{ borderTop: "0.5px solid #FDE68A", paddingTop: 8, display: "flex", flexDirection: "column" as const, gap: 4 }}>
                    {rs.disabilityTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
                        <span>Invalidez Permanente</span>
                        <span>{formatCurrency(rs.disabilityTotal)}</span>
                      </div>
                    )}
                    {rs.criticalIllnessTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
                        <span>Doenças Graves</span>
                        <span>{formatCurrency(rs.criticalIllnessTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Total geral */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F0F7FF", borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Capital Total Necessário</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#1E3A8A" }}>{formatCurrency(capitalNecessario)}</span>
              </div>
            </div>

            {/* Adequacy indicator */}
            {capitalNecessario > 0 && (
              adequado ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB", borderRadius: 8, padding: "12px 16px" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 18, color: "#15803D", flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#15803D" }}>Cobertura adequada</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#166534" }}>
                      A apólice cobre {coberturaPct}% do capital necessário. Revise periodicamente.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px" }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 18, color: "#B91C1C", flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
                      Gap de {formatCurrency(Math.max(0, capitalNecessario - capitalAtual))}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#991B1B" }}>
                      A cobertura atual ({coberturaPct}%) é insuficiente. Avalie a contratação de seguro adicional.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        );
      })()}

      {commentCard}
    </div>
  );
}
