import type { CSSProperties } from "react";

export const HEADER_PAGINA: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 16,
  borderBottom: "2px solid #1E3A8A",
  marginBottom: 32,
};

export const CARD_METRICA: CSSProperties = {
  background: "#F8FAFF",
  border: "0.5px solid #BFDBFE",
  borderRadius: 10,
  padding: "16px 20px",
};

export const LABEL_METRICA: CSSProperties = {
  margin: "0 0 6px",
  fontSize: 10,
  color: "#6B7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

export const VALOR_METRICA: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
};
