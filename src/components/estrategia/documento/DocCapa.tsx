import { PaginaDoc } from "./PaginaDoc";
import { MarcaSimpla } from "./MarcaSimpla";

interface Props {
  nomeCliente: string;
  dataEstrategia: string;
  nomeConsultor: string;
}

const LABEL_CAPA = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: "rgba(178,203,255,0.85)",
  fontWeight: 500,
  margin: 0,
};

export function DocCapa({ nomeCliente, dataEstrategia, nomeConsultor }: Props) {
  return (
    <PaginaDoc escura paddingConteudo="16mm 18mm 12mm">
      <MarcaSimpla />

      {/* Bloco central */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ ...LABEL_CAPA, marginBottom: 18 }}>Financial Planning</p>

        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            margin: 0,
            maxWidth: "150mm",
          }}
        >
          {nomeCliente}
        </h1>

        <div
          style={{
            width: 52,
            height: 3.5,
            background: "#3B82F6",
            borderRadius: 2,
            margin: "34px 0 30px",
          }}
        />

        <div style={{ display: "flex", gap: "48mm" }}>
          <div>
            <p style={{ ...LABEL_CAPA, marginBottom: 8 }}>Data de Elaboração</p>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "white" }}>
              {dataEstrategia}
            </p>
          </div>
          <div>
            <p style={{ ...LABEL_CAPA, marginBottom: 8 }}>Consultor</p>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "white" }}>
              {nomeConsultor}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé da capa */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 12 }}>
        <p style={{ margin: 0, fontSize: 10.5, color: "rgba(226,236,255,0.75)", lineHeight: 1.6 }}>
          Documento confidencial elaborado
          <br />
          exclusivamente para {nomeCliente}
        </p>
      </div>
    </PaginaDoc>
  );
}
