import { DOC } from "@/lib/documentoStyles";
import { ITENS_SUMARIO, PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
}

export function DocSumario({ nomeCliente }: Props) {
  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.sumario} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Sumário" />

      <div style={{ marginTop: 24 }}>
        {ITENS_SUMARIO.map((item) => (
          <div
            key={item.numero}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "15px 0",
              borderBottom: `1px solid ${DOC.linhaSoft}`,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: item.preConteudo ? DOC.navyInk : DOC.blue,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {item.numero}
            </div>

            <span style={{ fontSize: 14, fontWeight: 500, color: DOC.ink, whiteSpace: "nowrap" }}>
              {item.label}
            </span>

            <div style={{ flex: 1, borderBottom: `1px solid ${DOC.linha}` }} />

            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: DOC.texto,
                fontVariantNumeric: "tabular-nums",
                minWidth: 22,
                textAlign: "right",
              }}
            >
              {item.pagina}
            </span>
          </div>
        ))}
      </div>
    </PaginaDoc>
  );
}
