import type { ResultadoSeguro } from "@/types/estrategiaResultados";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  resultadoSeguro: ResultadoSeguro | null;
}

export function AcompProtecao({ resultadoSeguro }: Props) {
  if (!resultadoSeguro) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
        <i className="ti ti-shield-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
        Dados de proteção não disponíveis.<br />
        Complete a análise no Financial Planning primeiro.
      </div>
    );
  }

  const {
    totalNeed, totalCoverage, gap,
    scoreProtecao, temSeguroVida, temSeguroInvalidez,
    immediateTotal, ongoingTotal, educationTotal, lifestyleTotal, inventoryCost,
    disabilityTotal, disabilityGap, disabilityCoverage,
    criticalIllnessTotal, criticalIllnessGap, criticalIllnessCoverage,
  } = resultadoSeguro;

  const scoreColor = scoreProtecao >= 80 ? "#15803D" : scoreProtecao >= 50 ? "#B45309" : "#B91C1C";
  const scoreBg    = scoreProtecao >= 80 ? "#DCFCE7" : scoreProtecao >= 50 ? "#FEF3C7" : "#FEE2E2";
  const scoreBorder = scoreProtecao >= 80 ? "#A7C9AB" : scoreProtecao >= 50 ? "#FCD34D" : "#FCA5A5";

  const coberturaPercent = totalNeed > 0 ? Math.min(100, (totalCoverage / totalNeed) * 100) : 0;

  const needBreakdown = [
    { label: "Necessidades imediatas",  value: immediateTotal },
    { label: "Renda contínua",          value: ongoingTotal },
    { label: "Educação",                value: educationTotal },
    { label: "Estilo de vida",          value: lifestyleTotal },
    { label: "Inventário e custos",     value: inventoryCost },
  ];

  const coberturasAdicionais = [
    { label: "Invalidez",               necessidade: disabilityTotal,      cobertura: disabilityCoverage,      gap: disabilityGap },
    { label: "Doença grave",            necessidade: criticalIllnessTotal,  cobertura: criticalIllnessCoverage,  gap: criticalIllnessGap },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Score + status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div style={{
          backgroundColor: scoreBg, border: `1px solid ${scoreBorder}`,
          borderRadius: 12, padding: "20px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Score de Proteção</p>
          <p style={{ margin: 0, fontSize: 44, fontWeight: 800, color: scoreColor }}>{scoreProtecao}</p>
          <p style={{ margin: 0, fontSize: 12, color: scoreColor, fontWeight: 600 }}>
            {scoreProtecao >= 80 ? "Bem protegido" : scoreProtecao >= 50 ? "Proteção parcial" : "Proteção insuficiente"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Necessidade total",  value: formatBRL(totalNeed),     color: "#111827", top: "#6B7280" },
              { label: "Cobertura atual",    value: formatBRL(totalCoverage),  color: "#15803D", top: "#15803D" },
              { label: "Gap identificado",   value: formatBRL(gap),            color: gap > 0 ? "#B91C1C" : "#15803D", top: gap > 0 ? "#B91C1C" : "#15803D" },
              { label: "Cobertura",          value: `${coberturaPercent.toFixed(0)}%`,  color: scoreColor, top: scoreColor },
            ].map(({ label, value, color, top }) => (
              <div key={label} style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderTop: `3px solid ${top}`, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coverage bar */}
      <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Cobertura de Vida</span>
          <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#15803D" }}>
              <i className="ti ti-shield-check" style={{ marginRight: 4 }} />
              {temSeguroVida ? "Tem seguro de vida" : "Sem seguro de vida"}
            </span>
            <span style={{ color: temSeguroInvalidez ? "#15803D" : "#B91C1C" }}>
              <i className={`ti ${temSeguroInvalidez ? "ti-shield-check" : "ti-shield-x"}`} style={{ marginRight: 4 }} />
              {temSeguroInvalidez ? "Tem seguro de invalidez" : "Sem seguro de invalidez"}
            </span>
          </div>
        </div>
        <div style={{ height: 10, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
          <div style={{
            height: "100%", width: `${coberturaPercent}%`,
            background: scoreColor, borderRadius: 99, transition: "width 600ms ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
          <span>{formatBRL(totalCoverage)} cobertos</span>
          <span>{formatBRL(totalNeed)} necessários</span>
        </div>
      </div>

      {/* Need breakdown */}
      <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>Composição da Necessidade</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {needBreakdown.filter((n) => n.value > 0).map(({ label, value }) => {
            const pct = totalNeed > 0 ? (value / totalNeed) * 100 : 0;
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginBottom: 4 }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 500 }}>{formatBRL(value)} <span style={{ color: "#9CA3AF" }}>({pct.toFixed(0)}%)</span></span>
                </div>
                <div style={{ height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#1E3A8A", borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional coverages */}
      {coberturasAdicionais.some((c) => c.necessidade > 0) && (
        <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "8px 16px", backgroundColor: "#1E3A8A" }}>
            {["Cobertura Adicional", "Necessidade", "Cobertura Atual", "Gap"].map((h) => (
              <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
            ))}
          </div>
          {coberturasAdicionais.filter((c) => c.necessidade > 0).map(({ label, necessidade, cobertura, gap: g }) => (
            <div
              key={label}
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "10px 16px", borderTop: "1px solid #F3F4F6", alignItems: "center" }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(necessidade)}</span>
              <span style={{ fontSize: 12, color: "#15803D" }}>{formatBRL(cobertura)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: g > 0 ? "#B91C1C" : "#15803D" }}>
                {g > 0 ? formatBRL(g) : "✓"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
