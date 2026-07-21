import { useState } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
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
  const [lastEdit, setLastEdit] = useState("");

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* FerramentaPGBL inline */}
      <FerramentaPGBL
        plan={plan}
        savedResult={resultadoFiscal ? {
          tipoDeclaracao:         resultadoFiscal.tipoDeclaracao,
          rendaAnual:             resultadoFiscal.rendaAnual,
          tetoPGBLAnual:          resultadoFiscal.tetoPGBLAnual,
          aporteAnual:            resultadoFiscal.aporteAnual,
          irComPGBL:              resultadoFiscal.irComPGBL,
          irSemPGBL:              resultadoFiscal.irSemPGBL,
          economiaAnual:          resultadoFiscal.economiaAnual,
          espacoDisponivelMensal: resultadoFiscal.espacoDisponivelMensal,
          aproveitandoTeto:       resultadoFiscal.aproveitandoTeto,
          inputRendaAnualBruta:   resultadoFiscal.inputRendaAnualBruta,
          inputDespesas:          resultadoFiscal.inputDespesas,
          inputDependentes:       resultadoFiscal.inputDependentes,
          inputAporteAnualPGBL:   resultadoFiscal.inputAporteAnualPGBL,
          inputSaldoPrevidencia:  resultadoFiscal.inputSaldoPrevidencia,
        } : null}
        onSave={(r) => {
          onResultadoFiscal({
            tipoDeclaracao:         r.tipoDeclaracao,
            rendaAnual:             r.rendaAnual,
            tetoPGBLAnual:          r.tetoPGBLAnual,
            aporteAnual:            r.aporteAnual,
            irComPGBL:              r.irComPGBL,
            irSemPGBL:              r.irSemPGBL,
            economiaAnual:          r.economiaAnual,
            espacoDisponivelMensal: r.espacoDisponivelMensal,
            aproveitandoTeto:       r.aproveitandoTeto,
            dataCalculo:            new Date().toISOString(),
            savedAt:                new Date().toISOString(),
            inputRendaAnualBruta:   r.inputRendaAnualBruta,
            inputDespesas:          r.inputDespesas,
            inputDependentes:       r.inputDependentes,
            inputAporteAnualPGBL:   r.inputAporteAnualPGBL,
            inputSaldoPrevidencia:  r.inputSaldoPrevidencia,
          });
        }}
      />

      {/* Card comentário */}
      <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
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
              border: "1px solid #BFDBFE",
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
              color: "#9CA3AF",
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
          <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
          {AVAILABLE_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 999,
                cursor: "pointer",
                border: "1px solid #BFDBFE",
                backgroundColor: tags.includes(t) ? "#2563EB" : "transparent",
                color: tags.includes(t) ? "white" : "#111827",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
            {lastEdit ? `Última edição: ${lastEdit}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
