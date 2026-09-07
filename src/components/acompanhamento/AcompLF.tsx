import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadoIF, ResultadoCarteira } from "@/types/estrategiaResultados";
import { SecaoAposentadoria } from "@/components/estrategia/SecaoAposentadoria";
import { GoalBasedInvesting } from "./GoalBasedInvesting";
import React from "react";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <SecaoAposentadoria
        plan={plan}
        comentario={comentario}
        onComentarioChange={onComentarioChange}
        tags={tags}
        onTagsChange={onTagsChange}
        resultadoIF={resultadoIF}
        onResultadoIF={onResultadoIF}
        onSaveCloud={onSaveCloud}
        triggerSaveRef={triggerSaveRef}
        storageChave={storageChave}
      />

      {/* Goal Based Investing — sempre visível na aba LF */}
      <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 16, padding: 24 }}>
        <GoalBasedInvesting
          objetivos={objetivos}
          clienteId={plan.clientId}
          carteira={carteira ?? null}
        />
      </div>
    </div>
  );
}
