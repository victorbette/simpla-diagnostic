import { PaginaDoc } from "./PaginaDoc";

/** Contracapa — página final escura só com a marca centralizada (referência v4 p.20) */
export function DocContracapa() {
  return (
    <PaginaDoc escura paddingConteudo="0">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <img
          src="/diamond-icon.png"
          alt=""
          aria-hidden="true"
          style={{ height: 34, objectFit: "contain" }}
        />
        <span
          style={{
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "#F3F7FF",
            lineHeight: 1,
            fontFamily: '"Georgia", "Times New Roman", serif',
          }}
        >
          Simpla Invest
        </span>
      </div>
    </PaginaDoc>
  );
}
