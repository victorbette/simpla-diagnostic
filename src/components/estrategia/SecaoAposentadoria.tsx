import React from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaLiberdadeFinanceira } from "@/components/ferramentas/FerramentaLiberdadeFinanceira";
import { calcularPatrimonioNecessario } from "@/lib/financialFreedomCalc";
import type { ResultadoIF } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
  onSaveCloud?: (r: ResultadoIF) => Promise<void>;
  triggerSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  storageChave?: string;
}

export function SecaoAposentadoria({
  plan,
  resultadoIF,
  onResultadoIF,
  onSaveCloud,
  triggerSaveRef,
  storageChave,
}: Props) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <FerramentaLiberdadeFinanceira
        clientId={plan.clientId}
        planejamentoIF={plan.planejamentoIF}
        dataNascimento={plan.dadosCliente.dataNascimento}
        dadosCliente={plan.dadosCliente}
        resultadoIF={resultadoIF}
        triggerSaveRef={triggerSaveRef}
        storageChave={storageChave}
        onSave={async (params, objetivos, result, taxaTravadaInfo, display) => {
          const rendaSustentavelDisplay = (display.projecaoComAporteAtual * 0.04) / 12;
          const r: ResultadoIF = {
            patrimonioAposentadoria: display.projecaoComAporteAtual,
            rendaSustentavel: rendaSustentavelDisplay,
            gapRenda: params.rendaMensalDesejada - rendaSustentavelDisplay,
            liberdadeAlcancada: rendaSustentavelDisplay >= params.rendaMensalDesejada,
            aporteAjustado: display.aporteNecessario,
            patrimonioNecessario: params.rendaMensalDesejada > 0
              ? calcularPatrimonioNecessario(params.rendaMensalDesejada, params.idadeMeta)
              : result.patrimonioNecessario,
            patrimonioAtual: params.patrimonioInicial,
            idadeAtual: params.idadeAtual,
            idadeMeta: params.idadeMeta,
            anosRestantes: Math.max(0, params.idadeMeta - params.idadeAtual),
            rendaMensalDesejada: params.rendaMensalDesejada,
            aporteAtual: params.aporteMensal,
            taxaRetorno: params.taxaRetornoAnual,
            projecao: display.dadosGrafico,
            curvaIdeal: result.curvaIdeal,
            objetivos,
            anoNascimento: params.anoNascimento,
            mesNascimento: params.mesNascimento,
            mesInicioRetirada: result.mesInicioRetirada,
            taxaTravada: taxaTravadaInfo.taxaTravada,
            taxaTravadaValor: taxaTravadaInfo.taxaTravadaValor,
            ajustes: display.ajustes,
            dataCalculo: new Date().toISOString(),
            savedAt: new Date().toISOString(),
          };
          onResultadoIF(r);
          await onSaveCloud?.(r);
        }}
      />
    </div>
  );
}
