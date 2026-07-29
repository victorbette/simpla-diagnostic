import { type ReactNode } from "react";
import { DOC, TITULO_SECAO } from "@/lib/documentoStyles";

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Badge opcional exibido ao lado do título (ex.: nível de score da área) */
  badgeNode?: ReactNode;
}

/** Cabeçalho padrão das páginas de conteúdo: título navy + "SIMPLA INVEST" + régua */
export function HeaderSecao({ titulo, subtitulo, badgeNode }: Props) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={TITULO_SECAO}>{titulo}</h2>
          {badgeNode}
        </div>
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: "0.24em",
            color: DOC.hint,
            fontWeight: 500,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Simpla Invest
        </span>
      </div>
      {subtitulo && (
        <p style={{ margin: "5px 0 0", fontSize: 11.5, color: DOC.muted }}>{subtitulo}</p>
      )}
      <div style={{ height: 2.5, background: DOC.navy, marginTop: 12, borderRadius: 2 }} />
    </div>
  );
}
