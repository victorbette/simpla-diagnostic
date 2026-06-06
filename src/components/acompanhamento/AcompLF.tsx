import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadoIF } from "@/types/estrategiaResultados";
import { SecaoAposentadoria } from "@/components/estrategia/SecaoAposentadoria";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
}

export function AcompLF({ plan, comentario, onComentarioChange, tags, onTagsChange, resultadoIF, onResultadoIF }: Props) {
  return (
    <SecaoAposentadoria
      plan={plan}
      comentario={comentario}
      onComentarioChange={onComentarioChange}
      tags={tags}
      onTagsChange={onTagsChange}
      resultadoIF={resultadoIF}
      onResultadoIF={onResultadoIF}
    />
  );
}
