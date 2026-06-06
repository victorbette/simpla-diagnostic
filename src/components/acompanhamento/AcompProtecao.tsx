import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadoSeguro } from "@/types/estrategiaResultados";
import { SecaoProtecaoSucessorio } from "@/components/estrategia/SecaoProtecaoSucessorio";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoSeguro: ResultadoSeguro | null;
  onResultadoSeguro: (r: ResultadoSeguro) => void;
}

export function AcompProtecao({ plan, comentario, onComentarioChange, tags, onTagsChange, resultadoSeguro, onResultadoSeguro }: Props) {
  return (
    <SecaoProtecaoSucessorio
      plan={plan}
      comentario={comentario}
      onComentarioChange={onComentarioChange}
      tags={tags}
      onTagsChange={onTagsChange}
      resultadoSeguro={resultadoSeguro}
      onResultadoSeguro={onResultadoSeguro}
    />
  );
}
