import { useState } from "react";
import { DOC } from "@/lib/documentoStyles";

interface Props {
  clientId: string;
  /** Sufixo da chave de armazenamento (lf, aa, ps, fiscal...) */
  secao: string;
}

/**
 * Callout "Observações do Consultor". Na tela é um textarea editável
 * (persistido em localStorage); na impressão vira o bloco de texto da
 * referência. Se vazio, some do PDF (classe doc-vazio-no-print).
 */
export function CalloutConsultor({ clientId, secao }: Props) {
  const storKey = `doc_coment_${clientId}_${secao}`;
  const [valor, setValor] = useState(() => {
    try { return localStorage.getItem(storKey) ?? ""; } catch { return ""; }
  });

  const update = (v: string) => {
    setValor(v);
    try { localStorage.setItem(storKey, v); } catch { /**/ }
  };

  const vazio = valor.trim().length === 0;

  return (
    <div
      className={vazio ? "doc-vazio-no-print" : undefined}
      style={{
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderLeft: "4px solid #F59E0B",
        borderRadius: 8,
        padding: "13px 18px",
        marginTop: 18,
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: DOC.ambar,
          margin: "0 0 7px",
        }}
      >
        Observações do Consultor
      </p>

      {/* Tela: editável */}
      <textarea
        className="doc-screen-only"
        value={valor}
        onChange={(e) => update(e.target.value)}
        placeholder="Adicione observações personalizadas para o cliente..."
        style={{
          width: "100%",
          minHeight: 64,
          padding: "6px 8px",
          border: "1px solid #FDE68A",
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.7,
          color: "#43302B",
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          background: "white",
        }}
      />

      {/* Impressão: texto puro */}
      <div
        className="doc-print-only"
        style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.75, color: "#43302B" }}
      >
        {valor}
      </div>
    </div>
  );
}
