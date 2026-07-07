import type { InfoSeguroRC } from "@/lib/seguroRC";

interface Props {
  info: InfoSeguroRC;
}

export function CardSeguroRC({ info }: Props) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        border: "0.5px solid #E5E7EB",
        padding: "20px 24px",
        marginTop: 16,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#FEE2E2",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className={`ti ${info.icone}`} style={{ fontSize: 20, color: "#B91C1C" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
              Seguro de Responsabilidade Civil
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 9999,
                background: "#FEE2E2",
                color: "#B91C1C",
              }}
            >
              Recomendado
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 9999,
            background: "#EFF6FF",
            color: "#1E40AF",
          }}
        >
          {info.categoria}
        </span>
      </div>

      {/* Subtítulo */}
      <p style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 0" }}>{info.titulo}</p>

      {/* Divider */}
      <div style={{ height: 1, background: "#F0F7FF", margin: "16px 0" }} />

      {/* Descrição */}
      <div
        style={{
          background: "#FFF5F5",
          borderRadius: 8,
          padding: "14px 16px",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          {info.descricao}
        </p>
      </div>

      {/* Nota informativa */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16 }}>
        <i className="ti ti-info-circle" style={{ fontSize: 16, color: "#60A5FA", flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
          O Seguro de Responsabilidade Civil Profissional protege o patrimônio pessoal em caso de
          ações judiciais decorrentes do exercício da profissão. Recomendamos avaliar as coberturas
          disponíveis no mercado com base no volume de atendimentos e exposição ao risco.
        </p>
      </div>
    </div>
  );
}
