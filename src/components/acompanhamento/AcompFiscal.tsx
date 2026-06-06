import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadoFiscal } from "@/types/estrategiaResultados";
import { SecaoFiscal } from "@/components/estrategia/SecaoFiscal";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoFiscal: ResultadoFiscal | null;
  onResultadoFiscal: (r: ResultadoFiscal) => void;
}

export function AcompFiscal({ plan, comentario, onComentarioChange, tags, onTagsChange, resultadoFiscal, onResultadoFiscal }: Props) {
  return (
    <SecaoFiscal
      plan={plan}
      comentario={comentario}
      onComentarioChange={onComentarioChange}
      tags={tags}
      onTagsChange={onTagsChange}
      resultadoFiscal={resultadoFiscal}
      onResultadoFiscal={onResultadoFiscal}
    />
  );
}
