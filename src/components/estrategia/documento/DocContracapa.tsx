import { PaginaDoc } from "./PaginaDoc";
import { MarcaSimpla } from "./MarcaSimpla";

/** Contracapa — página final escura só com a marca centralizada (referência v5 p.22) */
export function DocContracapa() {
  return (
    <PaginaDoc escura paddingConteudo="0">
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MarcaSimpla largura={330} />
      </div>
    </PaginaDoc>
  );
}
