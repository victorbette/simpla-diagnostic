import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadoIF, ResultadoCarteira } from "@/types/estrategiaResultados";
import { SecaoAposentadoria } from "@/components/estrategia/SecaoAposentadoria";
import { GoalBasedInvesting } from "./GoalBasedInvesting";
import React from "react";

const AVAILABLE_TAGS = ["IF", "Aposentadoria", "Aportes", "Previdência", "PGBL"];

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
  onSaveCloud?: (r: ResultadoIF) => Promise<void>;
  triggerSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  storageChave?: string;
  carteira?: ResultadoCarteira | null;
}

export function AcompLF({ plan, comentario, onComentarioChange, tags, onTagsChange, resultadoIF, onResultadoIF, onSaveCloud, triggerSaveRef, storageChave, carteira }: Props) {
  const objetivos = resultadoIF?.objetivos ?? [];

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <SecaoAposentadoria
        plan={plan}
        resultadoIF={resultadoIF}
        onResultadoIF={onResultadoIF}
        onSaveCloud={onSaveCloud}
        triggerSaveRef={triggerSaveRef}
        storageChave={storageChave}
      />

      {/* Goal Based Investing */}
      <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 16, padding: 24 }}>
        <GoalBasedInvesting
          objetivos={objetivos}
          clienteId={plan.clientId}
          carteira={carteira ?? null}
        />
      </div>

      {/* Estratégia e Recomendações */}
      <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 16, padding: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Estratégia e Recomendações
        </p>
        <div style={{ position: "relative" }}>
          <textarea
            value={comentario}
            onChange={(e) => onComentarioChange(e.target.value)}
            placeholder="Ex: Para atingir a liberdade financeira aos 60 anos, o cliente precisa aumentar o aporte mensal de R$ 3.000 para R$ 4.500..."
            style={{
              width: "100%",
              minHeight: 200,
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
          <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>
            {comentario.length} caracteres
          </span>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
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
      </div>
    </div>
  );
}
