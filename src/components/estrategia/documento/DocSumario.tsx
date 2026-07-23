import { DOC } from "@/lib/documentoStyles";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  /** Capítulos exibidos, na ordem do documento (seções desmarcadas no modal
   *  de geração ficam de fora; a numeração se ajusta automaticamente) */
  capitulos: readonly string[];
}

export function DocSumario({ nomeCliente, capitulos }: Props) {
  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Sumário" />

      <div style={{ marginTop: 14 }}>
        {capitulos.map((label, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 0",
              borderBottom: `0.5px solid ${DOC.linhaSoft}`,
              gap: 18,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: DOC.blue,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 12.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <span style={{ flex: 1, fontSize: 14, color: DOC.ink, fontWeight: 500 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </PaginaDoc>
  );
}
