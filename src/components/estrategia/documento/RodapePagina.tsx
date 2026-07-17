import { DOC } from "@/lib/documentoStyles";

interface Props {
  nomeCliente: string;
}

/** Rodapé em fluxo das páginas de conteúdo (renderizado via prop `rodape` do PaginaDoc) */
export function RodapePagina({ nomeCliente }: Props) {
  return (
    <div
      style={{
        borderTop: `1px solid ${DOC.linha}`,
        paddingTop: 10,
        display: "flex",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 10, color: DOC.hint }}>
        Financial Planning · {nomeCliente}
      </span>
    </div>
  );
}
