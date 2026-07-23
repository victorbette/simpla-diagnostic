import { PaginaDoc } from "./PaginaDoc";
import { MarcaSimpla } from "./MarcaSimpla";

interface Props {
  titulo: string;
  nomeCliente: string;
}

/** Página divisória de seção — full-bleed navy com o título centralizado */
export function DivisoriaSecao({ titulo, nomeCliente }: Props) {
  return (
    <PaginaDoc escura paddingConteudo="16mm 18mm 12mm">
      <MarcaSimpla />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2
          style={{
            color: "white",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {titulo}
        </h2>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.18)",
          paddingTop: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 10.5, color: "rgba(226,236,255,0.75)", lineHeight: 1.6 }}>
          Documento confidencial elaborado
          <br />
          exclusivamente para {nomeCliente}
        </p>
      </div>
    </PaginaDoc>
  );
}
