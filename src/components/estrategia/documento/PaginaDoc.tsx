import { type CSSProperties, type ReactNode } from "react";
import { DOC } from "@/lib/documentoStyles";

interface Props {
  children: ReactNode;
  /** Rodapé em fluxo (empurrado para o fim da página com margin-top auto) */
  rodape?: ReactNode;
  /** Página escura full-bleed (capa e divisórias de seção) */
  escura?: boolean;
  /** Wedge diagonal cinza decorativo nos cantos (páginas claras) */
  wedge?: boolean;
  /** Marca d'água com o diamante da marca no fundo */
  marcaDagua?: boolean;
  /** Padding customizado do conteúdo (default 14mm 16mm 10mm) */
  paddingConteudo?: string;
}

const FUNDO_ESCURO =
  "linear-gradient(155deg, #13285E 0%, #0F2150 40%, #0C1D42 75%, #0A1838 100%)";

/**
 * Wrapper de página A4 do documento. Layout em flex column com rodapé em
 * fluxo — nada de position:absolute — para conteúdo nunca sobrepor o rodapé.
 */
export function PaginaDoc({
  children,
  rodape,
  escura = false,
  wedge = true,
  marcaDagua = false,
  paddingConteudo = "14mm 16mm 10mm",
}: Props) {
  const base: CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    margin: "0 auto 32px",
    background: escura ? FUNDO_ESCURO : "white",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    fontFamily: DOC.fonte,
    pageBreakAfter: "always",
    breakAfter: "page",
  };

  return (
    <div className="doc-pagina" style={base}>
      {/* Decoração de fundo */}
      {escura ? <FormasEscuras /> : wedge && <WedgesClaros />}
      {marcaDagua && (
        <img
          src="/diamond-icon.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "-18mm",
            bottom: "-8mm",
            width: "95mm",
            opacity: 0.045,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Conteúdo */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: paddingConteudo,
          boxSizing: "border-box",
        }}
      >
        {children}
        {rodape && <div style={{ marginTop: "auto", paddingTop: 18 }}>{rodape}</div>}
      </div>
    </div>
  );
}

/** Wedges diagonais cinza-claro dos cantos (padrão da referência) */
function WedgesClaros() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "62mm",
          height: "34mm",
          background: "linear-gradient(205deg, #EEF2F7 0%, #F5F8FB 60%)",
          clipPath: "polygon(28% 0, 100% 0, 100% 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "120mm",
          height: "150mm",
          background: "linear-gradient(325deg, #EEF2F7 0%, #F7FAFC 55%, #FBFCFE 100%)",
          clipPath: "polygon(100% 12%, 100% 100%, 0 100%)",
          pointerEvents: "none",
          opacity: 0.85,
        }}
      />
    </>
  );
}

/** Facetas geométricas translúcidas do fundo navy (capa/divisórias) */
function FormasEscuras() {
  const facet = (estilo: CSSProperties, clip: string): CSSProperties => ({
    position: "absolute",
    inset: 0,
    clipPath: clip,
    pointerEvents: "none",
    ...estilo,
  });
  return (
    <>
      <div style={facet({ background: "rgba(255,255,255,0.035)" }, "polygon(28% 0, 100% 0, 100% 62%)")} />
      <div style={facet({ background: "rgba(9,16,38,0.35)" }, "polygon(0 18%, 42% 0, 0 62%)")} />
      <div style={facet({ background: "rgba(96,165,250,0.06)" }, "polygon(100% 55%, 100% 100%, 40% 100%)")} />
      <div style={facet({ background: "rgba(9,16,38,0.28)" }, "polygon(0 68%, 34% 100%, 0 100%)")} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "18%",
          width: 1.5,
          height: "58%",
          background: "linear-gradient(180deg, rgba(147,197,253,0.18), rgba(147,197,253,0))",
          transform: "rotate(38deg)",
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </>
  );
}
