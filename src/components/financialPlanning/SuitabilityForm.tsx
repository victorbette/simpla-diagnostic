import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUITABILITY_PERGUNTAS,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
  calcularPerfil,
} from "@/types/financialPlanning";
import type { SuitabilityResposta, SuitabilityResult } from "@/types/financialPlanning";
import { formatNumber } from "@/lib/format";

interface SuitabilityFormProps {
  onComplete: (result: SuitabilityResult) => void;
  onCancel: () => void;
}

const PROFILE_COLORS: Record<string, string> = {
  conservador: "bg-[#D5E4EE] text-blue-800 border-[#1E40AF]",
  conservador_moderado: "bg-teal-100 text-teal-800 border-[#3B82F6]",
  moderado: "bg-[#DBEAFE] text-[#1E40AF] border-[#3B82F6]",
  arrojado: "bg-rose-100 text-rose-800 border-rose-300",
};

const ASSET_LABELS: Record<string, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "Renda Variável Global",
  rfGlobal: "Renda Fixa Global",
  cripto: "Cripto",
};

const MAX_PONTOS = SUITABILITY_PERGUNTAS.length * 5; // 35

export function SuitabilityForm({ onComplete, onCancel }: SuitabilityFormProps) {
  const [step, setStep] = useState(0);
  const [respostas, setRespostas] = useState<Map<string, SuitabilityResposta>>(new Map());
  const [result, setResult] = useState<SuitabilityResult | null>(null);

  const total = SUITABILITY_PERGUNTAS.length;
  const pergunta = SUITABILITY_PERGUNTAS[step];
  const respostaSelecionada = respostas.get(pergunta?.id ?? "");
  const isLast = step === total - 1;

  function selectOption(valor: number) {
    setRespostas((prev) => {
      const next = new Map(prev);
      next.set(pergunta.id, { perguntaId: pergunta.id, valor });
      return next;
    });
  }

  function handleNext() {
    if (!respostaSelecionada) return;
    if (isLast) {
      const allRespostas = Array.from(respostas.values());
      const calc = calcularPerfil(allRespostas);
      setResult(calc);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
    else onCancel();
  }

  if (result) {
    const alvo = ALOCACAO_ALVO[result.perfil];
    const colorClass = PROFILE_COLORS[result.perfil] ?? "bg-muted";
    const alvoEntries = Object.entries(alvo) as [string, number][];
    const totalAlvo = alvoEntries.reduce((s, [, v]) => s + v, 0);

    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className="mb-2 text-sm font-medium text-muted-foreground">
            Resultado do questionário
          </div>
          <div
            className={cn(
              "mx-auto mb-3 inline-block rounded-2xl border px-8 py-4 text-3xl font-bold",
              colorClass
            )}
          >
            {PERFIL_LABELS[result.perfil]}
          </div>
          <p className="text-sm text-muted-foreground">
            {result.totalPontos} de {MAX_PONTOS} pontos (
            {formatNumber(result.percentual, 0)}%)
          </p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Macroalocação sugerida para este perfil
            </p>
            <div className="space-y-3">
              {alvoEntries.map(([key, pct]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 text-sm text-muted-foreground">
                    {ASSET_LABELS[key] ?? key}
                  </span>
                  <div className="flex-1">
                    <Progress value={pct} className="h-2" />
                  </div>
                  <span className="w-12 text-right text-sm font-medium tabular-nums">
                    {pct}%
                  </span>
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center gap-3 border-t pt-2">
                <span className="w-44 shrink-0 text-sm font-semibold">Total</span>
                <div className="flex-1" />
                <span className="w-12 text-right text-sm font-semibold tabular-nums">
                  {formatNumber(totalAlvo, 0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setResult(null)}>
            Refazer questionário
          </Button>
          <Button onClick={() => onComplete(result)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar perfil e continuar
          </Button>
        </div>
      </div>
    );
  }

  const progressPct = ((step + 1) / total) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Pergunta {step + 1} de {total}
          </span>
          <Badge variant="secondary">{formatNumber(progressPct, 0)}%</Badge>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <h2 className="text-xl font-semibold leading-snug">{pergunta.pergunta}</h2>

      <div className="grid gap-3">
        {pergunta.opcoes.map((opcao) => {
          const selected = respostaSelecionada?.valor === opcao.valor;
          return (
            <button
              key={opcao.valor}
              onClick={() => selectOption(opcao.valor)}
              className={cn(
                "w-full rounded-xl border-2 px-5 py-4 text-left text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {opcao.texto}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {step === 0 ? "Cancelar" : "Anterior"}
        </Button>
        <Button
          size="sm"
          disabled={!respostaSelecionada}
          onClick={handleNext}
        >
          {isLast ? "Ver resultado" : "Próxima"}
          {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
