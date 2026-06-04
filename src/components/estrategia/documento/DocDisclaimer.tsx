import { RodapePagina } from "./RodapePagina";

interface Props {
  clientName: string;
}

const NOTAS = [
  {
    icon: "ti-calendar",
    title: "Vigência",
    text: "Este documento tem validade de 12 meses a partir da data de elaboração. Revisões podem ser solicitadas a qualquer momento junto ao consultor responsável.",
  },
  {
    icon: "ti-lock",
    title: "Confidencialidade",
    text: "Este relatório é estritamente confidencial e destinado exclusivamente ao cliente identificado na capa. Sua reprodução é proibida sem autorização prévia.",
  },
  {
    icon: "ti-chart-bar",
    title: "Premissas",
    text: "As projeções utilizam taxas de juros e inflação baseadas em estimativas correntes de mercado. Resultados passados não garantem retornos futuros.",
  },
  {
    icon: "ti-alert-triangle",
    title: "Aviso Regulatório",
    text: "As recomendações deste documento não constituem oferta ou solicitação de compra e venda de ativos. Consulte sempre um profissional habilitado.",
  },
];

export function DocDisclaimer({ clientName }: Props) {
  const data = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="doc-page page-break-before">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 16,
          borderBottom: "2px solid #1E3A8A",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            background: "#1E3A8A",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0,
          }}
        >
          <i className="ti ti-mail" style={{ fontSize: 22 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>
            Carta ao Cliente
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{data}</p>
        </div>
      </div>

      {/* Letter body */}
      <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.8, marginBottom: 20 }}>
        Prezado(a){" "}
        <strong style={{ color: "#1E3A8A" }}>{clientName}</strong>,
      </p>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.85, marginBottom: 18 }}>
        É com grande satisfação que apresentamos seu{" "}
        <strong>Planejamento Financeiro Estratégico</strong> — um documento elaborado
        exclusivamente para você, com base nas informações compartilhadas e nos seus objetivos
        de vida.
      </p>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.85, marginBottom: 18 }}>
        Ao longo deste relatório, você encontrará análises detalhadas de quatro grandes pilares
        da vida financeira:{" "}
        <strong>Liberdade Financeira</strong>,{" "}
        <strong>Asset Allocation</strong>,{" "}
        <strong>Proteção e Sucessório</strong> e{" "}
        <strong>Planejamento Fiscal</strong>. Cada seção apresenta um diagnóstico preciso da
        sua situação atual e recomendações concretas para alcançar seus objetivos.
      </p>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.85, marginBottom: 36 }}>
        Este planejamento é o início de uma jornada de longo prazo. Estamos aqui para
        guiá-lo a cada passo, ajustando a estratégia conforme sua vida evolui. Conte conosco.
      </p>

      {/* Notes grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 48,
        }}
      >
        {NOTAS.map((n) => (
          <div
            key={n.title}
            style={{
              background: "#F8FAFF",
              border: "0.5px solid #BFDBFE",
              borderRadius: 10,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <i className={`ti ${n.icon}`} style={{ fontSize: 16, color: "#2563EB" }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1E3A8A" }}>
                {n.title}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#6B7280", lineHeight: 1.65 }}>
              {n.text}
            </p>
          </div>
        ))}
      </div>

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "center", minWidth: 220 }}>
          <div
            style={{
              width: "100%",
              height: 1,
              background: "#374151",
              marginBottom: 10,
            }}
          />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>
            Simpla Invest
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6B7280" }}>
            Consultor Financeiro · CFP®
          </p>
        </div>
      </div>

      <RodapePagina pagina={2} clientName={clientName} />
    </div>
  );
}
