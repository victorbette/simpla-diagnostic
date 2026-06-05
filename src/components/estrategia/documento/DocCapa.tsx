import { PAGINA } from "@/lib/documentoStyles";

interface Props {
  nomeCliente: string;
  dataEstrategia: string;
}

export function DocCapa({ nomeCliente, dataEstrategia }: Props) {
  return (
    <div style={{ ...PAGINA, display: "flex", flexDirection: "column" }} className="doc-pagina">
      {/* Topo colorido — sangra até a borda da página */}
      <div
        style={{
          background: "#1E3A8A",
          margin: "-64px -72px 0",
          padding: "64px 72px 48px",
          marginBottom: 48,
        }}
      >
        <img src="/logo-si.svg" height={52} alt="Simpla Invest" style={{ objectFit: "contain" }} />
        <div
          style={{
            color: "#93C5FD",
            fontSize: 11,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginTop: 16,
            fontWeight: 500,
          }}
        >
          Financial Planning
        </div>
      </div>

      {/* Corpo */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: 48,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#9CA3AF",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Estratégia Inicial
        </div>

        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.15,
            marginBottom: 8,
          }}
        >
          {nomeCliente}
        </div>

        <div
          style={{
            width: 48,
            height: 3,
            background: "#2563EB",
            borderRadius: 2,
            margin: "20px 0",
          }}
        />

        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
          Início do acompanhamento
        </div>
        <div style={{ fontSize: 15, color: "#111827", fontWeight: 500 }}>
          {dataEstrategia}
        </div>
      </div>

      {/* Rodapé da capa */}
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 72,
          right: 72,
          borderTop: "0.5px solid #E5E7EB",
          paddingTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>
          Documento confidencial · Uso exclusivo do cliente
        </span>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>simpla.invest</span>
      </div>
    </div>
  );
}
