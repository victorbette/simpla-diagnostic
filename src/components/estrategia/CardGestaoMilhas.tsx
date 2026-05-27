interface Props {
  gastoCartaoMensal: number;
  fazViagensNacionais: boolean;
  viagensNacionaisQtdAnual: number;
  fazViagensInternacionais: boolean;
  viagensInternacionaisQtdAnual: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CardGestaoMilhas({
  gastoCartaoMensal,
  fazViagensNacionais,
  viagensNacionaisQtdAnual,
  fazViagensInternacionais,
  viagensInternacionaisQtdAnual,
}: Props) {
  const temViagens = fazViagensNacionais || fazViagensInternacionais;

  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: 12,
      border: "0.5px solid #BFDBFE",
      borderLeft: "4px solid #2563EB",
      padding: "20px 24px",
      marginTop: 16,
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-plane" style={{ fontSize: 20, color: "#2563EB" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
            Gestão de Milhas Aéreas
          </span>
          <span style={{
            fontSize: 11,
            backgroundColor: "#DBEAFE",
            color: "#1E40AF",
            borderRadius: 9999,
            padding: "2px 8px",
            fontWeight: 600,
          }}>
            Recomendado
          </span>
        </div>
        <span style={{
          fontSize: 11,
          backgroundColor: "#EFF6FF",
          color: "#2563EB",
          border: "1px solid #BFDBFE",
          borderRadius: 9999,
          padding: "2px 8px",
        }}>
          Dados da coleta
        </span>
      </div>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4, marginBottom: 0 }}>
        Oportunidade identificada com base no perfil de gastos e viagens do cliente.
      </p>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#E5E7EB", margin: "14px 0" }} />

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Gasto Mensal */}
        <div style={{ backgroundColor: "#F9FAFB", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #E5E7EB" }}>
          <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
            Gasto Mensal no Cartão
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
            {formatBRL(gastoCartaoMensal)}
          </p>
          <span style={{ fontSize: 11, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 9999, padding: "2px 7px", fontWeight: 600 }}>
            ≥ R$ 25.000
          </span>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Gasto familiar total mensal</p>
        </div>

        {/* Gasto Anual */}
        <div style={{ backgroundColor: "#F9FAFB", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #E5E7EB" }}>
          <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
            Gasto Anual Estimado
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
            {formatBRL(gastoCartaoMensal * 12)}
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Projeção anual</p>
        </div>
      </div>

      {/* Perfil de viagens */}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
          Perfil de Viagens
        </p>
        {temViagens ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {fazViagensNacionais && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF",
                borderRadius: 99, padding: "6px 12px", fontSize: 13, fontWeight: 500,
              }}>
                <i className="ti ti-map-pin" style={{ fontSize: 14, color: "#2563EB" }} />
                Viagens Nacionais
                {viagensNacionaisQtdAnual > 0 && (
                  <span style={{ color: "#2563EB", fontWeight: 700 }}>
                    · {viagensNacionaisQtdAnual}x/ano
                  </span>
                )}
              </span>
            )}
            {fazViagensInternacionais && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF",
                borderRadius: 99, padding: "6px 12px", fontSize: 13, fontWeight: 500,
              }}>
                <i className="ti ti-world" style={{ fontSize: 14, color: "#2563EB" }} />
                Viagens Internacionais
                {viagensInternacionaisQtdAnual > 0 && (
                  <span style={{ color: "#2563EB", fontWeight: 700 }}>
                    · {viagensInternacionaisQtdAnual}x/ano
                  </span>
                )}
              </span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>
            Nenhum perfil de viagens informado na coleta.
          </p>
        )}
      </div>

      {/* Estimativa placeholder */}
      <div style={{
        marginTop: 16,
        backgroundColor: "#F0F7FF",
        borderRadius: 8,
        padding: "14px 16px",
        border: "0.5px dashed #BFDBFE",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <i className="ti ti-calculator" style={{ fontSize: 18, color: "#60A5FA", flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, color: "#6B7280", fontStyle: "italic", margin: 0 }}>
            Cálculo de economia em desenvolvimento
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, marginBottom: 0 }}>
            Em breve: estimativa de economia anual com gestão de milhas aéreas baseada no perfil do cliente.
          </p>
        </div>
      </div>
    </div>
  );
}
