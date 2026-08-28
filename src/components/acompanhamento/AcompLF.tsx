import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadoIF } from "@/types/estrategiaResultados";
import { SecaoAposentadoria } from "@/components/estrategia/SecaoAposentadoria";

import React from "react";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
  triggerSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  storageChave?: string;
}

export function AcompLF({ plan, comentario, onComentarioChange, tags, onTagsChange, resultadoIF, onResultadoIF, triggerSaveRef, storageChave }: Props) {
  return (
    <SecaoAposentadoria
      plan={plan}
      comentario={comentario}
      onComentarioChange={onComentarioChange}
      tags={tags}
      onTagsChange={onTagsChange}
      resultadoIF={resultadoIF}
      onResultadoIF={onResultadoIF}
      triggerSaveRef={triggerSaveRef}
      storageChave={storageChave}
    />
  );
}
