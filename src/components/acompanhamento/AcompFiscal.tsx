import type { ResultadoFiscal } from "@/types/estrategiaResultados";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  resultadoFiscal: ResultadoFiscal | null;
}

export function AcompFiscal({ resultadoFiscal }: Props) {
  if (!resultadoFiscal) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
        <i className="ti ti-receipt-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
        Dados fiscais não disponíveis.<br />
        Complete a análise no Financial Planning primeiro.
      </div>
    );
  }

  const {
    rendaAnual, tetoPGBLAnual, aporteAnual,
    irComPGBL, irSemPGBL, economiaAnual,
    espacoDisponivelMensal, aproveitandoTeto,
  } = resultadoFiscal;

  const aproveitamentoPct = tetoPGBLAnual > 0
    ? Math.min(100, (aporteAnual / tetoPGBLAnual) * 100)
    : 0;

  const metricas = [
    { label: "Renda Anual",         value: formatBRL(rendaAnual),           color: "#111827", top: "#1E3A8A" },
    { label: "Teto PGBL (12%)",     value: formatBRL(tetoPGBLAnual),        color: "#6B7280", top: "#6B7280" },
    { label: "Aporte PGBL Anual",   value: formatBRL(aporteAnual),          color: "#1E40AF", top: "#1E40AF" },
    { label: "Economia Fiscal",     value: formatBRL(economiaAnual),        color: "#15803D", top: "#15803D" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Status banner */}
      <div style={{
        backgroundColor: aproveitandoTeto ? "#DCFCE7" : "#FEF3C7",
        border: `1px solid ${aproveitandoTeto ? "#A7C9AB" : "#FCD34D"}`,
        borderRadius: 12, padding: "16px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <i
          className={`ti ${aproveitandoTeto ? "ti-circle-check" : "ti-alert-triangle"}`}
          style={{ fontSize: 32, color: aproveitandoTeto ? "#15803D" : "#B45309", flexShrink: 0 }}
        />
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: aproveitandoTeto ? "#15803D" : "#B45309" }}>
            {aproveitandoTeto
              ? "Teto do PGBL aproveitado integralmente"
              : "Espaço disponível no PGBL não utilizado"
            }
          </p>
          {!aproveitandoTeto && espacoDisponivelMensal > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
              Pode aportar mais {formatBRL(espacoDisponivelMensal)}/mês no PGBL para maximizar o benefício fiscal
            </p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {metricas.map(({ label, value, color, top }) => (
          <div key={label} style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderTop: `3px solid ${top}`, borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* IR comparison */}
      <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>Comparativo de IR</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #FEE2E2", borderRadius: 10, padding: 16, backgroundColor: "#FFF5F5" }}>
            <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>Sem PGBL</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{formatBRL(irSemPGBL)}</p>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0" }}>IR a pagar no ano</p>
          </div>
          <div style={{ border: "1px solid #D1FAE5", borderRadius: 10, padding: 16, backgroundColor: "#F0FDF4" }}>
            <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>Com PGBL</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(irComPGBL)}</p>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0" }}>IR a pagar no ano</p>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", backgroundColor: "#EFF6FF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 500 }}>Economia fiscal anual com PGBL</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#15803D" }}>{formatBRL(economiaAnual)}</span>
        </div>
      </div>

      {/* PGBL usage bar */}
      {tetoPGBLAnual > 0 && (
        <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Aproveitamento do Teto PGBL</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: aproveitandoTeto ? "#15803D" : "#B45309" }}>
              {aproveitamentoPct.toFixed(0)}%
            </span>
          </div>
          <div style={{ height: 10, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
            <div style={{
              height: "100%", width: `${aproveitamentoPct}%`,
              background: aproveitandoTeto ? "#15803D" : "#F59E0B",
              borderRadius: 99, transition: "width 600ms ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
            <span>{formatBRL(aporteAnual)}/ano aportados</span>
            <span>Teto: {formatBRL(tetoPGBLAnual)}/ano</span>
          </div>
          {!aproveitandoTeto && espacoDisponivelMensal > 0 && (
            <div style={{ marginTop: 12, padding: "8px 12px", backgroundColor: "#FEF3C7", border: "0.5px solid #FCD34D", borderRadius: 6, fontSize: 12, color: "#B45309" }}>
              <i className="ti ti-bulb" style={{ marginRight: 6 }} />
              Aportando mais {formatBRL(espacoDisponivelMensal)}/mês você economizaria {formatBRL(economiaAnual > 0 ? economiaAnual : (tetoPGBLAnual - aporteAnual) * 0.275)} adicionais de IR por ano.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
