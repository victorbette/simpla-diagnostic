import { DOC } from "@/lib/documentoStyles";

interface Props {
  /** Versão para fundo escuro (texto branco) */
  clara?: boolean;
  tamanho?: number;
}

/** Lockup da marca: diamante + wordmark "Simpla Invest" */
export function MarcaSimpla({ clara = false, tamanho = 30 }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
      <img
        src="/diamond-icon.png"
        alt=""
        aria-hidden="true"
        style={{ height: tamanho * 0.72, objectFit: "contain" }}
      />
      <span
        style={{
          fontSize: tamanho * 0.62,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: clara ? "#F3F7FF" : DOC.navyInk,
          lineHeight: 1,
        }}
      >
        Simpla Invest
      </span>
    </div>
  );
}
