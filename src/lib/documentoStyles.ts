import type { CSSProperties } from "react";

/* ── Tokens visuais do documento impresso ──────────────────────
 * Identidade única (navy + azul) com acentos semânticos apenas
 * para dados (positivo/negativo/atenção) — nunca por seção.
 */
export const DOC = {
  navy:       "#1E3A8A",
  navyInk:    "#16295C",
  navyDeep:   "#0C1D42",
  blue:       "#2563EB",
  blueLight:  "#60A5FA",
  blueSoft:   "#EFF6FF",
  blueBorder: "#BFDBFE",
  ink:        "#111827",
  texto:      "#374151",
  muted:      "#6B7280",
  hint:       "#9CA3AF",
  linha:      "#E5E7EB",
  linhaSoft:  "#F3F4F6",
  verde:      "#15803D",
  verdeBg:    "#DCFCE7",
  vermelho:   "#B91C1C",
  vermelhoBg: "#FEE2E2",
  ambar:      "#B45309",
  ambarBg:    "#FEF3C7",
  fonte:      '"Poppins", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
} as const;

/* Título da página de conteúdo (usado pelo HeaderSecao) */
export const TITULO_SECAO: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: DOC.navyInk,
  letterSpacing: "-0.01em",
  margin: 0,
  lineHeight: 1.2,
};

export const TEXTO_CORPO: CSSProperties = {
  fontSize: 12.5,
  color: DOC.texto,
  lineHeight: 1.75,
  margin: 0,
};

/* Label uppercase pequena de card/métrica */
export const LABEL_CARD: CSSProperties = {
  fontSize: 9.5,
  color: DOC.hint,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 600,
  margin: "0 0 6px",
};

export const VALOR_CARD: CSSProperties = {
  fontSize: 19,
  fontWeight: 700,
  color: DOC.ink,
  margin: 0,
  letterSpacing: "-0.01em",
  lineHeight: 1.25,
};

export const CARD: CSSProperties = {
  background: "white",
  border: `1px solid ${DOC.linha}`,
  borderRadius: 10,
  padding: "14px 18px",
  boxSizing: "border-box",
};

/* Label de subseção (ex.: PROTEÇÃO, AÇÕES IMEDIATAS) */
export const LABEL_SUBSECAO = (cor: string = DOC.navy): CSSProperties => ({
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: cor,
  margin: "0 0 10px",
});

/* ── Backward-compat shims (componentes legados) ──────────────────────────── */

export const PAGINA: CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  margin: "0 auto 32px",
  background: "white",
  position: "relative",
  overflow: "hidden",
  boxSizing: "border-box",
  padding: "40px 44px",
  display: "flex",
  flexDirection: "column",
  fontFamily: DOC.fonte,
  pageBreakAfter: "always",
  breakAfter: "page",
};

export const HEADER_PAGINA = (borderColor: string = DOC.linha): CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 16,
  marginBottom: 24,
  borderBottom: `2px solid ${borderColor}`,
});

export const LABEL_METRICA: CSSProperties = LABEL_CARD;

export const CARD_METRICA: CSSProperties = CARD;
