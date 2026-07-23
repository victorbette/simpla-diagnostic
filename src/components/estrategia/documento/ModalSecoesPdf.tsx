import { useEffect, useState } from "react";
import { AREAS_DOCUMENTO, type SelecaoSecoes } from "@/lib/documentoConfig";
import { DOC } from "@/lib/documentoStyles";

interface Props {
  aberto: boolean;
  selecaoInicial: SelecaoSecoes;
  gerando: boolean;
  onCancelar: () => void;
  onGerar: (selecao: SelecaoSecoes) => void;
}

/**
 * Modal exibido antes de gerar o PDF final: o consultor marca as seções
 * que devem aparecer no documento. O sumário e as divisórias se ajustam
 * automaticamente à seleção.
 */
export function ModalSecoesPdf({ aberto, selecaoInicial, gerando, onCancelar, onGerar }: Props) {
  const [selecao, setSelecao] = useState<SelecaoSecoes>(selecaoInicial);

  // Re-sincroniza com a seleção persistida sempre que o modal abre
  useEffect(() => {
    if (aberto) setSelecao(selecaoInicial);
  }, [aberto, selecaoInicial]);

  if (!aberto) return null;

  const totalMarcadas = AREAS_DOCUMENTO.filter((a) => selecao[a.id]).length;

  return (
    <div
      className="no-print"
      onClick={gerando ? undefined : onCancelar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(12, 29, 66, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seções do PDF final"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 14,
          width: 440,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(12, 29, 66, 0.35)",
          padding: "24px 26px 20px",
          fontFamily: DOC.fonte,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <i className="ti ti-file-settings" style={{ fontSize: 20, color: DOC.blue }} aria-hidden="true" />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DOC.navyInk }}>
            Seções do PDF final
          </h2>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: DOC.muted, lineHeight: 1.6 }}>
          Marque as seções que devem aparecer no documento. O sumário se ajusta
          automaticamente à seleção.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {AREAS_DOCUMENTO.map((area) => {
            const marcada = selecao[area.id];
            return (
              <label
                key={area.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 9,
                  border: `1px solid ${marcada ? DOC.blueBorder : DOC.linha}`,
                  background: marcada ? DOC.blueSoft : "white",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={(e) => setSelecao({ ...selecao, [area.id]: e.target.checked })}
                  style={{ width: 15, height: 15, accentColor: DOC.navy, cursor: "pointer", flexShrink: 0 }}
                />
                <i
                  className={`ti ${area.icone}`}
                  style={{ fontSize: 16, color: marcada ? DOC.blue : DOC.hint, flexShrink: 0 }}
                  aria-hidden="true"
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: marcada ? DOC.ink : DOC.muted }}>
                  {area.label}
                </span>
              </label>
            );
          })}
        </div>

        <p style={{ margin: "0 0 18px", fontSize: 11, color: DOC.hint, lineHeight: 1.5 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
          Capa, sumário, introdução, mãos à obra, disclaimer e contracapa sempre
          fazem parte do documento.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancelar}
            disabled={gerando}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${DOC.linha}`,
              background: "white",
              color: DOC.texto,
              fontSize: 13,
              fontWeight: 500,
              cursor: gerando ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onGerar(selecao)}
            disabled={gerando || totalMarcadas === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: DOC.navy,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: gerando || totalMarcadas === 0 ? "not-allowed" : "pointer",
              opacity: gerando || totalMarcadas === 0 ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {gerando ? (
              <>
                <i className="ti ti-loader-2" style={{ fontSize: 15, animation: "spin 1s linear infinite" }} aria-hidden="true" />
                Salvando...
              </>
            ) : (
              <>
                <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
                Gerar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
