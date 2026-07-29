import { DOC } from "@/lib/documentoStyles";

interface Props {
  titulo: string;
  subtitulo: string;
  icone: string;
}

export function ContracapaDiag({ titulo, subtitulo, icone }: Props) {
  return (
    <div style={{
      width: "210mm",
      minHeight: "297mm",
      background: "#1E3A8A",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      pageBreakAfter: "always",
      breakAfter: "page",
      padding: "60px 48px",
      margin: "0 auto 32px",
      boxSizing: "border-box" as const,
      fontFamily: DOC.fonte,
      position: "relative" as const,
      overflow: "hidden",
    }}>
      {/* Facetas decorativas */}
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(28% 0, 100% 0, 100% 62%)", background: "rgba(255,255,255,0.035)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 68%, 34% 100%, 0 100%)", background: "rgba(9,16,38,0.28)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(100% 55%, 100% 100%, 40% 100%)", background: "rgba(96,165,250,0.06)", pointerEvents: "none" }} />

      {/* Conteúdo central */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" as const }}>
        <i
          className={`ti ${icone}`}
          style={{ fontSize: 64, color: "rgba(255,255,255,0.3)", marginBottom: 32, display: "block" }}
        />
        <div style={{
          fontSize: 36, fontWeight: 900, color: "white",
          textAlign: "center" as const, lineHeight: 1.2, marginBottom: 16,
        }}>
          {titulo}
        </div>
        <div style={{
          fontSize: 15, color: "rgba(255,255,255,0.6)",
          textAlign: "center" as const, maxWidth: 400, lineHeight: 1.6,
          margin: "0 auto",
        }}>
          {subtitulo}
        </div>
      </div>
    </div>
  );
}
