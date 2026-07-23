import { useEffect, useState } from "react";
import { DOC } from "@/lib/documentoStyles";
import type { BlocoDoc } from "./PaginaDocFluida";

/* O mesmo comentário é renderizado em várias instâncias (editor da página +
 * medidor da paginação fluida); este evento propaga a digitação entre elas
 * para a medição de altura acompanhar o texto em tempo real. */
const EVENTO_SYNC = "doc-coment-sync";

function chaveNota(clientId: string, secao: string) {
  return `doc_coment_${clientId}_${secao}`;
}

/** Leitura reativa da observação do consultor (persistida em localStorage).
 *  Re-renderiza quem a usa sempre que o texto muda em qualquer instância. */
export function useNotaConsultor(clientId: string, secao: string): string {
  const storKey = chaveNota(clientId, secao);
  const [valor, setValor] = useState(() => {
    try { return localStorage.getItem(storKey) ?? ""; } catch { return ""; }
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const det = (e as CustomEvent<{ key: string; value: string }>).detail;
      if (det?.key === storKey) setValor(det.value);
    };
    window.addEventListener(EVENTO_SYNC, handler);
    return () => window.removeEventListener(EVENTO_SYNC, handler);
  }, [storKey]);
  return valor;
}

function salvarNota(clientId: string, secao: string, valor: string) {
  const storKey = chaveNota(clientId, secao);
  try { localStorage.setItem(storKey, valor); } catch { /**/ }
  window.dispatchEvent(new CustomEvent(EVENTO_SYNC, { detail: { key: storKey, value: valor } }));
}

const BORDA = "1px solid #FDE68A";
const AMBAR_BG = "#FFFBEB";

const LABEL_NOTA = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: DOC.ambar,
  margin: "0 0 7px",
} as const;

/** Editor da observação — só na tela (na impressão são os parágrafos abaixo). */
function NotaEditorTela({ clientId, secao, valor }: { clientId: string; secao: string; valor: string }) {
  return (
    <div
      className="doc-screen-only"
      style={{
        background: AMBAR_BG,
        border: BORDA,
        borderLeft: "4px solid #F59E0B",
        borderRadius: 8,
        padding: "13px 18px",
        marginTop: 18,
        boxSizing: "border-box",
      }}
    >
      <p style={LABEL_NOTA}>Observações do Consultor</p>
      <textarea
        value={valor}
        onChange={(e) => salvarNota(clientId, secao, e.target.value)}
        placeholder="Adicione observações personalizadas para o cliente..."
        style={{
          width: "100%",
          minHeight: 64,
          padding: "6px 8px",
          border: BORDA,
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
    </div>
  );
}

/** Fragmento (parágrafo) da observação na impressão — caixa âmbar própria,
 *  para que uma observação longa flua por várias folhas sem cortar. */
function NotaParagrafoPrint({ texto, primeiro }: { texto: string; primeiro: boolean }) {
  return (
    <div
      className="doc-print-only"
      style={{
        background: AMBAR_BG,
        border: BORDA,
        borderLeft: "4px solid #F59E0B",
        borderRadius: 8,
        padding: "12px 18px",
        marginTop: primeiro ? 18 : 6,
        boxSizing: "border-box",
      }}
    >
      {primeiro && <p style={LABEL_NOTA}>Observações do Consultor</p>}
      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.75, color: "#43302B" }}>
        {texto}
      </p>
    </div>
  );
}

/** Divide a observação em parágrafos (por quebra de linha), descartando vazios. */
function paragrafos(nota: string): string[] {
  return nota
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Blocos da observação do consultor para a paginação fluida (PaginaDocFluida):
 * um editor (só tela) + um bloco por parágrafo (só impressão). Como cada
 * parágrafo é um bloco independente, o texto excedente flui para as folhas
 * seguintes em vez de ser cortado.
 */
export function blocosNotaConsultor(clientId: string, secao: string, nota: string): BlocoDoc[] {
  const blocos: BlocoDoc[] = [
    {
      chave: `nota-${secao}-editor`,
      node: <NotaEditorTela clientId={clientId} secao={secao} valor={nota} />,
    },
  ];
  paragrafos(nota).forEach((texto, i) => {
    blocos.push({
      chave: `nota-${secao}-p${i}`,
      node: <NotaParagrafoPrint texto={texto} primeiro={i === 0} />,
    });
  });
  return blocos;
}
