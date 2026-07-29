import { DOC } from "@/lib/documentoStyles";

interface Props {
  nomeCliente: string;
}

export function RodapePaginaDiag({ nomeCliente }: Props) {
  return (
    <div style={{ borderTop: `1px solid ${DOC.linha}`, paddingTop: 10, display: "flex", alignItems: "center" }}>
      <span style={{ fontSize: 10, color: DOC.hint }}>
        Diagnóstico Financeiro · {nomeCliente}
      </span>
    </div>
  );
}
