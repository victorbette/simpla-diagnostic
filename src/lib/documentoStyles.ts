import type { CSSProperties } from "react";

export const PAGINA: CSSProperties = {
  background: "white",
  width: "100%",
  maxWidth: 794,
  minHeight: 1123,
  margin: "0 auto 32px",
  padding: "64px 72px",
  boxSizing: "border-box",
  position: "relative",
  boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
  borderRadius: 4,
  pageBreakAfter: "always",
};

export const HEADER_PAGINA = (corAccent = "#1E3A8A"): CSSProperties => ({
  borderBottom: `2px solid ${corAccent}`,
  paddingBottom: 16,
  marginBottom: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const TITULO_SECAO: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#1E3A8A",
  letterSpacing: "-0.02em",
  margin: 0,
};

export const TEXTO_CORPO: CSSProperties = {
  fontSize: 13,
  color: "#374151",
  lineHeight: "1.8",
  margin: 0,
};

export const LABEL_METRICA: CSSProperties = {
  fontSize: 10,
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  fontWeight: 500,
  margin: "0 0 4px",
};

export const VALOR_METRICA: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

export const CARD_METRICA: CSSProperties = {
  background: "#F8FAFF",
  border: "0.5px solid #BFDBFE",
  borderRadius: 8,
  padding: "14px 18px",
  boxSizing: "border-box",
};
