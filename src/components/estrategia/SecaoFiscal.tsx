import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularFiscal } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaPGBL } from "@/components/ferramentas/FerramentaPGBL";
import type { ResultadoFiscal } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoFiscal: ResultadoFiscal | null;
  onResultadoFiscal: (r: ResultadoFiscal) => void;
}

const AVAILABLE_TAGS = ["PGBL", "VGBL", "IR", "Dedução", "Previdência"];

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export function SecaoFiscal({
  plan,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoFiscal,
  onResultadoFiscal,
}: Props) {
  const [pgblModal, setPgblModal] = useState(false);
  const [lastEdit, setLastEdit] = useState("");

  const r = calcularFiscal(plan.fiscal);

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  }

  // ── Tool result state ──────────────────────────────────────────────────────
  const toolResult = resultadoFiscal ? (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#000000",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Planejamento Fiscal — PGBL
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              color: "#6B6347",
              backgroundColor: "#F5F3EE",
              border: "1px solid #E2DCC8",
              borderRadius: 999,
              padding: "2px 10px",
            }}
          >
            {new Date(resultadoFiscal.dataCalculo).toLocaleDateString("pt-BR")}
          </span>
          <button
            onClick={() => setPgblModal(true)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#8A7A45",
              backgroundColor: "transparent",
              border: "1px solid #8A7A45",
              borderRadius: 6,
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            Abrir calculadora →
          </button>
        </div>
      </div>

      {/* Economy highlight */}
      <div
        style={{
          marginTop: 16,
          backgroundColor: "#F5F0E0",
          border: "1px solid #D4C08A",
          borderRadius: 8,
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "#6B6347",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 4px",
          }}
        >
          Economia fiscal anual
        </p>
        <p
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#3D6B41",
            margin: 0,
          }}
        >
          {formatCurrency(resultadoFiscal.economiaAnual)}
        </p>
        <div style={{ marginTop: 8 }}>
          {resultadoFiscal.aproveitandoTeto ? (
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 600,
                color: "#3D6B41",
                backgroundColor: "#EBF2EC",
                border: "1px solid #A7C9AB",
                borderRadius: 999,
                padding: "3px 12px",
              }}
            >
              ✓ Teto PGBL aproveitado
            </span>
          ) : (
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 600,
                color: "#8A7A45",
                backgroundColor: "#FEF9EC",
                border: "1px solid #D4C08A",
                borderRadius: 999,
                padding: "3px 12px",
              }}
            >
              Espaço disponível
            </span>
          )}
        </div>
      </div>

      {/* 3 metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginTop: 16,
        }}
      >
        {[
          {
            label: "IR sem PGBL",
            value: `${formatCurrency(resultadoFiscal.irSemPGBL)}/ano`,
            color: "#7A3535",
          },
          {
            label: "IR com PGBL",
            value: `${formatCurrency(resultadoFiscal.irComPGBL)}/ano`,
            color: "#3D6B41",
          },
          {
            label: "Espaço mensal",
            value: `${formatCurrency(resultadoFiscal.espacoDisponivelMensal)}/mês`,
            color: "#8A7A45",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              backgroundColor: "#F5F3EE",
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "#6B6347",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: "0 0 4px",
              }}
            >
              {label}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Comparison bars */}
      <div style={{ marginTop: 16 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#000000",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            margin: "0 0 10px",
          }}
        >
          Comparação
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              label: "IR sem PGBL",
              value: resultadoFiscal.irSemPGBL,
              color: "#7A3535",
              widthPct: 100,
            },
            {
              label: "IR com PGBL",
              value: resultadoFiscal.irComPGBL,
              color: "#3D6B41",
              widthPct:
                resultadoFiscal.irSemPGBL > 0
                  ? Math.min(100, (resultadoFiscal.irComPGBL / resultadoFiscal.irSemPGBL) * 100)
                  : 0,
            },
            {
              label: "Economia",
              value: resultadoFiscal.economiaAnual,
              color: "#BBA866",
              widthPct:
                resultadoFiscal.irSemPGBL > 0
                  ? Math.min(100, (resultadoFiscal.economiaAnual / resultadoFiscal.irSemPGBL) * 100)
                  : 0,
            },
          ].map(({ label, value, color, widthPct }) => (
            <div key={label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#6B6347" }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{formatCurrency(value)}</span>
              </div>
              <div
                style={{
                  height: 6,
                  backgroundColor: "#F5F3EE",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation badge */}
      <div style={{ marginTop: 16 }}>
        {resultadoFiscal.aproveitandoTeto || resultadoFiscal.espacoDisponivelMensal <= 0 ? (
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              color: "#3D6B41",
              backgroundColor: "#EBF2EC",
              border: "1px solid #A7C9AB",
              borderRadius: 6,
              padding: "6px 14px",
            }}
          >
            ✓ Teto PGBL atingido
          </span>
        ) : (
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              color: "#8A7A45",
              backgroundColor: "#F5F0E0",
              border: "1px solid #D4C08A",
              borderRadius: 6,
              padding: "6px 14px",
            }}
          >
            PGBL com espaço disponível:{" "}
            {formatCurrency(resultadoFiscal.espacoDisponivelMensal)}/mês
          </span>
        )}
      </div>
    </>
  ) : null;

  // ── Empty state ────────────────────────────────────────────────────────────
  const emptyState = (
    <div
      style={{
        backgroundColor: "#F5F3EE",
        borderRadius: 8,
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 14, color: "#6B6347", margin: "0 0 8px" }}>
        Calculadora PGBL não executada
      </p>
      <p style={{ fontSize: 13, color: "#3D6B41", fontWeight: 600, margin: 0 }}>
        Economia potencial: {formatCurrency(r.economiaFiscalPotencial)}/ano
      </p>
      <button
        onClick={() => setPgblModal(true)}
        style={{
          marginTop: 12,
          fontSize: 13,
          fontWeight: 600,
          color: "white",
          backgroundColor: "#8A7A45",
          border: "none",
          borderRadius: 6,
          padding: "9px 20px",
          cursor: "pointer",
        }}
      >
        Abrir calculadora PGBL →
      </button>
    </div>
  );

  return (
    <>
      <div
        style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Card 1 — PGBL tool */}
        <div style={{ ...CARD, borderTop: "3px solid #8A7A45" }}>
          {resultadoFiscal ? toolResult : emptyState}
        </div>

        {/* Card 2 — Comment */}
        <div style={{ ...CARD, borderTop: "3px solid #000000" }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#000000",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Estratégia e Recomendações
          </p>

          <div style={{ position: "relative" }}>
            <textarea
              value={comentario}
              onChange={(e) => handleComentario(e.target.value)}
              placeholder="Ex: Ao maximizar o aporte no PGBL até o teto de 12% da renda bruta, o cliente economizará R$ 8.400/ano em IR..."
              style={{
                width: "100%",
                minHeight: 180,
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #E2DCC8",
                fontSize: 13,
                color: "#000000",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: 8,
                right: 10,
                fontSize: 11,
                color: "#9E9070",
              }}
            >
              {comentario.length} caracteres
            </span>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#6B6347", marginRight: 4 }}>Tags:</span>
            {AVAILABLE_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: "1px solid #E2DCC8",
                  backgroundColor: tags.includes(t) ? "#000000" : "transparent",
                  color: tags.includes(t) ? "white" : "#3D3520",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#9E9070" }}>
              {lastEdit ? `Última edição: ${lastEdit}` : ""}
            </span>
          </div>
        </div>
      </div>

      <FerramentaModal
        open={pgblModal}
        onClose={() => setPgblModal(false)}
        title="Calculadora PGBL Completa"
      >
        <FerramentaPGBL
          fiscal={plan.fiscal}
          onSave={(result) => {
            onResultadoFiscal({
              rendaAnual: result.rendaAnual,
              tetoPGBLAnual: result.tetoPGBLAnual,
              aporteAnual: result.aporteAnual,
              irComPGBL: result.irComPGBL,
              irSemPGBL: result.irSemPGBL,
              economiaAnual: result.economiaAnual,
              espacoDisponivelMensal: result.espacoDisponivelMensal,
              aproveitandoTeto: result.aproveitandoTeto,
              dataCalculo: new Date().toISOString(),
              savedAt: new Date().toISOString(),
            });
            setPgblModal(false);
          }}
        />
      </FerramentaModal>
    </>
  );
}
